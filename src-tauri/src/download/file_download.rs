use crossbeam::queue::SegQueue;
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{
    net::{TcpListener, TcpStream},
    sync::Mutex,
    thread,
};

use log::{error, info};
use tungstenite::{accept, handshake::HandshakeRole, Error, HandshakeError, Message, Result};

#[cfg(windows)]
use std::sync::Once;
#[cfg(windows)]
use winapi::shared::minwindef::MAKEWORD;

#[cfg(windows)]
static WINSOCK_INIT: Once = Once::new();

use crate::download::m3u8_download::M3u8Download;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DownloadTaskInfo {
    pub id: String,
    pub movie_name: String,
    pub url: String,
    pub sub_title_name: String,
    // parseSource 解析资源 downloadSlice 下载切片  checkSouce 检查资源完整性 merger 合并资源  downloadEnd 下载完成
    pub status: String,
    pub download_count: i32,
    pub count: Option<i32>,
    // wait 等待下载 downloading 下载中 downloadFail 下载失败 downloadSuccess 下载成功
    pub download_status: String,
    pub save_path: String,
}

lazy_static! {
    pub static ref DOWNLOAD_QUEUE: Mutex<SegQueue<DownloadTaskInfo>> = Mutex::new(SegQueue::new());
}

#[allow(non_snake_case)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DownloadRequest {
    pub id: String,
    pub messageType: String,
    pub downloadTaskInfo: Option<DownloadTaskInfo>,
}

pub async fn init() {
    // 在Windows上初始化Winsock
    #[cfg(windows)]
    WINSOCK_INIT.call_once(|| unsafe {
        let mut wsa_data: winapi::um::winsock2::WSADATA = std::mem::zeroed();
        let result = winapi::um::winsock2::WSAStartup(MAKEWORD(2, 2), &mut wsa_data);
        if result != 0 {
            error!("WSAStartup failed with error: {}", result);
            return;
        } else {
            info!("Winsock initialized successfully");
        }
    });

    // 添加小延迟确保网络栈完全初始化
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    match TcpListener::bind("127.0.0.1:8000") {
        Ok(server) => {
            info!("WebSocket server started on 127.0.0.1:8000");
            for stream in server.incoming() {
                thread::spawn(move || match stream {
                    Ok(stream) => {
                        if let Err(err) = handle_client(stream) {
                            match err {
                                Error::ConnectionClosed | Error::Protocol(_) | Error::Utf8(_) => (),
                                e => error!("WebSocket handler business error: {}", e),
                            }
                        }
                    }
                    Err(e) => error!("Error accepting stream: {}", e),
                });
            }
        }
        Err(e) => {
            error!("Failed to bind WebSocket server to 127.0.0.1:8000: {}", e);
            #[cfg(windows)]
            {
                error!("This might be due to Windows network stack initialization issues.");
                error!("Please ensure no other application is using port 8000.");
            }
        }
    }
}

fn must_not_block<Role: HandshakeRole>(err: HandshakeError<Role>) -> Error {
    match err {
        HandshakeError::Interrupted(_) => panic!("Bug: blocking socket would block"),
        HandshakeError::Failure(f) => f,
    }
}

#[tokio::main]
async fn handle_client(stream: TcpStream) -> Result<()> {
    let mut socket = accept(stream).map_err(must_not_block)?;
    loop {
        match socket.read()? {
            msg @ Message::Text(_) | msg @ Message::Binary(_) => {
                let request = serde_json::from_str::<DownloadRequest>(&msg.into_text()?)
                    .expect("Resolve json error");
                match request.messageType.as_str() {
                    "get_download_info_by_queue" => {
                        let queue = DOWNLOAD_QUEUE.lock().unwrap();
                        let download_info = queue.pop();
                        socket.send(tungstenite::Message::text(
                            serde_json::to_string(&json!({
                                "id": request.id.clone(),
                                "downloadTaskInfo": download_info,
                                "messageType": "get_download_info_by_queue"
                            }))
                            .expect("Failed to serialize json"),
                        ))?
                    }
                    "downloadVideo" => {
                        let download_info = request.downloadTaskInfo.unwrap();
                        let mut m3u8_download =
                            M3u8Download::new(&mut download_info.clone()).unwrap();
                        m3u8_download.start_download(&mut socket).await;
                    }
                    _ => {}
                }
            }
            Message::Ping(_) | Message::Pong(_) | Message::Close(_) | Message::Frame(_) => {}
        }
    }
}

pub mod cmd {
    use crate::{download::file_download::service, orm::download_info::types::DownloadInfo};

    use tauri::command;

    #[command]
    pub fn retry_download(download: DownloadInfo) {
        service::retry_download(download);
    }

    #[command]
    pub async fn movie_merger(download: DownloadInfo) -> Result<DownloadInfo, String> {
        Ok(service::movie_merger(download).await?)
    }
}

pub mod service {
    use crate::{
        conf::get_string,
        download::{m3u8_download::merger, types::DownloadInfoContext},
        orm::download_info::types::DownloadInfo,
    };

    use super::{DownloadTaskInfo, DOWNLOAD_QUEUE};

    pub fn retry_download(download: DownloadInfo) {
        let queue = DOWNLOAD_QUEUE.lock().unwrap();
        queue.push(download_info_to_download_task_info(download));
    }

    pub async fn movie_merger(mut download: DownloadInfo) -> Result<DownloadInfo, String> {
        let mut download_task_info = download_info_to_download_task_info(download.clone());
        let mut download_info_context: DownloadInfoContext =
            DownloadInfoContext::new(&mut download_task_info)
                .map_err(|e| format!("创建视频下载对象失败: {}", e))?;
        let result = merger(&mut download_info_context).await;
        match result {
            Ok(_) => {
                download.download_status = "downloadSuccess".to_string();
                download.status = "downloadEnd".to_string();
                return Ok(download);
            }
            Err(_) => Ok(download),
        }
    }

    pub fn download_info_to_download_task_info(download_info: DownloadInfo) -> DownloadTaskInfo {
        DownloadTaskInfo {
            id: download_info.id,
            movie_name: download_info.movie_name,
            url: download_info.url,
            sub_title_name: download_info.sub_title_name,
            status: download_info.status,
            download_count: download_info.download_count,
            count: Some(download_info.count),
            download_status: download_info.download_status,
            save_path: get_string("downloadSavePath"),
        }
    }
}
