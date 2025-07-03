use std::{
    env,
    fs::{self, read_to_string, File},
    path::{Path, PathBuf},
};
use log::error;

use anyhow::Result;
use chrono::Local;
use rand::Rng;
use tauri_plugin_http::reqwest::{self, ClientBuilder};
use tokio;
use uuid::Uuid;

use crate::conf::get_string;

const USER_AGENT_LIST: [&str; 14] = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1",
    "Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 5.1.1; Nexus 6 Build/LYZ28E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_2 like Mac OS X) AppleWebKit/603.2.4 (KHTML, like Gecko) Mobile/14F89;GameHelper",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 10_0 like Mac OS X) AppleWebKit/602.1.38 (KHTML, like Gecko) Version/10.0 Mobile/14A300 Safari/602.1",
    "Mozilla/5.0 (iPad; CPU OS 10_0 like Mac OS X) AppleWebKit/602.1.38 (KHTML, like Gecko) Version/10.0 Mobile/14A300 Safari/602.1",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:46.0) Gecko/20100101 Firefox/46.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/603.2.4 (KHTML, like Gecko) Version/10.1.1 Safari/603.2.4",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:46.0) Gecko/20100101 Firefox/46.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/13.1058",
];

pub fn app_install_root() -> PathBuf {
    let mut path = env::current_exe().expect("failed to get current exe path");
    path.pop();
    path
}

pub fn read_init_data_file(data_name: &str) -> String {
    let mut path = app_install_root();
    path.pop();
    path = path.join("initData").join(data_name);
    if !exists(&path) {
        return "[]".to_string();
    }
    let contents = read_to_string(path).expect("Should have been able to read the file");
    contents
}

pub fn exists(path: &Path) -> bool {
    Path::new(path).exists()
}

pub fn is_empty_safe(path: &Path) -> bool {
    match Path::new(path).read_dir() {
        Ok(mut entries) => entries.next().is_none(),
        Err(_) => false, // 如果无法读取目录，认为不为空（或不存在）
    }
}

pub fn create_file(path: &Path) -> Result<File> {
    if let Some(p) = path.parent() {
        fs::create_dir_all(p)?
    }
    File::create(path).map_err(Into::into)
}

pub fn create_dir_if_not_exists(path: &Path) -> Result<()> {
    if let Some(p) = path.parent() {
        fs::create_dir_all(p)?
    }
    Ok(())
}

pub async fn async_create_file(path: &Path) -> Result<tokio::fs::File> {
    if let Some(p) = path.parent() {
        tokio::fs::create_dir_all(p).await?;
    }
    if path.exists() {
        tokio::fs::remove_file(path).await?;
    }
    tokio::fs::File::create(path).await.map_err(Into::into)
}

#[cfg(not(target_os = "windows"))]
pub fn get_path_name<P: AsRef<Path>>(p: P) -> String {
    p.as_ref().display().to_string()
}

#[cfg(target_os = "windows")]
pub fn get_path_name<P: AsRef<Path>>(p: P) -> String {
    const VERBATIM_PREFIX: &str = r#"\\?\"#;
    let p = p.as_ref().display().to_string();
    if p.starts_with(VERBATIM_PREFIX) {
        p[VERBATIM_PREFIX.len()..].to_string().replace("\\", "/")
    } else {
        p.replace("\\", "/")
    }
}

pub fn create_request_builder() -> ClientBuilder {
    let client_builder = ClientBuilder::new();
    if get_string("proxyProtocol") == "noProxy" || get_string("proxyProtocol") == "" {
        client_builder.no_proxy()
    } else {
        let proxy_url = format!(
            "{}://{}:{}",
            get_string("proxyProtocol"),
            get_string("proxyServer"),
            get_string("proxyPort")
        );
        client_builder.proxy(reqwest::Proxy::http(proxy_url).unwrap())
    }
}

pub fn choose_user_agent(ua: &str) -> &str {
    let mut rng = rand::rng();
    let i: usize = rng.random_range(0..usize::MAX);
    let index = if ua == "mobile" {
        i % 7
    } else if ua == "pc" {
        i % 5 + 8
    } else if ua.is_empty() {
        i % USER_AGENT_LIST.len()
    } else {
        return ua;
    };
    USER_AGENT_LIST[index]
}

pub fn get_current_time_str() -> String {
    let now = Local::now(); // 当前本地时间
    let formatted = now.format("%Y-%m-%d %H:%M:%S").to_string();
    formatted
}

pub fn uuid() -> String {
    let id = Uuid::new_v4();
    id.to_string().replace("-", "")
}

pub fn parse_json<T: for<'a> serde::Deserialize<'a>>(json_str: Option<String>) -> Option<T> {
    match json_str {
        Some(json) => serde_json::from_str::<T>(&json).ok(),
        _none => None,
    }
}

pub fn del_movie_path(path_str: String) {
    let mut path = PathBuf::new();
    path.push(&path_str);
    if exists(&path) {
        fs::remove_dir_all(path.clone()).unwrap_or_else(|err| {
            error!("删除失败: {}", err);
        });
    }

    // 如果父文件夹存在且为空则删除
    path.pop();
    if exists(&path) && is_empty_safe(&path) {
        fs::remove_dir_all(path).unwrap_or_else(|err| {
            error!("删除父目录失败: {}", err);
        });
    }
}

pub mod cmd {
    use super::*;
    use serde::{Deserialize, Serialize};
    use std::process::Command;
    use tauri::command;
    use url::Url;

    #[derive(Debug, Serialize, Deserialize, Clone)]
    pub struct Site {
        id: Option<i32>,
        site_key: String,
        site_name: String,
        api: String,
        site_group: String,
        is_active: String,
        status: String,
        position: Option<f64>,
        is_reverse_order: String,
        parse_mode: Option<String>,
    }

    #[command]
    pub fn get_init_site_data() -> Vec<Site> {
        let sites_str = read_init_data_file("sites.json");
        let mut sites: Vec<Site> = serde_json::from_str(&sites_str).unwrap();
        let sites_18_str = read_init_data_file("18+sites.json");
        let sites_18: Vec<Site> = serde_json::from_str(&sites_18_str).unwrap();
        sites.extend(sites_18);
        let mut position_num = 20.0;
        sites.iter_mut().for_each(|site| {
            site.position = Some(position_num);
            position_num += 20.0;
        });

        sites
    }

    #[command]
    pub async fn calculate_ping_latency(host: String) -> Result<f64, String> {
        // 构建 ping 命令
        let issue_list_url = Url::parse(&host).map_err(|e| format!("URL 解析失败: {}", e))?;
        let host_str = issue_list_url.host_str().unwrap().to_string();

        // 使用 tokio::spawn 创建一个真正的后台任务
        let handle = tokio::spawn(async move {
            // 在新的任务中执行 ping 命令
            #[cfg(target_os = "windows")]
            {
                use std::os::windows::process::CommandExt;

                let output = Command::new("ping")
                    .args(["-n", "3", "-w", "3", &host_str])
                    .env("LANG", "C")
                    .env("chcp", "437")
                    .creation_flags(0x08000000) // 添加CREATE_NO_WINDOW标志，防止弹出cmd窗口
                    .output()
                    .map_err(|e| format!("执行 ping 命令失败: {}", e))?;

                if output.status.success() {
                    // 解析 ping 命令的输出
                    let output_str = encoding_rs::GBK.decode(&output.stdout).0;
                    extract_latency(&output_str)
                } else {
                    Err(format!(
                        "ping 命令失败: {}",
                        String::from_utf8_lossy(&output.stderr)
                    ))
                }
            }

            #[cfg(not(target_os = "windows"))]
            {
                let output = Command::new("ping")
                    .args(["-c", "3", "-W", "3", &host_str])
                    .output()
                    .map_err(|e| format!("执行 ping 命令失败: {}", e))?;

                if output.status.success() {
                    // 解析 ping 命令的输出
                    let output_str = encoding_rs::GBK.decode(&output.stdout).0;
                    extract_latency(&output_str)
                } else {
                    Err(format!(
                        "ping 命令失败: {}",
                        String::from_utf8_lossy(&output.stderr)
                    ))
                }
            }
        });

        // 等待后台任务完成并获取结果
        match handle.await {
            Ok(result) => result,
            Err(e) => Err(format!("后台任务执行失败: {}", e)),
        }
    }

    fn extract_latency(output: &str) -> Result<f64, String> {
        #[cfg(target_os = "windows")]
        {
            // 使用正则表达式提取丢包数
            let lose_time_re = regex::Regex::new(r"丢失 = (\d+)")
                .map_err(|e| format!("正则表达式编译失败: {}", e))?;
            // 使用正则表达式提取平均时间
            let waste_time_re = regex::Regex::new(r"平均 = (\d+)ms")
                .map_err(|e| format!("正则表达式编译失败: {}", e))?;
            // 匹配丢包数
            let lose_time: Vec<_> = lose_time_re.captures_iter(output).collect();
            // 当匹配到丢失包信息失败,默认为三次请求全部丢包,丢包数lose赋值为3
            let lose = if lose_time.is_empty() {
                3
            } else {
                lose_time[0][1]
                    .parse::<i32>()
                    .map_err(|e| format!("解析丢包数失败: {}", e))?
            };

            // 如果丢包数目大于2个,则认为连接超时,返回平均耗时1000ms
            if lose > 2 {
                return Ok(1000.0);
            }

            // 如果丢包数目小于等于2个,获取平均耗时的时间
            let average: Vec<_> = waste_time_re.captures_iter(output).collect();
            // 当匹配耗时时间信息失败,默认三次请求严重超时,返回平均耗时1000ms
            if average.is_empty() {
                Ok(1000.0)
            } else {
                let average_time = average[0][1]
                    .parse::<f64>()
                    .map_err(|e| format!("解析平均耗时失败: {}", e))?;
                // 返回平均耗时
                Ok(average_time)
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            // 使用正则表达式提取丢包数
            let lose_time_re = regex::Regex::new(r"(\d+)% packet loss")
                .map_err(|e| format!("正则表达式编译失败: {}", e))?;
            // 使用正则表达式提取平均时间
            let waste_time_re = regex::Regex::new(r"avg = [\d\.]+/(\d+\.?\d*)/[\d\.]+")
                .map_err(|e| format!("正则表达式编译失败: {}", e))?;
            // 匹配丢包数
            let lose_time: Vec<_> = lose_time_re.captures_iter(output).collect();
            // 当匹配到丢失包信息失败,默认为三次请求全部丢包,丢包数lose赋值为3
            let lose = if lose_time.is_empty() {
                3
            } else {
                let loss_percentage = lose_time[0][1]
                    .parse::<i32>()
                    .map_err(|e| format!("解析丢包率失败: {}", e))?;
                if loss_percentage >= 100 {
                    3
                } else {
                    (3 * loss_percentage) / 100
                }
            };

            // 如果丢包数目大于2个,则认为连接超时,返回平均耗时1000ms
            if lose > 2 {
                return Ok(1000.0);
            }

            // 如果丢包数目小于等于2个,获取平均耗时的时间
            let average: Vec<_> = waste_time_re.captures_iter(output).collect();
            // 当匹配耗时时间信息失败,默认三次请求严重超时,返回平均耗时1000ms
            if average.is_empty() {
                Ok(1000.0)
            } else {
                let average_time = average[0][1]
                    .parse::<f64>()
                    .map_err(|e| format!("解析平均耗时失败: {}", e))?;
                // 返回平均耗时
                Ok(average_time)
            }
        }
    }
}
