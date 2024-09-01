use actix_web::{web, HttpResponse, Responder};
use log::{error, info};
use reqwest::{header::{HeaderMap, HeaderName, HeaderValue}, StatusCode};
use serde::Deserialize;
use url::Url;

#[derive(Deserialize)]
pub struct FormData {
    request_path: String,
}

pub async fn site_proxy(data: web::Form<FormData>) -> impl Responder {
    info!("网站代理请求: {}", data.request_path);
    let url = Url::parse(&data.request_path).unwrap();
    let result = request(&url).await;
    match result {
        Ok(result) => HttpResponse::Ok().body(result),
        Err(_) => HttpResponse::Ok().finish(),
    }
}

pub async fn request(url: &Url) -> anyhow::Result<String> {
    let mut headers = HeaderMap::new();
    let mut base_url = url.clone();
    base_url.set_path("");
    headers.insert(HeaderName::from_static("referer"), HeaderValue::from_str(base_url.as_str()).unwrap());
    
    let client = reqwest::Client::new();
    let resp = client.get(url.as_str()).headers(headers).send().await?;
    if resp.status() != StatusCode::OK {
        error!("{}", format!("{} request failed. http code: {}", url.as_str(), resp.status()))
    }
    Ok(resp.text().await?)
}