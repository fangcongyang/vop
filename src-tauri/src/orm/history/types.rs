use serde::{Deserialize, Serialize};
use diesel::prelude::*;

#[derive(
    Debug, Serialize, Deserialize, Clone, Queryable, Selectable, QueryableByName, Insertable,
)]
#[diesel(table_name = crate::schema::history)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct History {
    pub id: String,
    pub history_name: String,
    pub ids: String,
    pub index: i32,
    pub start_position: i32,
    pub end_position: i32,
    pub play_time: f64,
    pub site_key: String,
    pub online_play: Option<String>,
    pub detail: String,
    pub video_flag: Option<String>,
    pub duration: f64,
    pub has_update: String,
    pub create_time: String,
    pub update_time: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HistoryVo {
    pub id: String,
    pub history_name: String,
    pub ids: String,
    pub index: i32,
    pub start_position: i32,
    pub end_position: i32,
    pub play_time: f64,
    pub site_key: String,
    pub online_play: Option<String>,
    pub detail: Option<serde_json::Value>,
    pub video_flag: Option<String>,
    pub duration: f64,
    pub has_update: String,
    pub create_time: String,
    pub update_time: Option<String>,
}

#[allow(non_snake_case)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HistorySave {
    pub history_name: String,
    pub ids: String,
    pub index: i32,
    pub start_position: i32,
    pub end_position: i32,
    pub play_time: f64,
    pub site_key: String,
    pub online_play: Option<String>,
    pub detail: String,
    pub video_flag: Option<String>,
    pub duration: f64,
    pub has_update: String,
}

#[allow(non_snake_case)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HistoryUpdate {
    pub id: String,
    pub index: Option<i32>,
    pub startPosition: i32,
    pub endPosition: i32,
    pub playTime: Option<f64>,
    pub onlinePlay: Option<String>,
    pub duration: Option<f64>,
    pub hasUpdate: Option<String>,
}
