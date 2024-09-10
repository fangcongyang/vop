use std::{
    path::{ Path, PathBuf },
    fs::{ self, read_to_string, File},
    env
};

use anyhow::Result;

pub fn app_install_root() -> PathBuf {
    env::current_exe().expect("failed to get current exe path")
}

pub fn read_init_data_file(data_name: &str) -> String {
    let mut path = app_install_root();
    path.pop();
    path = path.join("initData").join(data_name);
    if !exists(&path) {
        return "[]".to_string();
    }
    let contents = read_to_string(path)
    .expect("Should have been able to read the file");
    contents
}

pub fn exists(path: &Path) -> bool {
    Path::new(path).exists()
}

pub fn is_empty(path: &Path) -> bool {
    Path::new(path).read_dir().unwrap().next().is_none()
}

pub fn create_file(path: &Path) -> Result<File> {
    if let Some(p) = path.parent() {
      fs::create_dir_all(p)?
    }
    File::create(path).map_err(Into::into)
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

pub mod cmd {
    use super::*;
    use log::error;
    use tauri::command;
    use serde::{Serialize, Deserialize};
    use url::Url;
    use std::process::Command;

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
    pub fn del_movie_path(path_str: String) {
        let mut path = PathBuf::new();
        path.push(&path_str);
        if exists(&path) {
            fs::remove_dir_all(path.clone()).unwrap_or_else(|err| {
                error!("删除失败: {}", err);
            });
        }

        // 如果父文件空则删除件
        path.pop();
        if is_empty(&path) {
            fs::remove_dir_all(path).unwrap_or_else(|err| {
                error!("删除失败: {}", err);
            });
        }
    }

    #[command]
    pub async fn calculate_ping_latency(host: String) -> Result<f64, String> {
        // 构建 ping 命令
        let issue_list_url = Url::parse(&host).map_err(|e| format!("URL 解析失败: {}", e))?;
        
        let output = Command::new("ping")
            .args([
                "-n",
                "3",
                "-w",
                "3",
                issue_list_url.host_str().unwrap()
            ])
            .env("LANG", "C") 
            .env("chcp", "437")
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
    
    fn extract_latency(output: &str) -> Result<f64, String> {
        // 使用正则表达式提取丢包数
        let lose_time_re = regex::Regex::new(r"丢失 = (\d+)").map_err(|e| format!("正则表达式编译失败: {}", e))?;
        // 使用正则表达式提取平均时间
        let waste_time_re = regex::Regex::new(r"平均 = (\d+)ms").map_err(|e| format!("正则表达式编译失败: {}", e))?;
        // 匹配丢包数
        let lose_time: Vec<_> = lose_time_re.captures_iter(output).collect();
        // 当匹配到丢失包信息失败,默认为三次请求全部丢包,丢包数lose赋值为3
        let lose = if lose_time.is_empty() {
            3
        } else {
            lose_time[0][1].parse::<i32>().map_err(|e| format!("解析丢包数失败: {}", e))?
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
            let average_time = average[0][1].parse::<f64>().map_err(|e| format!("解析平均耗时失败: {}", e))?;
            // 返回平均耗时
            Ok(average_time)
        }
    }
}