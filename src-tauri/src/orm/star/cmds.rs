use crate::orm::star::service::{get_all_stars, get_star_by_unique_key};
use crate::orm::star::types::StarSave;
use crate::utils;
use crate::{
    orm::{get_database_pool, star::types::Star},
    schema::star::dsl as star_dsl,
};
use diesel::dsl::max;
use diesel::ExpressionMethods;
use diesel::QueryDsl;
use diesel::RunQueryDsl;

#[tauri::command]
pub fn select_all_star() -> Result<Vec<Star>, String> {
    get_all_stars()
}

#[tauri::command]
pub fn star_movie(star: StarSave) -> Result<usize, String> {
    let old_star = get_star_by_unique_key(&star.ids, &star.site_key)?;
    if let Some(_old_star) = old_star {
        return Err(format!("影片已收藏"));
    }
    let mut db = get_database_pool().map_err(|e| format!("获取数据库连接失败: {}", e))?;

    let position_max = star_dsl::star
        .select(max(star_dsl::position))
        .first::<Option<f64>>(&mut db)
        .unwrap()
        .unwrap_or(0.00);
    let now = utils::get_current_time_str();
    let star = diesel::insert_into(star_dsl::star)
        .values((
            star_dsl::id.eq(utils::uuid()),
            star_dsl::star_name.eq(star.star_name),
            star_dsl::ids.eq(star.ids),
            star_dsl::site_key.eq(star.site_key),
            star_dsl::movie_type.eq(star.movie_type),
            star_dsl::year.eq(star.year),
            star_dsl::note.eq(star.note),
            star_dsl::douban_rate.eq(star.douban_rate),
            star_dsl::has_update.eq(star.has_update),
            star_dsl::last_update_time.eq(star.last_update_time),
            star_dsl::position.eq(position_max + 10.0),
            star_dsl::pic.eq(star.pic),
            star_dsl::area.eq(star.area),
            star_dsl::create_time.eq(now.clone()),
            star_dsl::update_time.eq(now.clone()),
        ))
        .execute(&mut db)
        .map_err(|e| format!("插入影片收藏记录失败: {}", e))?;
    Ok(star)
}

#[tauri::command]
pub fn delete_star(id: &str) -> Result<usize, String> {
    let mut db = get_database_pool().map_err(|e| format!("获取数据库连接失败: {}", e))?;

    let rows_affected = diesel::delete(star_dsl::star)
        .filter(star_dsl::id.eq(id))
        .execute(&mut db)
        .map_err(|e| format!("删除影片收藏记录失败: {}", e))?;
    Ok(rows_affected)
}

#[tauri::command]
pub fn import_star(file_path: &str) -> Result<usize, String> {
    let mut db = get_database_pool().map_err(|e| format!("获取数据库连接失败: {}", e))?;

    let file_content =
        std::fs::read_to_string(file_path).map_err(|e| format!("读取文件内容失败: {}", e))?;
    let star: Vec<Star> =
        serde_json::from_str(&file_content).map_err(|e| format!("解析JSON失败: {}", e))?;
    let old_stars = get_all_stars()?;
    let mut star_new = vec![];
    let now = utils::get_current_time_str();
    for h in star {
        if old_stars
            .iter()
            .find(|x| x.site_key == h.site_key && x.ids == h.ids)
            .is_none()
        {
            star_new.push(Star {
                id: utils::uuid(),
                star_name: h.star_name,
                ids: h.ids,
                site_key: h.site_key,
                movie_type: h.movie_type,
                year: h.year,
                note: h.note,
                douban_rate: h.douban_rate,
                has_update: h.has_update,
                last_update_time: h.last_update_time,
                position: h.position,
                pic: h.pic,
                area: h.area,
                create_time: now.clone(),
                update_time: Some(now.clone()),
            });
        }
    }

    let rows_affected = diesel::insert_into(star_dsl::star)
        .values(star_new)
        .execute(&mut db)
        .map_err(|e| format!("导入收藏记录失败: {}", e))?;
    Ok(rows_affected)
}
