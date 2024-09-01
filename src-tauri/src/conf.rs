use log::{info, warn};
use serde_json::{json, Value};
use tauri::{path::BaseDirectory, Manager, Wry};
use tauri_plugin_store::{Store, StoreBuilder};
use std::sync::Mutex;

use crate::{utils, APP};

// pub const BUY_COFFEE: &str = "https://www.buymeacoffee.com/lencx";

pub struct StoreWrapper(pub Mutex<Store<Wry>>);

pub fn init_config(app: &mut tauri::App) {
    let config_path = app.path().resolve("", BaseDirectory::AppConfig).unwrap();
    let config_path = config_path.join("config.json");
    info!("Load config from: {:?}", config_path);
    let mut store = StoreBuilder::new(config_path).build(app.handle().clone());

    match store.load() {
        Ok(_) => info!("Config loaded"),
        Err(e) => {
            warn!("Config load error: {:?}", e);
            info!("Config not found, creating new config");
        }
    }
    app.manage(StoreWrapper(Mutex::new(store)));
}

#[allow(unused)]
pub fn get(key: &str) -> Option<Value> {
  let state = APP.get().unwrap().state::<StoreWrapper>();
  let store = state.0.lock().unwrap();
  match store.get(key) {
      Some(value) => Some(value.clone()),
      _none => None,
  }
}

pub fn set<T: serde::ser::Serialize>(key: &str, value: T) {
  let state = APP.get().unwrap().state::<StoreWrapper>();
  let mut store = state.0.lock().unwrap();
  store.insert(key.to_string(), json!(value)).unwrap();
  store.save().unwrap();
}


pub fn is_first_run() -> bool {
  let state = APP.get().unwrap().state::<StoreWrapper>();
  let store = state.0.lock().unwrap();
  store.is_empty()
}

pub fn init_config_value() {
    let init_config_value_str = utils::read_init_data_file("config.json");
    let init_config_value: Value = serde_json::from_str(&init_config_value_str).unwrap();
    init_config_value.as_object().unwrap().iter().for_each(|(k, v)| {
        set(k, v.clone());
    })
}

pub mod cmd {
    use tauri::Manager;

    use crate::APP;

    use super::StoreWrapper;

    #[tauri::command]
    pub fn reload_store() {
        let state = APP.get().unwrap().state::<StoreWrapper>();
        let mut store = state.0.lock().unwrap();
        store.load().unwrap();
    }
}
