use std::{sync::{Mutex, Arc}, time::Duration};
use lazy_static::lazy_static;
use moka::sync::Cache;

lazy_static! {
    pub static ref CACHE: Mutex<Arc<Cache<String, serde_json::Value>>> = Mutex::new(Arc::new(Cache::builder()
    .max_capacity(32 * 1024 * 1024)
    .time_to_live(Duration::from_secs(24 * 60 * 60))
    .build()));
}

pub mod cmd {
    use tauri::command;
    use super::CACHE;

    #[command]
    pub fn cache_data(key: String, value: serde_json::Value) {
        let cache = CACHE.lock().unwrap();
        cache.insert(key, value);
    }

    #[command]
    pub fn get_cache_data(key: String) -> Option<serde_json::Value> {
        let cache = CACHE.lock().unwrap();
        let data = cache.get(&key);
        data
    }
}