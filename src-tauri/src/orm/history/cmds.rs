use crate::orm::history::service::get_history_by_site_key_and_ids;
use crate::orm::history::types::{History, HistoryUpdate};
use crate::orm::{get_database_pool, history::types::HistorySave};
use crate::schema::history::dsl as history_dsl;
use diesel::RunQueryDsl;
use diesel::ExpressionMethods;
use diesel::insert_into;
use crate::utils;

#[tauri::command]
pub fn get_current_history_or_save(
    data: HistorySave,
) -> Result<History, String> {
    if let Ok(history) = get_history_by_site_key_and_ids(&data.site_key, &data.ids) {
        return Ok(history);
    }
    let mut db = get_database_pool()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;
    
    let now = utils::get_current_time_str();
    let id_local = utils::uuid();
    
    // 使用 ON CONFLICT 进行 UPSERT 操作
    let history = insert_into(history_dsl::history)
        .values((
            history_dsl::id.eq(id_local),
            history_dsl::history_name.eq(&data.history_name),
            history_dsl::ids.eq(&data.ids),
            history_dsl::index.eq(data.index),
            history_dsl::start_position.eq(data.start_position),
            history_dsl::end_position.eq(data.end_position),
            history_dsl::play_time.eq(data.play_time),
            history_dsl::site_key.eq(&data.site_key),
            history_dsl::online_play.eq(&data.online_play),
            history_dsl::detail.eq(&data.detail),
            history_dsl::video_flag.eq(&data.video_flag),
            history_dsl::duration.eq(data.duration),
            history_dsl::has_update.eq(&data.has_update),
            history_dsl::create_time.eq(&now),
            history_dsl::update_time.eq(&now),
        ))
        .on_conflict((history_dsl::site_key, history_dsl::ids))
        .do_nothing()
        .get_result::<History>(&mut db)
        .map_err(|e| format!("保存历史记录失败: {}", e))?;
    
    Ok(history)
}

#[tauri::command]
pub fn get_current_history(
    site_key: &str,
    ids: &str,
) -> Option<History> {
    if let Ok(history) = get_history_by_site_key_and_ids(site_key, ids) {
        return Some(history);
    }
    None
}

#[tauri::command]
pub fn select_all_history(
) -> Result<Vec<History>, String> {
    let mut db = get_database_pool()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;
    
    let history = history_dsl::history
        .load::<History>(&mut db)
        .map_err(|e| format!("查询历史记录失败: {}", e))?;
    Ok(history)
}

#[tauri::command]
pub fn update_history(
    data: HistoryUpdate,
) -> Result<usize, String> {
    let mut db = get_database_pool()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;
    
    let now = utils::get_current_time_str();
    let rows_affected = diesel::update(history_dsl::history)
        .filter(history_dsl::id.eq(&data.id))
        .set((
            data.index.map(|d| history_dsl::index.eq(d)),
            history_dsl::start_position.eq(data.startPosition),
            history_dsl::end_position.eq(data.endPosition),
            history_dsl::update_time.eq(&now),
            data.playTime.map(|pt| history_dsl::play_time.eq(pt)),
            data.onlinePlay.map(|op| history_dsl::online_play.eq(op)),
            data.duration.map(|d| history_dsl::duration.eq(d)),
            data.hasUpdate.map(|hu| history_dsl::has_update.eq(hu)),
        ))
        .execute(&mut db)
        .map_err(|e| format!("更新历史记录失败: {}", e))?;
    Ok(rows_affected)
}

#[tauri::command]
pub fn delete_history(
    id: &str,
) -> Result<usize, String> {
    let mut db = get_database_pool()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;
    
    let rows_affected = diesel::delete(history_dsl::history)
        .filter(history_dsl::id.eq(id))
        .execute(&mut db)
        .map_err(|e| format!("删除历史记录失败: {}", e))?;
    Ok(rows_affected)
}
