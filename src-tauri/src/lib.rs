use conf::get;
use diesel::{Connection, SqliteConnection};
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};
use log::{info, LevelFilter};
use once_cell::sync::OnceCell;
use serde_json::{json, Value};
use tauri::{App, AppHandle, WebviewWindow, Wry};

mod app;
mod cache;
mod conf;
mod download;
mod orm;
mod schema;
mod utils;

use crate::app::hotkey;
use download::file_download;
use tauri_plugin_log::{Target, TargetKind};
use url::Url;

use crate::conf::{init_config, init_config_value, is_first_run};

pub static APP: OnceCell<tauri::AppHandle> = OnceCell::new();
pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!();

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
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

            // 1. 首先初始化配置（同步），确保窗口创建时能读取到代理等配置
            info!("Init Config Store");
            let mut app_handle = app.handle().clone();
            init_config(&mut app_handle);

            // Check First Run
            if is_first_run() {
                info!("First Run, opening config window");
                init_config_value();
            }

            // 2. 创建窗口（初始隐藏），此时配置已可用
            let create_window_result = create_window(app);
            if create_window_result.is_err() {
                log::error!(
                    "Create Window Error: {}",
                    create_window_result.err().unwrap()
                );
            }

            // 3. 在后台线程中初始化数据库和其他服务，避免阻塞窗口显示
            let app_handle_for_async = app_handle.clone();

            #[cfg(desktop)]
            {
                use crate::conf::set;
                use crate::conf::Shortcut;
                app.handle()
                    .plugin(tauri_plugin_global_shortcut::Builder::new().build())?;

                let mut shortcuts: Vec<Shortcut> = vec![];
                if let Some(serde_json::Value::Bool(enable_global_shortcut)) = get("enableGlobalShortcut") {

                    // 初始化全局快捷键
                    if enable_global_shortcut {
                        get("shortcutList")
                            .unwrap()
                            .as_array()
                            .unwrap()
                            .iter()
                            .for_each(|item| {
                                let shortcut =
                                    serde_json::from_value::<Shortcut>(item.clone()).unwrap();
                                shortcuts.push(hotkey::hotkey_desktop::register_shortcut(shortcut));
                            });
                        set("shortcutList", shortcuts);
                    }
                }
            }
            std::thread::spawn(move || {
                let start_time = std::time::Instant::now();
                info!("Starting background initialization...");

                // 同步初始化数据库
                let db_start = std::time::Instant::now();
                if let Err(e) = init_database(&app_handle_for_async) {
                    log::error!("Database initialization failed: {}", e);
                } else {
                    info!(
                        "Database initialization completed in {:?}",
                        db_start.elapsed()
                    );
                }

                info!("Starting WebSocket download server...");

                // 使用 Tauri 的异步运行时来启动 WebSocket 服务器
                let app_handle_clone = app_handle_for_async.clone();
                app_handle_clone
                    .run_on_main_thread(move || {
                        tauri::async_runtime::spawn(async move {
                            file_download::init().await;
                        });
                    })
                    .expect("Failed to run on main thread");

                info!(
                    "Background initialization thread completed in {:?}",
                    start_time.elapsed()
                );
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            utils::cmd::get_init_site_data,
            utils::cmd::calculate_ping_latency,
            cache::cmd::cache_data,
            cache::cmd::get_cache_data,
            conf::cmd::reload_store,
            conf::cmd::restore_default_shortcuts,
            hotkey::cmd::register_shortcut_by_frontend,
            hotkey::cmd::unregister_shortcut_by_frontend,
            file_download::cmd::retry_download,
            file_download::cmd::movie_merger,
            app::cmds::open_devtools,
            app::cmds::download_file_task,
            app::cmds::download_miniserve_task,
            app::cmds::start_miniserve_service,
            app::cmds::stop_miniserve_service,
            app::cmds::check_miniserve_service_status,
            app::cmds::get_local_ip,
            app::cmds::github_repos_info_version,
            app::cmds::create_top_small_play_window,
            orm::history::cmds::get_current_history_or_save,
            orm::history::cmds::get_current_history,
            orm::history::cmds::select_all_history,
            orm::history::cmds::update_history,
            orm::history::cmds::delete_history,
            orm::history::cmds::import_history,
            orm::download_info::cmds::select_all_download_info,
            orm::download_info::cmds::get_download_info_by_id,
            orm::download_info::cmds::save_download_info,
            orm::download_info::cmds::delete_download_info,
            orm::star::cmds::star_movie,
            orm::star::cmds::delete_star,
            orm::star::cmds::select_all_star,
            orm::star::cmds::import_star,
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
            .decorations(false)
            .visible(true); // 初始隐藏窗口，避免白屏
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
