use log::{info, warn};
use serde_json::{json, Value};
use tauri::{path::BaseDirectory, Manager, Wry};
use tauri_plugin_store::{Store, StoreBuilder};
use std::{fs, sync::Mutex};

use crate::{utils, APP};

// pub const BUY_COFFEE: &str = "https://www.buymeacoffee.com/lencx";

pub struct StoreWrapper(pub Mutex<Store<Wry>>);

pub fn init_config(app: &mut tauri::App) {
    let config_path = app.path().resolve("", BaseDirectory::AppConfig).unwrap();
    let config_path = config_path.join("config.json");
    let _ = utils::create_dir_if_not_exists(&config_path);
    // if config_path.exists() {
        let _ = fs::remove_file(&config_path);
    // }
    info!("Load config from: {:?}", config_path);
    let store = StoreBuilder::new(&app.handle().clone(), config_path).build();

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
  let store = state.0.lock().unwrap();
  store.set(key.to_string(), json!(value));
  store.save().unwrap();
}


pub fn is_first_run() -> bool {
  let state = APP.get().unwrap().state::<StoreWrapper>();
  let store = state.0.lock().unwrap();
  store.length() == 0
}

pub fn init_config_value() {
    let init_config_value_str = utils::read_init_data_file("config.json");
    if init_config_value_str == "[]" {
        set("appName", "vop");
        return;
    }
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
        let store = state.0.lock().unwrap();
        store.load().unwrap();
    }
}
