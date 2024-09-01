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
}