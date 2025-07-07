use diesel::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(
    Debug, Serialize, Deserialize, Clone, Queryable, Selectable, QueryableByName, Insertable,
)]
#[diesel(table_name = crate::schema::star)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct Star {
    pub id: String,
    pub star_name: String,
    pub ids: String,
    pub site_key: String,
    pub movie_type: Option<String>,
    pub year: String,
    pub note: Option<String>,
    pub douban_rate: Option<String>,
    pub has_update: String,
    pub last_update_time: Option<String>,
    pub position: f64,
    pub pic: String,
    pub area: Option<String>,
    pub create_time: String,
    pub update_time: Option<String>,
}

#[allow(non_snake_case)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StarSave {
    pub star_name: String,
    pub ids: String,
    pub site_key: String,
    pub movie_type: Option<String>,
    pub year: String,
    pub note: Option<String>,
    pub douban_rate: Option<String>,
    pub has_update: String,
    pub last_update_time: Option<String>,
    pub pic: String,
    pub area: Option<String>,
}
