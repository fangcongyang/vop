use crate::{
    orm::{
        get_database_pool,
        site::{
            self,
            types::{Site, SiteClass, SiteClassSave, SiteSave, SiteUpdate},
        },
    },
    utils,
};

use crate::schema::site::dsl as site_dsl;
use crate::schema::site_class::dsl as site_class_dsl;
use diesel::{ExpressionMethods};
use diesel::{dsl::max, QueryDsl, RunQueryDsl};

#[tauri::command]
pub fn get_all_sites() -> Result<Vec<Site>, String> {
    site::service::get_all_sites()
}

#[tauri::command]
pub fn insert_site(data: SiteSave) -> Result<Site, String> {
    let old_site = site::service::get_site_by_key(&data.site_key)?;
    if let Some(_old_site) = old_site {
        return Err(format!("站点已存在"));
    }
    let mut db = get_database_pool().map_err(|e| format!("获取数据库连接失败: {}", e))?;
    let position_max = site_dsl::site
        .select(max(site_dsl::position))
        .first::<Option<f64>>(&mut db)
        .unwrap()
        .unwrap_or(0.00);
    let now = utils::get_current_time_str();
    let site = Site {
        id: utils::uuid(),
        site_key: data.site_key,
        site_name: data.site_name,
        api: data.api,
        site_group: data.site_group,
        is_active: data.is_active,
        status: data.status,
        position: Some(position_max + 10.00),
        is_reverse_order: data.is_reverse_order,
        parse_mode: data.parse_mode,
        create_time: now.clone(),
        update_time: Some(now.clone()),
    };
    diesel::insert_into(site_dsl::site)
        .values(&site)
        .execute(&mut db)
        .map_err(|e| format!("保存站点失败: {}", e))?;
    Ok(site)
}

#[tauri::command]
pub fn update_site(data: SiteUpdate) -> Result<(), String> {
    let mut db = get_database_pool().map_err(|e| format!("获取数据库连接失败: {}", e))?;
    diesel::update(site_dsl::site)
        .filter(site_dsl::id.eq(&data.id))
        .set((
            site_dsl::site_key.eq(&data.site_key),
            site_dsl::site_name.eq(&data.site_name),
            site_dsl::api.eq(&data.api),
            site_dsl::site_group.eq(&data.site_group),
            site_dsl::is_active.eq(&data.is_active),
            site_dsl::status.eq(&data.status),
            site_dsl::position.eq(&data.position),
            site_dsl::is_reverse_order.eq(&data.is_reverse_order),
            site_dsl::parse_mode.eq(&data.parse_mode),
            site_dsl::update_time.eq(utils::get_current_time_str()),
        ))
        .execute(&mut db)
        .map_err(|e| format!("更新站点失败: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn delete_site(id: &str) -> Result<(), String> {
    let mut db = get_database_pool().map_err(|e| format!("获取数据库连接失败: {}", e))?;
    diesel::delete(site_dsl::site)
        .filter(site_dsl::id.eq(id))
        .execute(&mut db)
        .map_err(|e| format!("删除站点失败: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn get_site_by_key(site_key: &str) -> Result<Option<Site>, String> {
    site::service::get_site_by_key(site_key)
}

#[tauri::command]
pub fn select_site_class_list(site_key: &str) -> Result<Vec<SiteClass>, String> {
    let mut db = get_database_pool().map_err(|e| format!("获取数据库连接失败: {}", e))?;
    let site_class_list = site_class_dsl::site_class
        .filter(site_class_dsl::site_key.eq(site_key))
        .load::<SiteClass>(&mut db)
        .map_err(|e| format!("查询站点分类失败: {}", e))?;
    Ok(site_class_list)
}

#[tauri::command]
pub fn cache_site_class_list(data: Vec<SiteClassSave>) -> Result<Vec<SiteClass>, String> {
    let mut db = get_database_pool().map_err(|e| format!("获取数据库连接失败: {}", e))?;
    let now = utils::get_current_time_str();

    let mut site_class_new = vec![];
    for site_class in data {
        site_class_new.push(SiteClass {
            id: utils::uuid(),
            class_id: site_class.class_id,
            site_key: site_class.site_key,
            class_name: site_class.class_name,
            create_time: now.clone(),
            update_time: Some(now.clone()),
        });
    }

    // SQLite doesn't support batch insert with returning, so we insert and then query
    diesel::insert_into(site_class_dsl::site_class)
        .values(&site_class_new)
        .execute(&mut db)
        .map_err(|e| format!("保存站点分类失败: {}", e))?;

    // Return the inserted data (we already have it constructed)
    Ok(site_class_new)
}
