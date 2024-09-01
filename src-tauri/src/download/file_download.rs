use crossbeam::queue::SegQueue;
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{
    collections::HashMap,
    net::{TcpListener, TcpStream},
    sync::Mutex,
    thread,
};

use log::error;
use tungstenite::{accept, handshake::HandshakeRole, Error, HandshakeError, Message, Result};

use crate::download::m3u8_download::download_m3u8;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DownloadInfo {
    pub id: i32,
    pub movie_name: String,
    pub url: String,
    pub sub_title_name: String,
    // parseSource 解析资源 downloadSlice 下载切片  checkSouce 检查资源完整性 merger 合并资源  downloadEnd 下载完成
    pub status: String,
    pub download_count: i32,
    pub count: i32,
    // wait 等待下载 downloading 下载中 downloadFail 下载失败 downloadSuccess 下载成功
    pub download_status: String,
    pub save_path: String,
}

lazy_static! {
    pub static ref DOWNLOAD_QUEUE: Mutex<SegQueue<DownloadInfo>> = Mutex::new(SegQueue::new());
}

#[allow(non_snake_case)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DownloadRequest {
    pub id: String,
    pub downloadInfo: DownloadInfo,
}

pub async fn init() {
    let server = TcpListener::bind("127.0.0.1:8000").unwrap();
    for stream in server.incoming() {
        thread::spawn(move || match stream {
            Ok(stream) => {
                if let Err(err) = handle_client(stream) {
                    match err {
                        Error::ConnectionClosed | Error::Protocol(_) | Error::Utf8 => (),
                        e => error!("WebSocket handler business error: {}", e),
                    }
                }
            }
            Err(e) => error!("Error accepting stream: {}", e),
        });
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
    let mut download_count_map: HashMap<String, i32> = HashMap::new();
    loop {
        match socket.read()? {
            msg @ Message::Text(_) | msg @ Message::Binary(_) => {
                let mut request =
                    serde_json::from_str::<DownloadRequest>(&msg.into_text()?).expect("Resolve json error");
                let result = download_m3u8(
                    &mut request.downloadInfo,
                    &mut socket,
                    &mut download_count_map,
                )
                .await;
                if result.is_err() {
                    let uq_key = &format!(
                        "{}_{}",
                        request.downloadInfo.id, &request.downloadInfo.status
                    );
                    if download_count_map.contains_key(uq_key) {
                        if let Some(x) = download_count_map.get_mut(uq_key) {
                            *x += 1;
                        }
                        if download_count_map.get(uq_key).unwrap_or(&0) > &4 {
                            download_count_map.remove(uq_key);
                            socket.send(tungstenite::Message::Text(
                                serde_json::to_string(&json!({
                                    "id": request.downloadInfo.id,
                                    "download_status": "downloadFail",
                                    "mes_type": "end"
                                })).expect("Failed to serialize json"),
                            ))?
                        }
                    } else {
                        download_count_map.insert(uq_key.clone(), 0);
                    }
                }
            }
            Message::Ping(_) | Message::Pong(_) | Message::Close(_) | Message::Frame(_) => {}
        }
    }
}

pub mod cmd {
    use super::{DownloadInfo, DOWNLOAD_QUEUE};
    use tauri::command;

    #[command]
    pub fn get_download_info_by_queue() -> Option<DownloadInfo> {
        let queue = DOWNLOAD_QUEUE.lock().unwrap();
        queue.pop()
    }

    #[command]
    pub fn retry_download(download: DownloadInfo) {
        let queue = DOWNLOAD_QUEUE.lock().unwrap();
        queue.push(download);
    }
}
