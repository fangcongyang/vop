use conf::get;
use diesel::{Connection, SqliteConnection};
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};
use log::{info, LevelFilter};
use once_cell::sync::OnceCell;
use serde_json::{json, Value};
use tauri::{App, AppHandle, WebviewWindow, Wry};

mod cache;
mod conf;
mod download;
mod utils;
mod app;
mod schema;
mod orm;

use download::file_download;
use tauri_plugin_log::{Target, TargetKind};
use url::Url;

use crate::conf::{init_config, init_config_value, is_first_run};

pub static APP: OnceCell<tauri::AppHandle> = OnceCell::new();
pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!();

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_vop::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(LevelFilter::Info)
                .max_file_size(50_000)
                .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepSome(15))
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
            // 初始化数据库
            init_database(app.handle())?;
            info!("Init Config Store");
            let mut app_handle = app.handle().clone();
            init_config(&mut app_handle);
            // Check First Run
            if is_first_run() {
                // Open Config Window
                info!("First Run, opening config window");
                init_config_value();
            }
            let create_window_result = create_window(app);
            if create_window_result.is_err() {
                log::error!(
                    "Create Window Error: {}",
                    create_window_result.err().unwrap()
                );
            }

            // 延迟启动WebSocket服务器，确保应用程序完全初始化
            tauri::async_runtime::spawn(async {
                // 等待应用程序完全启动
                tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                info!("Starting WebSocket download server...");
                file_download::init().await;
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            utils::cmd::get_init_site_data,
            utils::cmd::calculate_ping_latency,
            cache::cmd::cache_data,
            cache::cmd::get_cache_data,
            conf::cmd::reload_store,
            file_download::cmd::retry_download,
            file_download::cmd::movie_merger,
            app::cmds::open_devtools,
            app::cmds::download_file_task,
            app::cmds::github_repos_info_version,
            app::cmds::create_top_small_play_window,
            orm::history::cmds::get_current_history_or_save,
            orm::history::cmds::get_current_history,
            orm::history::cmds::select_all_history,
            orm::history::cmds::update_history,
            orm::history::cmds::delete_history,
            orm::download_info::cmds::select_all_download_info,
            orm::download_info::cmds::get_download_info_by_id,
            orm::download_info::cmds::save_download_info,
            orm::download_info::cmds::delete_download_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn create_window(app: &App<Wry>) -> anyhow::Result<WebviewWindow<Wry>, Box<dyn std::error::Error>> {
    let mut webview_window =
        tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::App("index.html".into()));
    #[cfg(not(target_os = "android"))]
    {
        webview_window = webview_window
            .title("vop")
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
                webview_window = webview_window.proxy_url(
                    Url::parse(&format!("{}://{}:{}", pp, proxy_server_str, proxy_port_num))
                        .unwrap(),
                );
            }
            return Ok(webview_window.build()?);
        }
        _none => {
            return Ok(webview_window.build()?);
        }
    }
}


fn init_database(app: &AppHandle) -> anyhow::Result<()> {
    use diesel::RunQueryDsl;

    let conn_url = orm::get_database_path(app)?;
    info!("Database Path: {:?}", conn_url);
    let mut conn = SqliteConnection::establish(&conn_url.clone()).expect("failed to connect to db");

    // 设置SQLite优化参数
    diesel::sql_query("PRAGMA busy_timeout = 2000;")
        .execute(&mut conn)
        .expect("Failed to set busy timeout");
    diesel::sql_query("PRAGMA journal_mode = WAL;")
        .execute(&mut conn)
        .expect("Failed to set WAL mode");

    diesel::sql_query("PRAGMA synchronous = NORMAL;")
        .execute(&mut conn)
        .expect("Failed to set synchronous mode");

    diesel::sql_query("PRAGMA cache_size = 10000;")
        .execute(&mut conn)
        .expect("Failed to set cache size");
    diesel::sql_query("PRAGMA wal_autocheckpoint = 1000;")
        .execute(&mut conn)
        .map_err(diesel::r2d2::Error::QueryError)?;

    // Run pending migrations on startup
    conn.run_pending_migrations(MIGRATIONS)
        .expect("migrations failed");
    orm::init_database_pool(&conn_url)?;
    info!("Migrations applied successfully.");
    Ok(())
}
