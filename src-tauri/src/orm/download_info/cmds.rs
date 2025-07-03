use crate::download::file_download::service::retry_download;
use crate::orm::download_info::service::get_download_save_folder;
use crate::orm::download_info::service::get_download_save_path;
use crate::orm::download_info::types::DownloadInfo;

use crate::orm::download_info::types::DownloadInfoSave;
use crate::orm::get_database_pool;
use crate::schema::download_info::dsl as download_info_dsl;
use crate::utils;
use diesel::ExpressionMethods;
use diesel::QueryDsl;
use diesel::RunQueryDsl;
use diesel::OptionalExtension;

#[tauri::command]
pub fn select_all_download_info(
) -> Result<Vec<DownloadInfo>, String> {

    let mut db = get_database_pool()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    let download_info = download_info_dsl::download_info
        .order_by(download_info_dsl::update_time.desc())
        .load::<DownloadInfo>(&mut db)
        .map_err(|e| format!("查询下载记录失败: {}", e))?;
    Ok(download_info)
}

#[tauri::command]
pub fn get_download_info_by_id(id: &str) -> Result<DownloadInfo, String> {
    let mut db = get_database_pool()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;
    let mut download_info = download_info_dsl::download_info
        .filter(download_info_dsl::id.eq(id))
        .first::<DownloadInfo>(&mut db)
        .map_err(|e| format!("查询下载信息失败: {}", e))?;
    if let Some(url) = get_download_save_path(&download_info) {
        download_info.url = url;
    }
    Ok(download_info)
}

#[tauri::command]
pub fn save_download_info(download_infos: Vec<DownloadInfoSave>) -> Result<(), String> {
    let mut db = get_database_pool()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;
    let now = utils::get_current_time_str();
    let download_info_list = download_infos.into_iter().map(|download_info| DownloadInfo {
        id: utils::uuid(),
        movie_name: download_info.movie_name,
        url: download_info.url,
        sub_title_name: download_info.sub_title_name,
        status: download_info.status,
        download_count: download_info.download_count,
        count: download_info.count,
        download_status: download_info.download_status,
        create_time: now.clone(),
        update_time: Some(now.clone()),
    }).collect::<Vec<DownloadInfo>>();
    diesel::insert_into(download_info_dsl::download_info)
        .values(&download_info_list)
        .execute(&mut db)
        .map_err(|e| format!("保存下载信息失败: {}", e))?;
    download_info_list.iter().for_each(|download_info| {
        retry_download(download_info.clone());
    });
    Ok(())
}

#[tauri::command]
pub fn delete_download_info(
    id: &str,
) -> Result<Option<DownloadInfo>, String> {
    let mut db = get_database_pool()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    // 先查询要删除的数据
    let download_info = download_info_dsl::download_info
        .filter(download_info_dsl::id.eq(id))
        .first::<DownloadInfo>(&mut db)
        .optional()
        .map_err(|e| format!("查询下载信息失败: {}", e))?;

    if let Some(info) = download_info.clone() {
        if let Some(folder) = get_download_save_folder(&info) {
            utils::del_movie_path(folder);
        }
        // 删除数据
        diesel::delete(download_info_dsl::download_info)
            .filter(download_info_dsl::id.eq(id))
            .execute(&mut db)
            .map_err(|e| format!("删除下载信息失败: {}", e))?;

        Ok(Some(info))
    } else {
        Ok(None)
    }
}
