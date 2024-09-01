use crossbeam::queue::SegQueue;
use log::error;
use m3u8_rs::{MediaPlaylist, Playlist};
use serde_json::json;
use std::{
    collections::HashMap, fs::create_dir_all, net::TcpStream, path::{Path, PathBuf}, process::Command, sync::{
        atomic::{AtomicI32, Ordering},
        Arc,
    }, thread, time::Duration
};
use tauri::http::StatusCode;
use tauri_plugin_http::reqwest;
use tokio::{
    fs::{remove_dir_all, remove_file, File, OpenOptions},
    io::{AsyncWriteExt, BufWriter},
    sync::{mpsc, Semaphore},
    time,
};
use tungstenite::WebSocket;

use crate::utils;

use super::{
    file_download::DownloadInfo, m3u8_encrypt_key::{KeyType, M3u8EncryptKey}, types::{parse_operation_name, DownloadInfoContext, DownloadInfoDetail, DownloadInfoQueueDetail, DownloadOperation, DownloadSourceInfo}, util::download_request
};

pub async fn download_m3u8(
    download_info: &mut DownloadInfo,
    socket: &mut WebSocket<TcpStream>,
    download_count_map: &mut HashMap<String, i32>,
) -> anyhow::Result<(), Box<dyn std::error::Error>> {
    let mut download_info_context = DownloadInfoContext::new(download_info)?;
    let uq_key = &format!(
        "{}_{}",
        download_info_context.id, &download_info_context.status
    );
    let result;

    let operation = parse_operation_name(&download_info_context.status[..]);

    match operation {
        DownloadOperation::ParseSource => {
            result = parse_source(&mut download_info_context).await;
        }
        DownloadOperation::DownloadSlice => {
            result = download_slice(&mut download_info_context, socket).await;
        }
        DownloadOperation::CheckSource => {
            result = check_souce(&mut download_info_context).await;
        }
        DownloadOperation::Merger => {
            result = merger(&mut download_info_context).await;
        }
        DownloadOperation::UnsupportedOperation => {
            result = Err(Box::from("不支持的操作"));
        },
    }
    // 程序报错直接修改任务状态为失败
    if result.is_ok() {
        download_count_map.remove(uq_key);
        socket.send(tungstenite::Message::Text(result?))?;
    } else {
        error!("下载m3u8失败，失败原因:{}", result.unwrap_err());
        socket.send(tungstenite::Message::Text(
            serde_json::to_string(&json!({
                "id": download_info_context.id,
                "status": download_info_context.status,
                "download_status": "downloadFail",
                "mes_type": "end"
            })).expect("Failed to serialize JSON"),
        ))?
    }
    Ok(())
}

async fn parse_source(
    download_info_context: &mut DownloadInfoContext,
) -> anyhow::Result<String, Box<dyn std::error::Error>> {
    let media_play_list = parse_m3u8(download_info_context).await?;
    let count = media_play_list.segments.len();
    let mut download_source_info = DownloadSourceInfo::new();
    download_source_info.id = download_info_context.id;

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
    std::fs::write(&download_info_context.json_path, v)?;

    let r_json = json!({
        "id": download_info_context.id,
        "status": "downloadSlice",
        "count": count,
        "download_status": "downloading",
        "mes_type": "parseSourceEnd",
    });
    let result = serde_json::to_string(&r_json)?;
    Ok(result)
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
) -> anyhow::Result<String, Box<dyn std::error::Error>> {
    let download_count = AtomicI32::new(download_info_context.download_count);
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

    loop {
        let detail = queue.pop().unwrap();
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
                                    Some(data1) => data = data1,
                                    _ => {}
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

    while let Some(res) = rx.recv().await {
        if res.success {
            let file_name = res.file_name.clone();
            let rs = downloaded_file_save(res.clone()).await;
            if rs.is_ok() {
                let download_count1 = download_count.fetch_add(1, Ordering::Relaxed);

                let _ = &json_success_file
                    .write((file_name + "\r\n").as_bytes())
                    .await?;

                socket.send(tungstenite::Message::Text(serde_json::to_string(&json!({
                    "id": download_info_context.id,
                    "download_count": download_count1,
                    "mes_type": "progress",
                }))?))?
            } else {
                download_source_info.download_info_list.push(res);
            }
        } else {
            download_source_info.download_info_list.push(res);
        }
    }

    let v = serde_json::to_string_pretty(&download_source_info)?;
    std::fs::write(&download_info_context.json_path, v)?;

    let r_json = json!({
        "id": download_info_context.id,
        "download_count": download_count.load(Ordering::Relaxed),
        "status": "checkSource",
        "mes_type": "downloadSliceEnd",
    });
    let result = serde_json::to_string(&r_json)?;
    Ok(result)
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

async fn check_souce(
    download_info_context: &mut DownloadInfoContext,
) -> anyhow::Result<String, Box<dyn std::error::Error>> {
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

    let r_json = json!({
        "id": download_info_context.id,
        "status": status,
        "mes_type": "checkSourceEnd",
    });
    let result = serde_json::to_string(&r_json)?;
    Ok(result)
}

async fn merger(
    download_info_context: &mut DownloadInfoContext,
) -> anyhow::Result<String, Box<dyn std::error::Error>> {
    let index_str = utils::get_path_name(&download_info_context.index_path);
    let mv_str = index_str.replace("txt", "mp4");
    File::create(Path::new(&mv_str)).await?;
    let mut cmd = Command::new("ffmpeg");
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
        let r_json = json!({
            "id": download_info_context.id,
            "status": "downloadEnd".to_string(),
            "download_status": "downloadSuccess".to_string(),
            "mes_type": "end",
        });

        tokio::spawn(delete_m3u8_tmp_file(
            index_str,
            download_info_context.sub_title_name.clone(),
        ));

        let result = serde_json::to_string(&r_json)?;
        Ok(result)
    } else {
        let s = String::from_utf8_lossy(&output.stderr);
        return Err(Box::from(s));
    }
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
    let success_json  = format!("{}_success.json", &sub_title_name);
    remove_file(index_path.join(&success_json)).await?;
    Ok(())
}
