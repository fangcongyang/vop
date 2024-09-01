use std::{sync::{Mutex, Arc}, time::Duration};
use actix_web::{web, HttpResponse, Responder};
use lazy_static::lazy_static;
use moka::sync::Cache;
use serde::Deserialize;

lazy_static! {
    pub static ref CACHE: Mutex<Arc<Cache<String, serde_json::Value>>> = Mutex::new(Arc::new(Cache::builder()
    .max_capacity(32 * 1024 * 1024)
    .time_to_live(Duration::from_secs(24 * 60 * 60))
    .build()));
}

#[derive(Deserialize)]
pub struct CacheFormData {
    key: String,
    value: Option<String>
}

pub async fn cache_data(data: web::Form<CacheFormData>) -> impl Responder {
    let cache = CACHE.lock().unwrap();
    let key = data.key.clone();
    let value = data.value.clone();
    cache.insert(key, serde_json::from_str(&value.unwrap()).unwrap());
    HttpResponse::Ok().finish()
}

pub async fn get_cache_data(data: web::Form<CacheFormData>) -> impl Responder {
    let cache = CACHE.lock().unwrap();
    let data = cache.get(&data.key);

    HttpResponse::Ok().json(data)
}