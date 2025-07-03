use crossbeam::queue::SegQueue;
use log::{error, info};
use m3u8_rs::{MediaPlaylist, Playlist};
use moka::sync::Cache;
use serde_json::json;
use std::{
    fs::create_dir_all,
    net::TcpStream,
    path::{Path, PathBuf},
    process::Command,
    sync::{
        atomic::{AtomicI32, Ordering},
        Arc,
    },
    thread,
    time::Duration,
};
use tauri::http::StatusCode;
use tauri_plugin_http::reqwest;
use tokio::io::AsyncBufReadExt;
use tokio::{
    fs::{remove_dir_all, remove_file, File, OpenOptions},
    io::{AsyncWriteExt, BufReader, BufWriter},
    sync::{mpsc, Semaphore},
    time,
};
use tungstenite::WebSocket;

use crate::{orm::download_info::{service::update_download_by_id, types::DownloadInfoUpdate}, utils};

use super::{
    file_download::DownloadTaskInfo,
    m3u8_encrypt_key::{KeyType, M3u8EncryptKey},
    types::{
        parse_operation_name, DownloadInfoContext, DownloadInfoDetail, DownloadInfoQueueDetail,
        DownloadInfoResponse, DownloadOperation, DownloadSourceInfo,
    },
    util::download_request,
};

pub struct M3u8Download {
    pub download_info_context: DownloadInfoContext,
    pub cache: Cache<String, i32>,
    pub uq_key: String,
}

impl M3u8Download {
    pub fn new(download_info: &mut DownloadTaskInfo) -> Result<Self, Box<dyn std::error::Error>> {
        let download_info_context = DownloadInfoContext::new(download_info)?;
        Ok(M3u8Download {
            download_info_context: download_info_context.clone(),
            cache: Cache::builder()
                .max_capacity(1024)
                .time_to_live(Duration::from_secs(1 * 60 * 60))
                .build(),
            uq_key: format!(
                "{}_{}",
                download_info_context.url.as_str(),
                download_info_context.movie_name.clone()
            ),
        })
    }

    pub async fn start_download(&mut self, socket: &mut WebSocket<TcpStream>) {
        let mut result;

        let mut operation = parse_operation_name(&self.download_info_context.status[..]);

        loop {
            match operation {
                DownloadOperation::ParseSource => {
                    result = parse_source(&mut self.download_info_context).await;
                }
                DownloadOperation::DownloadSlice => {
                    result = download_slice(&mut self.download_info_context, socket).await;
                }
                DownloadOperation::CheckSource => {
                    result = check_source(&mut self.download_info_context).await;
                }
                DownloadOperation::Merger => {
                    result = merger(&mut self.download_info_context).await;
                }
                DownloadOperation::UnsupportedOperation => {
                    result = Err(Box::from("不支持的操作"));
                }
                DownloadOperation::DownloadEnd => break,
            }
            let mut out_limit_num = false;
            // 程序报错直接修改任务状态为失败
            let rs_sucess = result.is_ok();
            if rs_sucess {
                let rl = result.unwrap();
                let r = serde_json::to_string(&rl).unwrap();
                let m = socket.send(tungstenite::Message::text(r));
                if m.is_err() {
                    info!("发送消息失败");
                }
                operation = parse_operation_name(&rl.status[..]);
                if operation == DownloadOperation::DownloadSlice {
                    let entry = self.cache.entry(self.uq_key.clone()).or_insert(0);
                    let x = entry.value() + 1;
                    self.cache.insert(self.uq_key.clone(), x);
                    if x > 5 {
                        info!("下载影片：{}, 超过重试阈值", self.uq_key.clone());
                        out_limit_num = true;
                    }
                }
            } else {
                error!("下载m3u8失败，失败原因:{}", result.unwrap_err());
            }
            if !rs_sucess || out_limit_num {
                let download_info_update = DownloadInfoUpdate {
                    id: self.download_info_context.id.clone(),
                    status: Some(self.download_info_context.status.clone()),
                    download_status: Some("downloadFail".to_string()),
                    ..Default::default()
                };
                let _ = update_download_by_id(download_info_update);
                let m = socket.send(tungstenite::Message::text(
                    serde_json::to_string(&json!({
                        "id": self.download_info_context.id,
                        "status": self.download_info_context.status,
                        "download_status": "downloadFail",
                        "mes_type": "end"
                    }))
                    .unwrap(),
                ));
                if m.is_err() {
                    info!("发送消息失败");
                }
                break;
            }
        }
    }
}

async fn parse_source(
    download_info_context: &mut DownloadInfoContext,
) -> anyhow::Result<DownloadInfoResponse, Box<dyn std::error::Error>> {
    let media_play_list = parse_m3u8(download_info_context).await?;
    let count = media_play_list.segments.len();
    let mut download_source_info = DownloadSourceInfo::new();
    download_source_info.id = download_info_context.id.clone();

    create_dir_all(&download_info_context.ts_path)?;

    let index = &download_info_context.index_path;
    let index_file = utils::async_create_file(index).await?;

    let mut download_list: Vec<DownloadInfoDetail> = Vec::new();

    let mut index_file = BufWriter::new(index_file);
    for (i, segment) in media_play_list.segments.iter().enumerate() {
        let file_name = download_info_context
            .ts_path
            .join(Path::new(&segment.uri).file_name().unwrap());
        let file_name_str = utils::get_path_name(&file_name);
        let json_success_path = &download_info_context.json_success_path;
        if utils::exists(&PathBuf::from(json_success_path)) {
            let success_v = &std::fs::read_to_string(json_success_path).unwrap();
            if success_v.contains(&file_name_str) {
                continue;
            }
        }
        let base_download_url = &download_info_context.url;
        if let Some(k) = &segment.key {
            download_source_info.m3u8_encrypt_key =
                M3u8EncryptKey::from_key(base_download_url, k).await?;
        }
        let s = format!("{} {} {}", "file", file_name_str, "\n");
        index_file.write(s.as_bytes()).await?;
        let url = base_download_url.join(&segment.uri).unwrap();
        download_list.push(DownloadInfoDetail {
            id: i,
            url,
            file_name: file_name.into_os_string().into_string().unwrap(),
            data: None,
            success: false,
        });
    }
    download_source_info.download_info_list = download_list;
    let v = serde_json::to_string_pretty(&download_source_info)?;
    let mut json_file = OpenOptions::new()
        .write(true)
        .truncate(true)
        .create(true)
        .open(&download_info_context.json_path)
        .await?;
    json_file.write_all(v.as_bytes()).await?;

    let download_info_update = DownloadInfoUpdate {
        id: download_info_context.id.clone(),
        status: Some("downloadSlice".to_string()),
        count: Some(count as i32),
        download_status: Some("downloading".to_string()),
        ..Default::default()
    };
    let _ = update_download_by_id(download_info_update);
    Ok(DownloadInfoResponse {
        id: download_info_context.id.clone(),
        status: "downloadSlice".to_string(),
        download_count: None,
        count: Some(count),
        download_status: Some("downloading".to_string()),
        mes_type: "parseSourceEnd".to_string(),
    })
}

async fn parse_m3u8(
    download_info_context: &mut DownloadInfoContext,
) -> anyhow::Result<MediaPlaylist, Box<dyn std::error::Error>> {
    let content = download_request(&download_info_context.url).await?;

    match m3u8_rs::parse_playlist_res(&content) {
        Ok(Playlist::MasterPlaylist(master)) => {
            let stream = master
                .variants
                .get(0)
                .ok_or("请选定一个有效的媒体播放编号")?;

            download_info_context.url = download_info_context.url.join(&stream.uri)?;

            let content1 = &download_request(&download_info_context.url).await?;

            match m3u8_rs::parse_playlist_res(&content1) {
                Ok(Playlist::MasterPlaylist(_)) => {
                    return Err(Box::from("媒体资源错误"));
                }
                Ok(Playlist::MediaPlaylist(media_list)) => return Ok(media_list),
                Err(_) => {
                    return Err(Box::from("媒体播放列表未找到"));
                }
            }
        }
        Ok(Playlist::MediaPlaylist(media_list)) => return Ok(media_list),
        Err(_) => {
            return Err(Box::from("媒体播放列表未找到"));
        }
    }
}

async fn download_slice(
    download_info_context: &mut DownloadInfoContext,
    socket: &mut WebSocket<TcpStream>,
) -> anyhow::Result<DownloadInfoResponse, Box<dyn std::error::Error>> {
    let download_count = Arc::new(AtomicI32::new(download_info_context.download_count));
    let v = std::fs::read_to_string(&download_info_context.json_path)?;
    let mut download_source_info = serde_json::from_str::<DownloadSourceInfo>(&v)?;
    let queue = &read_data_to_queue(
        &download_source_info,
        &download_info_context.json_success_path,
    );

    let (tx, mut rx): (
        mpsc::Sender<DownloadInfoDetail>,
        mpsc::Receiver<DownloadInfoDetail>,
    ) = mpsc::channel(100);

    // 创建进度发送 channel
    let (progress_tx, mut progress_rx): (
        mpsc::Sender<i32>,
        mpsc::Receiver<i32>,
    ) = mpsc::channel(10);

    // 创建进度发送定时器
    let download_count_clone = download_count.clone();
    let progress_tx_clone = progress_tx.clone();
    let progress_task = tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(1));
        loop {
            interval.tick().await;
            let current_count = download_count_clone.load(Ordering::Relaxed);
            let _ = progress_tx_clone.send(current_count).await;
        }
    });

    loop {
        let queue_data = queue.pop();
        if queue_data.is_none() {
            break;
        }
        let detail = queue_data.unwrap();
        let semaphore = Arc::new(Semaphore::new(6));
        let tx1 = tx.clone();
        tokio::spawn(async move {
            #[allow(unused_variables)]
            let p = &semaphore.acquire().await;
            let resp_data = reqwest::get(detail.url.as_str()).await;
            let mut data = Vec::new();
            let mut success = true;
            match resp_data {
                Ok(rp) => {
                    if rp.status() == StatusCode::OK {
                        data = rp.bytes().await.unwrap_or("".into()).to_vec();

                        if data.is_empty() {
                            success = false;
                        } else {
                            if !matches!(&detail.m3u8_encrypt_key.ty, KeyType::None) {
                                match detail.m3u8_encrypt_key.decode(&mut data) {
                                    Ok(Some(data1)) => {
                                        data = data1;
                                    }
                                    Ok(_none) => success = false,
                                    Err(_) => success = false,
                                };
                            }
                        }
                    } else {
                        success = false;
                    }
                }
                Err(_e) => {
                    success = false;
                }
            }

            tx1.send(DownloadInfoDetail {
                id: detail.id.to_owned(),
                url: detail.url.clone(),
                file_name: detail.file_name.to_owned(),
                data: Some(data),
                success,
            })
            .await
            .unwrap();
        });
        if queue.is_empty() {
            break;
        }
    }

    drop(tx);

    (&mut download_source_info.download_info_list).clear();
    let mut json_success_file = OpenOptions::new()
        .append(true)
        .open(&download_info_context.json_success_path)
        .await?;

    // 创建集合对象存储成功下载的文件名
    let mut success_files: Vec<String> = Vec::new();

    // 使用 tokio::select! 来同时处理文件下载和进度发送
    loop {
        tokio::select! {
            // 处理文件下载结果
            res = rx.recv() => {
                match res {
                    Some(mut res) => {
                        if res.success {
                            let file_name = res.file_name.clone();
                            let rs = downloaded_file_save(res.clone()).await;
                            if rs.is_ok() {
                                let _ = download_count.fetch_add(1, Ordering::Relaxed);
                                // 将成功下载的文件名放入集合对象中
                                success_files.push(file_name);
                            } else {
                                res.data = None;
                                download_source_info.download_info_list.push(res);
                            }
                        } else {
                            download_source_info.download_info_list.push(res);
                        }
                    }
                    _none => break, // 所有文件下载完成
                }
            }
            // 处理定时进度发送
            progress_count = progress_rx.recv() => {
                if let Some(count) = progress_count {
                    // 在这里记录成功下载的文件到文件中
                    if !success_files.is_empty() {
                        let batch_content = success_files
                            .iter()
                            .map(|name| format!("{}\r\n", name))
                            .collect::<String>();
                        let _ = json_success_file.write(batch_content.as_bytes()).await?;
                        success_files.clear(); // 清空已处理的文件名
                    }

                    let download_info_update = DownloadInfoUpdate {
                        id: download_info_context.id.clone(),
                        download_count: Some(count),
                        ..Default::default()
                    };
                    let _ = update_download_by_id(download_info_update);
                    let _ = socket.send(tungstenite::Message::text(serde_json::to_string(&json!({
                        "id": download_info_context.id,
                        "download_count": count,
                        "mes_type": "progress",
                    }))?));
                }
            }
        }
    }

    // 停止进度发送任务
    progress_task.abort();
    drop(progress_tx);

    let v = serde_json::to_string_pretty(&download_source_info)?;
    let mut json_file = OpenOptions::new()
        .write(true)
        .truncate(true)
        .open(&download_info_context.json_path)
        .await?;
    json_file.write_all(v.as_bytes()).await?;
    download_info_context.download_count = download_count.load(Ordering::Relaxed);

    let download_info_update = DownloadInfoUpdate {
        id: download_info_context.id.clone(),
        status: Some("checkSource".to_string()),
        download_count: Some(download_info_context.download_count),
        ..Default::default()
    };
    let _ = update_download_by_id(download_info_update);
    Ok(DownloadInfoResponse {
        id: download_info_context.id.clone(),
        status: "checkSource".to_string(),
        download_count: Some(download_info_context.download_count),
        mes_type: "downloadSliceEnd".to_string(),
        ..Default::default()
    })
}

pub fn read_data_to_queue(
    download_source_info: &DownloadSourceInfo,
    json_success_path: &PathBuf,
) -> SegQueue<DownloadInfoQueueDetail> {
    let queue: SegQueue<DownloadInfoQueueDetail> = SegQueue::new();
    let download_info_list = &download_source_info.download_info_list;
    if utils::exists(&PathBuf::from(json_success_path)) {
        let success_v = &std::fs::read_to_string(json_success_path).unwrap();
        for download_info in download_info_list {
            if !success_v.contains(&download_info.file_name) {
                queue.push(DownloadInfoQueueDetail {
                    id: download_info.id,
                    url: download_info.url.clone(),
                    file_name: download_info.file_name.clone(),
                    m3u8_encrypt_key: Arc::new(download_source_info.m3u8_encrypt_key.clone()),
                });
            }
        }
    } else {
        let _ = utils::create_file(&PathBuf::from(json_success_path));
        for download_info in download_info_list {
            queue.push(DownloadInfoQueueDetail {
                id: download_info.id,
                url: download_info.url.clone(),
                file_name: download_info.file_name.clone(),
                m3u8_encrypt_key: Arc::new(download_source_info.m3u8_encrypt_key.clone()),
            });
        }
    }
    queue
}

pub async fn downloaded_file_save(p: DownloadInfoDetail) -> anyhow::Result<(), tokio::io::Error> {
    let mut file = File::create(&p.file_name).await?;
    file.write_all(&p.data.clone().unwrap_or("".into())).await?;
    Ok(())
}

async fn check_source(
    download_info_context: &mut DownloadInfoContext,
) -> anyhow::Result<DownloadInfoResponse, Box<dyn std::error::Error>> {
    let mut downloaded = true;
    let v = std::fs::read_to_string(download_info_context.json_path.clone())?;
    let download_source_info = serde_json::from_str::<DownloadSourceInfo>(&v)?;
    if download_source_info.download_info_list.len() != 0 {
        downloaded = false;
        thread::sleep(Duration::from_secs(10));
    }
    let mut status = "downloadSlice".to_string();
    if downloaded {
        status = "merger".to_string();
    }

    let download_info_update = DownloadInfoUpdate {
        id: download_info_context.id.clone(),
        status: Some(status.clone()),
        ..Default::default()
    };
    let _ = update_download_by_id(download_info_update);
    Ok(DownloadInfoResponse {
        id: download_info_context.id.clone(),
        status,
        mes_type: "checkSourceEnd".to_string(),
        ..Default::default()
    })
}

pub async fn merger(
    download_info_context: &mut DownloadInfoContext,
) -> anyhow::Result<DownloadInfoResponse, Box<dyn std::error::Error>> {
    let index_str = utils::get_path_name(&download_info_context.index_path);
    clear_download_fail_ts(index_str.clone()).await?;
    let mv_str = index_str.replace("txt", "mp4");
    File::create(Path::new(&mv_str)).await?;
    info!("开始合并视频, index:{}", index_str.clone());
    let platform = tauri_plugin_os::platform();
    let mut exe_path = utils::app_install_root().join("resources").join(platform);
    if platform == "macos" {
        exe_path = exe_path.join("ffmpeg_macos");
    } else {
        exe_path = exe_path.join("ffmpeg");
    }
    let mut cmd = Command::new(exe_path);
    let output = cmd
        .args([
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            &index_str,
            "-bsf:a",
            "aac_adtstoasc",
            "-c",
            "copy",
            &mv_str,
        ])
        .output()?;
    if output.status.success() {
        tokio::spawn(delete_m3u8_tmp_file(
            index_str,
            download_info_context.sub_title_name.clone(),
        ));

        let download_info_update = DownloadInfoUpdate {
            id: download_info_context.id.clone(),
            status: Some("downloadEnd".to_string()),
            download_status: Some("downloadSuccess".to_string()),
            ..Default::default()
        };
        let _ = update_download_by_id(download_info_update);
        Ok(DownloadInfoResponse {
            id: download_info_context.id.clone(),
            status: "downloadEnd".to_string(),
            download_status: Some("downloadSuccess".to_string()),
            mes_type: "end".to_string(),
            ..Default::default()
        })
    } else {
        let s = String::from_utf8_lossy(&output.stderr);
        error!("合并视频错误：{}", s);
        return Err(Box::from(s));
    }
}

async fn clear_download_fail_ts(index_str: String) -> anyhow::Result<(), tokio::io::Error> {
    let index_path = PathBuf::from(&index_str); // Use reference for path creation
    let mut valid_lines = Vec::new();

    // First pass: Read index file and collect valid lines/paths
    {
        // Scope for reader to release the file lock
        let f = File::open(&index_path).await?;
        let mut reader = BufReader::new(f);
        let mut line = String::new();
        while reader.read_line(&mut line).await? > 0 {
            let current_line_trimmed = line.trim();
            if current_line_trimmed.is_empty() {
                line.clear();
                continue;
            }
            let file_path_str = if current_line_trimmed.starts_with("file ") {
                current_line_trimmed.trim_start_matches("file ").trim()
            } else {
                current_line_trimmed // Assume it's just the path if no "file " prefix
            };
            let path = PathBuf::from(file_path_str);
            // Check if file exists asynchronously
            if tokio::fs::metadata(&path).await.is_ok() {
                // Store the original line with newline character
                valid_lines.push(line.clone());
            } else {
                // File doesn't exist, implicitly remove the line by not adding it
                info!("Index line skipped (file not found): {}", file_path_str);
            }
            line.clear();
        }
    } // Reader goes out of scope here

    // Second pass: Rewrite the index file with only valid lines
    {
        // Scope for writer
        let mut index_file_writer = OpenOptions::new()
            .write(true)
            .truncate(true)
            .create(true) // Create if it doesn't exist (though it should)
            .open(&index_path)
            .await?;
        for valid_line in valid_lines {
            index_file_writer.write_all(valid_line.as_bytes()).await?;
        }
        index_file_writer.flush().await?; // Ensure all data is written
    }

    Ok(())
}

async fn delete_m3u8_tmp_file(
    index_str: String,
    sub_title_name: String,
) -> anyhow::Result<(), tokio::io::Error> {
    // 休眠1分钟之后删除临时文件，避免ffmpeg进程未结束导致文件合并失败
    time::sleep(Duration::from_secs(20)).await;
    let mut index_path = PathBuf::from(index_str);
    index_path.pop();
    let ts_path = index_path.join("ts");
    let _ = remove_dir_all(ts_path).await;
    let index_json = format!("{}.json", &sub_title_name);
    remove_file(index_path.join(&index_json)).await?;
    let txt = format!("{}.txt", &sub_title_name);
    remove_file(index_path.join(&txt)).await?;
    let success_json = format!("{}_success.json", &sub_title_name);
    remove_file(index_path.join(&success_json)).await?;
    Ok(())
}
