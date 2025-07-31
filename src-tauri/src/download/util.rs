use tauri::http::{HeaderMap, HeaderName, HeaderValue, StatusCode};
use tauri_plugin_http::reqwest;
use url::Url;
use std::{
    time::Duration,
};

use crate::download::m3u8_encrypt_key::{M3u8EncryptKey, KeyType};

pub async fn download_request(url: &Url) -> anyhow::Result<Vec<u8>> {
    let mut headers = HeaderMap::new();
    headers.insert(
        HeaderName::from_static("upgrade-insecure-requests"),
        HeaderValue::from_static("1"),
    );
    let mut base_url = url.clone();
    base_url.set_path("");
    headers.insert(
        HeaderName::from_static("referer"),
        HeaderValue::from_str(base_url.as_str()).unwrap(),
    );

    let client = reqwest::Client::new();
    let resp = client.get(url.as_str()).headers(headers).send().await?;
    if resp.status() != StatusCode::OK {
        panic!(
            "{}",
            format!(
                "{} download failed. http code: {}",
                url.as_str(),
                resp.status()
            )
        )
    }
    Ok(resp.bytes().await?.to_vec())
}

pub async fn download_ts(url: &str, m3u8_encrypt_key: &M3u8EncryptKey) -> anyhow::Result<(bool, Vec<u8>)> {
    let mut data = Vec::new();
    let mut success = false;
    // 创建带10秒超时的HTTP客户端
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()?;
    let rp = client.get(url).send().await?;
    if rp.status() == StatusCode::OK {
        let d = rp.bytes().await?;
        data = d.to_vec();
        if !data.is_empty() && !matches!(m3u8_encrypt_key.ty, KeyType::None) {
            if let Some(data1) = m3u8_encrypt_key.decode(&mut data)? {
                success = true;
                data = data1;
            }
        } else {
            success = true;
        }
    }
    Ok((success, data))
}
