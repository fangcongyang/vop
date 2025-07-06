use diesel::QueryDsl;
use diesel::ExpressionMethods;
use diesel::RunQueryDsl;
use diesel::OptionalExtension;

use crate::{orm::{get_database_pool, star::types::Star}, schema::star::dsl as star_dsl};

pub fn get_star_by_unique_key(
    site_key: &str,
    ids: &str,
) -> Result<Option<Star>, String> {
    let mut db = get_database_pool()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    let star = star_dsl::star
        .filter(star_dsl::site_key.eq(site_key))
        .filter(star_dsl::ids.eq(ids))
        .first::<Star>(&mut db)
        .optional()
        .map_err(|e| format!("查询收藏记录失败: {}", e))?;
    Ok(star)
}

pub fn get_all_stars() -> Result<Vec<Star>, String> {
    let mut db = get_database_pool()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;
    let star = star_dsl::star
        .order_by(star_dsl::update_time.desc())
        .load::<Star>(&mut db)
        .map_err(|e| format!("获取收藏记录失败: {}", e))?;
    Ok(star)
}
