use diesel::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(
    Debug, Serialize, Deserialize, Clone, Queryable, Selectable, QueryableByName, Insertable,
)]
#[diesel(table_name = crate::schema::site)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct Site {
    pub id: String,
    pub site_key: String,
    pub site_name: String,
    pub api: String,
    pub site_group: String,
    pub is_active: String,
    pub status: String,
    pub position: Option<f64>,
    pub is_reverse_order: String,
    pub parse_mode: Option<String>,
    pub create_time: String,
    pub update_time: Option<String>,
}

#[allow(non_snake_case)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SiteSave {
    pub site_key: String,
    pub site_name: String,
    pub api: String,
    pub site_group: String,
    pub is_active: String,
    pub status: String,
    pub position: Option<f64>,
    pub is_reverse_order: String,
    pub parse_mode: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SiteUpdate {
    pub id: String,
    pub site_key: String,
    pub site_name: String,
    pub api: String,
    pub site_group: String,
    pub is_active: String,
    pub status: String,
    pub position: Option<f64>,
    pub is_reverse_order: String,
    pub parse_mode: Option<String>,
}

#[derive(
    Debug, Serialize, Deserialize, Clone, Queryable, Selectable, QueryableByName, Insertable
)]
#[diesel(table_name = crate::schema::site_class)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct SiteClass {
    pub id: String,
    pub class_id: String,
    pub site_key: String,
    pub class_name: String,
    pub create_time: String,
    pub update_time: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SiteClassSave {
    pub class_id: String,
    pub site_key: String,
    pub class_name: String,
}
