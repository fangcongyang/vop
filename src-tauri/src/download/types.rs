use std::{fs::create_dir_all, path::PathBuf, sync::Arc};

use serde::{Deserialize, Serialize};
use url::Url;

use super::{file_download::DownloadTaskInfo, m3u8_encrypt_key::M3u8EncryptKey};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadInfoContext {
    pub id: String,
    pub url: Url,
    pub count: Option<i32>,
    pub download_count: i32,
    pub movie_name: String,
    pub sub_title_name: String,
    pub status: String,
    //消息类型 progress 进度切换 statusChange
    pub mes_type: String,
    pub download_status: String,
    pub index_path: PathBuf,
    pub json_path: PathBuf,
    pub json_success_path: PathBuf,
    pub ts_path: PathBuf,
}

impl DownloadInfoContext {
    pub fn new(download_info: &mut DownloadTaskInfo) -> Result<Self, anyhow::Error> {
        let (movie_name, sub_title_name) =
            (&download_info.movie_name, &download_info.sub_title_name);
        let save_path = &download_info.save_path;
        let movie_path = PathBuf::from(save_path)
            .join(movie_name)
            .join(sub_title_name);

        create_dir_all(&movie_path)?;

        let index_path = movie_path.join(format!("{}.txt", sub_title_name));
        let json_path = movie_path.join(format!("{}.json", sub_title_name));
        let json_success_path = movie_path.join(format!("{}_success.json", sub_title_name));
        let ts_path = movie_path.join("ts");

        Ok(Self {
            id: download_info.id.clone(),
            url: Url::parse(&download_info.url).unwrap(),
            movie_name: movie_name.to_string(),
            sub_title_name: sub_title_name.to_string(),
            status: download_info.status.clone(),
            mes_type: "statusChange".into(),
            download_status: download_info.download_status.clone(),
            count: download_info.count,
            download_count: download_info.download_count,
            index_path,
            json_path,
            json_success_path,
            ts_path,
        })
    }
}

#[allow(non_snake_case)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadInfoDetail {
    pub id: usize,
    pub url: Url,
    pub file_name: String,
    pub data: Option<Vec<u8>>,
    pub success: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadSourceInfo {
    pub id: String,
    pub m3u8_encrypt_key: M3u8EncryptKey,
    pub download_info_list: Vec<DownloadInfoDetail>,
}

impl DownloadSourceInfo {
    pub fn new() -> Self {
        Self {
            id: "".to_string(),
            m3u8_encrypt_key: M3u8EncryptKey::default(),
            download_info_list: [].to_vec(),
        }
    }
}

#[allow(non_snake_case)]
#[derive(Debug, Clone)]
pub struct DownloadInfoQueueDetail {
    pub id: usize,
    pub url: Url,
    pub file_name: String,
    pub m3u8_encrypt_key: Arc<M3u8EncryptKey>,
}

#[derive(PartialEq)]
pub enum DownloadOperation {
    ParseSource,
    DownloadSlice,
    CheckSource,
    Merger,
    DownloadEnd,
    UnsupportedOperation,
}

pub fn parse_operation_name(name: &str) -> DownloadOperation {
    match name {
        "parseSource" => DownloadOperation::ParseSource,
        "downloadSlice" => DownloadOperation::DownloadSlice,
        "checkSource" => DownloadOperation::CheckSource,
        "merger" => DownloadOperation::Merger,
        "downloadEnd" => DownloadOperation::DownloadEnd,
        _ => DownloadOperation::UnsupportedOperation,
    }
}

#[derive(Default, Debug, Serialize, Deserialize, Clone)]
pub struct DownloadInfoResponse {
    pub id: String,
    // parseSource 解析资源 downloadSlice 下载切片  checkSouce 检查资源完整性 merger 合并资源  downloadEnd 下载完成
    pub status: String,
    pub download_count: Option<i32>,
    pub count: Option<usize>,
    // wait 等待下载 downloading 下载中 downloadFail 下载失败 downloadSuccess 下载成功
    pub download_status: Option<String>,
    pub mes_type: String,
}
