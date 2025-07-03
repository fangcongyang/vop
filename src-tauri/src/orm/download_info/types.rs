use serde::{Deserialize, Serialize};
use diesel::prelude::*;

#[derive(
    Debug, Serialize, Deserialize, Clone, Queryable, Selectable, QueryableByName, Insertable,
)]
#[diesel(table_name = crate::schema::download_info)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct DownloadInfo {
    pub id: String,
    pub movie_name: String,
    pub url: String,
    pub sub_title_name: String,
    pub status: String,
    pub download_count: i32,
    pub count: i32,
    pub download_status: String,
    pub create_time: String,
    pub update_time: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DownloadInfoSave {
    pub movie_name: String,
    pub url: String,
    pub sub_title_name: String,
    pub status: String,
    pub download_count: i32,
    pub count: i32,
    pub download_status: String,
}

#[derive(Default, Debug, Serialize, Deserialize, Clone)]
pub struct DownloadInfoUpdate {
    pub id: String,
    pub status: Option<String>,
    pub download_count: Option<i32>,
    pub count: Option<i32>,
    pub download_status: Option<String>,
}
