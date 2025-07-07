use crate::orm::get_database_pool;
use crate::orm::history::types::History;
use crate::schema::history::dsl as history_dsl;
use diesel::ExpressionMethods;
use diesel::QueryDsl;
use diesel::RunQueryDsl;

pub fn get_history_by_site_key_and_ids(site_key: &str, ids: &str) -> Result<History, String> {
    let mut db = get_database_pool().map_err(|e| format!("获取数据库连接失败: {}", e))?;
    let history = history_dsl::history
        .filter(history_dsl::site_key.eq(site_key))
        .filter(history_dsl::ids.eq(ids))
        .first::<History>(&mut db)
        .map_err(|e| format!("获取历史记录失败: {}", e))?;
    Ok(history)
}

pub fn select_all_historys() -> Result<Vec<History>, String> {
    let mut db = get_database_pool().map_err(|e| format!("获取数据库连接失败: {}", e))?;
    let history = history_dsl::history
        .order_by(history_dsl::update_time.desc())
        .load::<History>(&mut db)
        .map_err(|e| format!("获取历史记录失败: {}", e))?;
    Ok(history)
}
