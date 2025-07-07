use std::collections::HashMap;
use std::io::Read;
use std::process::{Child, Command};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use futures::TryStreamExt;
use log::info;
use serde::{Deserialize, Serialize};
use serde_json::json;
use serde_json::{Map, Value};
use std::net::{TcpListener, UdpSocket};
use std::path::PathBuf;
use tauri::http::header::USER_AGENT;
use tauri::http::HeaderMap;
use tauri::Emitter;
use tauri::Manager;
use tauri_plugin_http::reqwest;
use tokio::{io::AsyncWriteExt, sync::watch, time::interval};
use url::Url;
use zip::ZipArchive;

use crate::utils::choose_user_agent;
use crate::utils::{self, create_request_builder};

// 全局存储miniserve进程
lazy_static::lazy_static! {
    static ref MINISERVE_PROCESSES: Arc<Mutex<HashMap<u16, Child>>> = Arc::new(Mutex::new(HashMap::new()));
}

#[tauri::command]
pub fn open_devtools(app_handle: tauri::AppHandle) {
    if let Some(window) = app_handle.get_webview_window("main") {
        if !window.is_devtools_open() {
            window.open_devtools();
        } else {
            window.close_devtools();
        }
    }
}

#[tauri::command]
pub async fn create_top_small_play_window(
    app_handle: tauri::AppHandle,
    create_window: bool,
    short_video_mode: bool,
) -> Result<(), String> {
    use crate::conf::get;
    if !create_window {
        if let Some(top_small_play_window) = app_handle.get_webview_window("topSmallPlay") {
            match top_small_play_window.close() {
                Ok(_) => log::info!("Small play window closed successfully"),
                Err(e) => {
                    log::error!("Failed to close small play window: {}", e);
                    return Err(format!("Failed to close window: {}", e));
                }
            }
        } else {
            log::info!(
                "Small play window not found when trying to close - window may already be closed"
            );
        }
        return Ok(());
    }

    // Check if window already exists
    if let Some(_existing_window) = app_handle.get_webview_window("topSmallPlay") {
        if let Err(e) = _existing_window.set_focus() {
            log::warn!("Failed to bring existing window to front: {}", e);
        }
        return Ok(());
    }

    let mut webview_window = tauri::WebviewWindowBuilder::new(
        &app_handle,
        "topSmallPlay",
        tauri::WebviewUrl::App("index.html".into()),
    );
    #[cfg(not(target_os = "android"))]
    {
        let monitor = app_handle.primary_monitor().unwrap().unwrap();
        let screen_size = monitor.size();
        let scale_factor = monitor.scale_factor();
        let logical_size = screen_size.to_logical::<f64>(scale_factor);
        let window_size = if short_video_mode {
            (280f64, 428f64)
        } else {
            (428f64, 240f64)
        };
        let screen_width = logical_size.width;
        let screen_height = logical_size.height;
        webview_window = webview_window
            .title("vop-small-play")
            .inner_size(window_size.0, window_size.1)
            .position(
                screen_width - window_size.0 - 20.0,
                screen_height - window_size.1 - 60.0,
            )
            .always_on_top(true)
            .fullscreen(false)
            .resizable(false)
            .closable(true)
            .devtools(true)
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

            webview_window.build().map_err(|e| e.to_string())?;
        }
        _none => {
            webview_window.build().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct DownloadTaskInfo {
    event_id: String,
    download_url: String,
    file_path: String,
}

#[derive(serde::Serialize, Clone)]
struct DownloadInfo {
    status: String,
    progress: Option<f64>,
    speed: Option<f64>,
    content_length: Option<f64>,
}

enum DownloadStatus {
    BEGIN,
    PROGRESS,
    END,
    ERROR,
}

impl DownloadStatus {
    fn to_string(&self) -> String {
        match self {
            DownloadStatus::BEGIN => "begin".to_owned(),
            DownloadStatus::PROGRESS => "progress".to_owned(),
            DownloadStatus::END => "end".to_owned(),
            DownloadStatus::ERROR => "error".to_owned(),
        }
    }
}

#[tauri::command]
pub async fn download_file_task(
    app_handle: tauri::AppHandle,
    download_task_info: DownloadTaskInfo,
) {
    download_file_task_async(app_handle, download_task_info).await;
}

#[tauri::command]
pub async fn download_miniserve_task(
    app_handle: tauri::AppHandle,
    download_task_info: DownloadTaskInfo,
) {
    download_miniserve_task_async(app_handle, download_task_info).await;
}

pub async fn download_file_task_async(
    app_handle: tauri::AppHandle,
    download_task_info: DownloadTaskInfo,
) {
    let app = app_handle.clone();
    let handle = tokio::spawn(async move {
        if let Err(e) = async {
            // 创建 HTTP 客户端
            let client = reqwest::Client::new();
            let response = client.get(&download_task_info.download_url).send().await?;

            // 获取文件大小
            let total_size = response
                .headers()
                .get(reqwest::header::CONTENT_LENGTH)
                .and_then(|val| val.to_str().ok())
                .and_then(|val| val.parse::<u64>().ok())
                .unwrap_or(0);

            let content_length = total_size as f64 / 1024.0 / 1024.0;
            app.emit(
                &download_task_info.event_id,
                DownloadInfo {
                    status: DownloadStatus::BEGIN.to_string(),
                    progress: Some(0.0),
                    speed: Some(0.0),
                    content_length: Some(content_length),
                },
            )?;

            // 打开文件用于写入 - 先保存为zip文件
            let mut download_dir = utils::app_install_root();
            download_dir = download_dir.join("resources");
            let zip_file_name = format!("{}.zip", download_task_info.file_path.replace(".exe", ""));
            let zip_path = download_dir.join(&zip_file_name);
            info!("download zip file path: {:?}", zip_path);
            utils::create_dir_if_not_exists(&zip_path)?;
            let mut file = tokio::fs::File::create(&zip_path).await?;
            let mut stream = response.bytes_stream();

            let mut downloaded: u64 = 0;
            let (tx, rx) = watch::channel(0); // 共享变量，用于通知进度

            // **启动一个独立的任务，每秒发送进度**
            let progress_task = tokio::spawn({
                let app_interval = app.clone();
                let download_task_info_interval = download_task_info.clone();
                async move {
                    let mut interval = interval(Duration::from_secs(1));
                    let mut last_downloaded = 0;

                    loop {
                        interval.tick().await; // **每秒触发**

                        let downloaded = *rx.borrow(); // 获取最新的下载进度
                        let speed = (downloaded - last_downloaded) as f64 / 1024.0 / 1024.0; // MB/s
                        last_downloaded = downloaded;

                        let progress = (downloaded as f64 / total_size as f64) * 100.0;

                        app_interval
                            .emit(
                                &download_task_info_interval.event_id,
                                DownloadInfo {
                                    status: DownloadStatus::PROGRESS.to_string(),
                                    progress: Some((progress * 100.0).round() / 100.0),
                                    speed: Some((speed * 100.0).round() / 100.0),
                                    content_length: Some(content_length),
                                },
                            )
                            .ok();
                    }
                }
            });

            while let Ok(Some(chunk)) = stream.try_next().await {
                file.write_all(&chunk).await?;
                downloaded += chunk.len() as u64;
                tx.send(downloaded).ok(); // **更新进度**
            }

            progress_task.abort();

            // 解压ZIP文件
            info!("Starting to extract zip file: {:?}", zip_path);
            let zip_file = std::fs::File::open(&zip_path)?;
            let mut archive = ZipArchive::new(zip_file)?;

            // 查找exe文件并解压
            let target_exe_path = download_dir.join(&download_task_info.file_path);
            let mut exe_found = false;

            for i in 0..archive.len() {
                let mut file_in_zip = archive.by_index(i)?;
                let file_name = file_in_zip.name();

                // 查找ffmpeg.exe文件（可能在子目录中）
                if file_name.ends_with("ffmpeg.exe")
                    || file_name.ends_with(&download_task_info.file_path)
                {
                    info!("Found target exe file in zip: {}", file_name);

                    let mut exe_content = Vec::new();
                    file_in_zip.read_to_end(&mut exe_content)?;

                    // 写入目标位置
                    std::fs::write(&target_exe_path, exe_content)?;
                    exe_found = true;
                    info!("Extracted exe to: {:?}", target_exe_path);
                    break;
                }
            }

            if !exe_found {
                return Err(format!(
                    "Could not find {} in the downloaded zip file",
                    download_task_info.file_path
                )
                .into());
            }

            // 删除临时zip文件
            std::fs::remove_file(&zip_path).ok();
            info!("Removed temporary zip file: {:?}", zip_path);

            app.emit(
                &download_task_info.event_id,
                DownloadInfo {
                    status: DownloadStatus::END.to_string(),
                    progress: Some(100.0),
                    speed: Some(0.0),
                    content_length: Some(content_length),
                },
            )?;

            Ok::<(), Box<dyn std::error::Error>>(()) // 显式返回 Ok(())
        }
        .await
        {
            log::error!("Error downloading file: {}", e);
            app.emit(
                &download_task_info.event_id,
                DownloadInfo {
                    status: DownloadStatus::ERROR.to_string(),
                    progress: None,
                    speed: None,
                    content_length: None,
                },
            )
            .unwrap();
        }
    });
    let _ = handle.await;
}

pub async fn download_miniserve_task_async(
    app_handle: tauri::AppHandle,
    download_task_info: DownloadTaskInfo,
) {
    let app = app_handle.clone();
    let handle = tokio::spawn(async move {
        if let Err(e) = async {
            // 创建 HTTP 客户端
            let client = reqwest::Client::new();
            let response = client.get(&download_task_info.download_url).send().await?;

            // 获取文件大小
            let total_size = response
                .headers()
                .get(reqwest::header::CONTENT_LENGTH)
                .and_then(|val| val.to_str().ok())
                .and_then(|val| val.parse::<u64>().ok())
                .unwrap_or(0);

            let content_length = total_size as f64 / 1024.0 / 1024.0;
            app.emit(
                &download_task_info.event_id,
                DownloadInfo {
                    status: DownloadStatus::BEGIN.to_string(),
                    progress: Some(0.0),
                    speed: Some(0.0),
                    content_length: Some(content_length),
                },
            )?;

            // 直接保存为可执行文件，不需要解压
            let mut download_dir = utils::app_install_root();
            download_dir = download_dir.join("resources");
            let target_path = download_dir.join(&download_task_info.file_path);
            info!("download miniserve file path: {:?}", target_path);
            utils::create_dir_if_not_exists(&target_path)?;
            let mut file = tokio::fs::File::create(&target_path).await?;
            let mut stream = response.bytes_stream();

            let mut downloaded: u64 = 0;
            let (tx, rx) = watch::channel(0); // 共享变量，用于通知进度

            // **启动一个独立的任务，每秒发送进度**
            let progress_task = tokio::spawn({
                let app_interval = app.clone();
                let download_task_info_interval = download_task_info.clone();
                async move {
                    let mut interval = interval(Duration::from_secs(1));
                    let mut last_downloaded = 0;

                    loop {
                        interval.tick().await; // **每秒触发**

                        let downloaded = *rx.borrow(); // 获取最新的下载进度
                        let speed = (downloaded - last_downloaded) as f64 / 1024.0 / 1024.0; // MB/s
                        last_downloaded = downloaded;

                        let progress = (downloaded as f64 / total_size as f64) * 100.0;

                        app_interval
                            .emit(
                                &download_task_info_interval.event_id,
                                DownloadInfo {
                                    status: DownloadStatus::PROGRESS.to_string(),
                                    progress: Some((progress * 100.0).round() / 100.0),
                                    speed: Some((speed * 100.0).round() / 100.0),
                                    content_length: Some(content_length),
                                },
                            )
                            .ok();
                    }
                }
            });

            while let Ok(Some(chunk)) = stream.try_next().await {
                file.write_all(&chunk).await?;
                downloaded += chunk.len() as u64;
                tx.send(downloaded).ok(); // **更新进度**
            }

            progress_task.abort();

            // 设置可执行权限（Linux/macOS）
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let mut perms = tokio::fs::metadata(&target_path).await?.permissions();
                perms.set_mode(0o755);
                tokio::fs::set_permissions(&target_path, perms).await?;
                info!("Set executable permissions for: {:?}", target_path);
            }

            app.emit(
                &download_task_info.event_id,
                DownloadInfo {
                    status: DownloadStatus::END.to_string(),
                    progress: Some(100.0),
                    speed: Some(0.0),
                    content_length: Some(content_length),
                },
            )?;

            Ok::<(), Box<dyn std::error::Error>>(()) // 显式返回 Ok(())
        }
        .await
        {
            log::error!("Error downloading miniserve: {}", e);
            app.emit(
                &download_task_info.event_id,
                DownloadInfo {
                    status: DownloadStatus::ERROR.to_string(),
                    progress: None,
                    speed: None,
                    content_length: None,
                },
            )
            .unwrap();
        }
    });
    let _ = handle.await;
}

// 获取miniserve可执行文件路径
fn get_miniserve_exe_path() -> PathBuf {
    let platform = if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else {
        "linux"
    };

    let mut exe_path = utils::app_install_root().join("resources").join(platform);

    if platform == "macos" {
        exe_path = exe_path.join("miniserve_macos");
    } else if platform == "windows" {
        exe_path = exe_path.join("miniserve.exe");
    } else {
        exe_path = exe_path.join("miniserve");
    }

    exe_path
}

// 检查端口是否可用
fn is_port_available(port: u16) -> bool {
    match TcpListener::bind(format!("127.0.0.1:{}", port)) {
        Ok(listener) => {
            // 立即释放监听器
            drop(listener);
            true
        }
        Err(_) => false,
    }
}

// 检查端口是否被占用
fn is_port_occupied(port: u16) -> bool {
    // 尝试连接到端口，如果连接成功说明端口被占用
    match std::net::TcpStream::connect_timeout(
        &format!("127.0.0.1:{}", port).parse().unwrap(),
        std::time::Duration::from_millis(100),
    ) {
        Ok(_) => true,   // 连接成功，端口被占用
        Err(_) => false, // 连接失败，端口未被占用
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MiniserveServiceResult {
    pub success: bool,
    pub message: String,
    pub port: Option<u16>,
}

#[tauri::command]
pub async fn start_miniserve_service(
    port: u16,
    directory: String,
) -> Result<MiniserveServiceResult, String> {
    // 验证端口范围
    if port < 1024 {
        return Ok(MiniserveServiceResult {
            success: false,
            message: "端口号必须在1024-65535之间".to_string(),
            port: Some(port),
        });
    }

    // 检查端口是否被占用
    if !is_port_available(port) {
        return Ok(MiniserveServiceResult {
            success: false,
            message: format!("端口{}已被占用，请选择其他端口", port),
            port: Some(port),
        });
    }

    // 获取miniserve可执行文件路径
    let exe_path = get_miniserve_exe_path();

    if !exe_path.exists() {
        return Ok(MiniserveServiceResult {
            success: false,
            message: "miniserve可执行文件不存在，请先下载".to_string(),
            port: Some(port),
        });
    }

    // 停止已存在的服务
    let _ = stop_miniserve_service(port).await;

    // 启动miniserve服务
    let mut command = Command::new(&exe_path);
    command
        .arg("--port")
        .arg(port.to_string())
        .arg("--interfaces")
        .arg("0.0.0.0")
        .arg(&directory);

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    match command.spawn() {
        Ok(child) => {
            // 存储进程
            {
                let mut processes = MINISERVE_PROCESSES.lock().unwrap();
                processes.insert(port, child);
            }

            // 等待服务启动并进行多次检查
            let mut attempts = 0;
            let max_attempts = 10;
            let mut service_started = false;

            while attempts < max_attempts {
                tokio::time::sleep(Duration::from_millis(200)).await;
                if is_port_occupied(port) {
                    service_started = true;
                    break;
                }
                attempts += 1;
            }

            if service_started {
                Ok(MiniserveServiceResult {
                    success: true,
                    message: format!("miniserve服务启动成功，访问地址: http://localhost:{}", port),
                    port: Some(port),
                })
            } else {
                // 如果端口仍然可用，说明服务启动失败，清理进程记录
                {
                    let mut processes = MINISERVE_PROCESSES.lock().unwrap();
                    processes.remove(&port);
                }
                Ok(MiniserveServiceResult {
                    success: false,
                    message: "miniserve服务启动失败，请检查目录路径是否正确".to_string(),
                    port: Some(port),
                })
            }
        }
        Err(e) => Ok(MiniserveServiceResult {
            success: false,
            message: format!("启动miniserve服务失败: {}", e),
            port: Some(port),
        }),
    }
}

#[tauri::command]
pub async fn stop_miniserve_service(port: u16) -> Result<MiniserveServiceResult, String> {
    // 尝试停止存储的进程
    {
        let mut processes = MINISERVE_PROCESSES.lock().unwrap();
        if let Some(mut child) = processes.remove(&port) {
            let _ = child.kill();
            let _ = child.wait();
        }
    }

    // 等待一段时间后检查端口是否释放
    tokio::time::sleep(Duration::from_millis(500)).await;

    if is_port_available(port) {
        Ok(MiniserveServiceResult {
            success: true,
            message: "miniserve服务已停止".to_string(),
            port: Some(port),
        })
    } else {
        // 如果端口仍被占用，尝试通过端口查找并停止特定进程
        let kill_result = if cfg!(target_os = "windows") {
            // 在Windows上，使用netstat查找占用端口的进程ID，然后停止该进程
            let netstat_output = Command::new("netstat").args(["-ano"]).output();

            match netstat_output {
                Ok(output) => {
                    let output_str = String::from_utf8_lossy(&output.stdout);
                    let port_str = format!(":{}", port);

                    // 查找占用指定端口的进程ID
                    for line in output_str.lines() {
                        if line.contains(&port_str) && line.contains("LISTENING") {
                            let parts: Vec<&str> = line.split_whitespace().collect();
                            if let Some(pid_str) = parts.last() {
                                if let Ok(_pid) = pid_str.parse::<u32>() {
                                    // 使用PID停止特定进程
                                    return match Command::new("taskkill")
                                        .args(["/PID", pid_str, "/F"])
                                        .output()
                                    {
                                        Ok(_) => {
                                            tokio::time::sleep(Duration::from_millis(500)).await;
                                            if is_port_available(port) {
                                                Ok(MiniserveServiceResult {
                                                    success: true,
                                                    message: "miniserve服务已强制停止".to_string(),
                                                    port: Some(port),
                                                })
                                            } else {
                                                Ok(MiniserveServiceResult {
                                                    success: false,
                                                    message: "无法停止miniserve服务，端口仍被占用"
                                                        .to_string(),
                                                    port: Some(port),
                                                })
                                            }
                                        }
                                        Err(e) => Ok(MiniserveServiceResult {
                                            success: false,
                                            message: format!("停止进程失败: {}", e),
                                            port: Some(port),
                                        }),
                                    };
                                }
                            }
                            break;
                        }
                    }
                    Err(std::io::Error::new(
                        std::io::ErrorKind::NotFound,
                        "未找到占用端口的进程",
                    ))
                }
                Err(e) => Err(e),
            }
        } else {
            // 在Linux/macOS上，使用lsof查找占用端口的进程
            Command::new("lsof")
                .args(["-ti", &format!(":{}", port)])
                .output()
                .and_then(|output| {
                    let pid_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    if !pid_str.is_empty() {
                        Command::new("kill").args(["-9", &pid_str]).output()
                    } else {
                        Err(std::io::Error::new(
                            std::io::ErrorKind::NotFound,
                            "未找到占用端口的进程",
                        ))
                    }
                })
        };

        match kill_result {
            Ok(_) => {
                tokio::time::sleep(Duration::from_millis(500)).await;
                if is_port_available(port) {
                    Ok(MiniserveServiceResult {
                        success: true,
                        message: "miniserve服务已强制停止".to_string(),
                        port: Some(port),
                    })
                } else {
                    Ok(MiniserveServiceResult {
                        success: false,
                        message: "无法停止miniserve服务，端口仍被占用".to_string(),
                        port: Some(port),
                    })
                }
            }
            Err(e) => Ok(MiniserveServiceResult {
                success: false,
                message: format!("停止miniserve服务失败: {}", e),
                port: Some(port),
            }),
        }
    }
}

#[tauri::command]
pub async fn check_miniserve_service_status(port: u16) -> Result<MiniserveServiceResult, String> {
    let is_running = is_port_occupied(port);

    Ok(MiniserveServiceResult {
        success: is_running,
        message: if is_running {
            format!("miniserve服务正在运行，端口: {}", port)
        } else {
            "miniserve服务未运行".to_string()
        },
        port: Some(port),
    })
}

#[derive(Debug, Serialize, Deserialize, Clone, Hash, PartialEq, Eq)]
pub struct GithubLatestReleaseInfo {
    pub tag_name: Option<String>,
    pub body: Option<String>,
}

#[tauri::command]
pub async fn github_repos_info_version(
    owner: String,
    repo: String,
) -> Option<GithubLatestReleaseInfo> {
    let url = format!(
        "https://api.github.com/repos/{}/{}/releases/latest",
        owner, repo
    );
    let mut client_builder = create_request_builder();
    let mut headers: HeaderMap = HeaderMap::new();
    headers.insert(
        USER_AGENT,
        serde_json::to_value(choose_user_agent("pc"))
            .unwrap()
            .as_str()
            .unwrap()
            .parse()
            .unwrap(),
    );
    client_builder = client_builder.default_headers(headers);
    let client = client_builder.build().unwrap();
    let response = client.get(url).send().await.unwrap();
    match response.text().await {
        Ok(d) => {
            let dd = serde_json::from_str(&d);
            if dd.is_ok() {
                let data: Map<String, Value> = dd.unwrap();
                if let Some(v) = data.get("tag_name") {
                    match v {
                        Value::String(tag_name) => Some(GithubLatestReleaseInfo {
                            tag_name: Some(tag_name.to_owned()),
                            body: Some(data.get("body").unwrap().to_owned().to_string()),
                        }),
                        _ => None,
                    }
                } else {
                    None
                }
            } else {
                None
            }
        }
        Err(_r) => None,
    }
}

#[tauri::command]
pub fn get_local_ip() -> Result<String, String> {
    // 尝试连接到一个外部地址来获取本机IP
    // 这里使用Google的DNS服务器8.8.8.8:80
    match UdpSocket::bind("0.0.0.0:0") {
        Ok(socket) => match socket.connect("8.8.8.8:80") {
            Ok(_) => match socket.local_addr() {
                Ok(addr) => Ok(addr.ip().to_string()),
                Err(e) => Err(format!("获取本地地址失败: {}", e)),
            },
            Err(e) => Err(format!("连接失败: {}", e)),
        },
        Err(e) => Err(format!("创建socket失败: {}", e)),
    }
}
