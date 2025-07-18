use tauri::http::{HeaderMap, HeaderName, HeaderValue, StatusCode};
use tauri_plugin_http::reqwest;
use url::Url;

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
