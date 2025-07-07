use crate::orm::get_database_pool;
use crate::schema::download_info::dsl as download_info_dsl;
use crate::utils;
use crate::{
    conf::get_string,
    orm::download_info::types::{DownloadInfo, DownloadInfoUpdate},
};
use diesel::{ExpressionMethods, RunQueryDsl};

pub fn update_download_by_id(download_info_update: DownloadInfoUpdate) -> anyhow::Result<usize> {
    let mut db = get_database_pool()?;
    let now = utils::get_current_time_str();
    let rows_affected = diesel::update(download_info_dsl::download_info)
        .filter(download_info_dsl::id.eq(&download_info_update.id))
        .set((
            download_info_update
                .status
                .map(|status| download_info_dsl::status.eq(status)),
            download_info_update
                .download_count
                .map(|download_count| download_info_dsl::download_count.eq(download_count)),
            download_info_update
                .count
                .map(|count| download_info_dsl::count.eq(count)),
            download_info_update
                .download_status
                .map(|download_status| download_info_dsl::download_status.eq(download_status)),
            download_info_dsl::update_time.eq(&now),
        ))
        .execute(&mut db)?;
    Ok(rows_affected)
}

pub fn get_download_save_path(download_info: &DownloadInfo) -> Option<String> {
    let sub_title_name = &download_info.sub_title_name;
    let download_save_path = get_string("downloadSavePath");
    if !download_save_path.is_empty() {
        let url = format!(
            "{}\\{}\\{}\\{}.mp4",
            download_save_path, download_info.movie_name, sub_title_name, sub_title_name
        );
        return Some(url);
    }
    None
}

pub fn get_download_save_folder(download_info: &DownloadInfo) -> Option<String> {
    let sub_title_name = &download_info.sub_title_name;
    let download_save_path = get_string("downloadSavePath");
    if !download_save_path.is_empty() {
        let url = format!(
            "{}\\{}\\{}",
            download_save_path, download_info.movie_name, sub_title_name
        );
        return Some(url);
    }
    None
}
