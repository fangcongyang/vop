use diesel::RunQueryDsl;
use diesel::ExpressionMethods;
use diesel::QueryDsl;
use diesel::OptionalExtension;

use crate::orm::{get_database_pool, site::types::Site};
use crate::schema::site::dsl as site_dsl;

pub fn get_site_by_key(site_key: &str) -> Result<Option<Site>, String> {
    let mut db = get_database_pool().map_err(|e| format!("获取数据库连接失败: {}", e))?;
    let site = site_dsl::site
        .filter(site_dsl::site_key.eq(site_key))
        .first::<Site>(&mut db)
        .optional()
        .map_err(|e| format!("获取站点失败: {}", e))?;
    Ok(site)
}

pub fn get_all_sites() -> Result<Vec<Site>, String> {
    let mut db = get_database_pool().map_err(|e| format!("获取数据库连接失败: {}", e))?;
    let sites = site_dsl::site
        .load::<Site>(&mut db)
        .map_err(|e| format!("获取站点列表失败: {}", e))?;
    Ok(sites)
}
