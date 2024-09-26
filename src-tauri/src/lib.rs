use conf::get;
use log::{info, LevelFilter};
use once_cell::sync::OnceCell;
use serde_json::{json, Value};
use tauri::{App, WebviewWindow, Wry};

mod cache;
mod conf;
mod download;
mod utils;

use download::file_download;
use tauri_plugin_log::{Target, TargetKind};
use url::Url;

use crate::conf::{init_config, init_config_value, is_first_run};

pub static APP: OnceCell<tauri::AppHandle> = OnceCell::new();

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::async_runtime::spawn(file_download::init());
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(LevelFilter::Info)
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir { file_name: None }),
                    Target::new(TargetKind::Webview),
                ])
                .build(),
        )
        .setup(move |app| {
            // Global AppHandle
            APP.get_or_init(|| app.handle().clone());
            // Init Config
            #[cfg(not(any(target_os = "android", target_os = "macos")))]
            {
                info!("Init Config Store");
                init_config(app);
                // Check First Run
                if is_first_run() {
                    // Open Config Window
                    info!("First Run, opening config window");
                    init_config_value();
                }
            }
            let create_window_result = create_window(app);
            if create_window_result.is_err() {
                log::error!(
                    "Create Window Error: {}",
                    create_window_result.err().unwrap()
                );
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            utils::cmd::get_init_site_data,
            utils::cmd::del_movie_path,
            utils::cmd::calculate_ping_latency,
            cache::cmd::cache_data,
            cache::cmd::get_cache_data,
            conf::cmd::reload_store,
            file_download::cmd::retry_download,
            file_download::cmd::movie_merger,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn create_window(app: &App<Wry>) -> anyhow::Result<WebviewWindow<Wry>, Box<dyn std::error::Error>> {
    let mut webview_window =
        tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::App("index.html".into()));
    #[cfg(not(target_os = "android"))]
    {
        webview_window = webview_window.title("vop")
            .center()
            .inner_size(1440f64, 840f64)
            .fullscreen(false)
            .resizable(true)
            .decorations(false);
    }

    #[allow(unused_assignments)]
    let mut proxy_protocol: Option<Value> = None;
    #[cfg(not(any(target_os = "android", target_os = "macos")))]
    {
        proxy_protocol = get("proxyProtocol"); 
    }
    match proxy_protocol {
        Some(proxy_protocol) => {
            let pp = proxy_protocol.as_str().unwrap_or("http").to_lowercase();
            if pp == "http" || pp == "socks5" {
                let proxy_server = get("proxyServer").unwrap_or(json!("127.0.0.1".to_string()));
                let proxy_server_str = proxy_server.as_str().unwrap();
                let proxy_port = get("proxyPort").unwrap_or(json!(10809));
                let proxy_port_num = proxy_port.as_u64().unwrap();
                webview_window = webview_window
                .proxy_url(Url::parse(&format!("{}://{}:{}", pp, proxy_server_str, proxy_port_num)).unwrap());
            }
            return Ok(webview_window.build()?);
        }
        _none => {
            return Ok(webview_window.build()?);
        }
    }
}
