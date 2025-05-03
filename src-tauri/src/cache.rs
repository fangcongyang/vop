use lazy_static::lazy_static;
use moka::sync::Cache;
use std::{
    sync::{Arc, Mutex},
    time::Duration,
};

lazy_static! {
    pub static ref CACHE: Mutex<Arc<Cache<String, serde_json::Value>>> = Mutex::new(Arc::new(
        Cache::builder()
            .max_capacity(32 * 1024 * 1024)
            .time_to_live(Duration::from_secs(24 * 60 * 60))
            .build()
    ));
}

pub mod cmd {
    use super::CACHE;
    use tauri::command;

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
