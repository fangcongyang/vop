use diesel::r2d2::{ConnectionManager, CustomizeConnection, Pool, PooledConnection};
use diesel::SqliteConnection;
use serde::{Serialize};
use tauri::{AppHandle, Manager};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::OnceCell;
use diesel::RunQueryDsl;
use std::future::Future;

pub mod history;

static DB_POOL: OnceCell<Arc<Pool<ConnectionManager<SqliteConnection>>>> = OnceCell::const_new();

#[derive(Debug)]
struct SqliteConnectionCustomizer;

impl CustomizeConnection<SqliteConnection, diesel::r2d2::Error> for SqliteConnectionCustomizer {
    fn on_acquire(&self, conn: &mut SqliteConnection) -> Result<(), diesel::r2d2::Error> {
        use diesel::sql_query;
        
        sql_query("PRAGMA busy_timeout = 2000;")
            .execute(conn)
            .map_err(diesel::r2d2::Error::QueryError)?;
        sql_query("PRAGMA journal_mode = WAL;")
            .execute(conn)
            .map_err(diesel::r2d2::Error::QueryError)?;
        sql_query("PRAGMA synchronous = NORMAL;")
            .execute(conn)
            .map_err(diesel::r2d2::Error::QueryError)?;
        sql_query("PRAGMA cache_size = 10000;")
            .execute(conn)
            .map_err(diesel::r2d2::Error::QueryError)?;
        sql_query("PRAGMA wal_autocheckpoint = 1000;")
            .execute(conn)
            .map_err(diesel::r2d2::Error::QueryError)?;
            
        Ok(())
    }
}

#[tokio::main]
pub async fn init_database_pool(conn_url: &String) -> anyhow::Result<()> {
    let manager = ConnectionManager::<SqliteConnection>::new(conn_url);
    let pool = Pool::builder()
        .connection_timeout(Duration::from_secs(30))
        .idle_timeout(Some(Duration::from_secs(30)))
        .max_size(100)
        .min_idle(Some(20))
        .max_lifetime(Some(Duration::from_secs(60 * 60)))
        .test_on_check_out(true)  // 添加连接测试
        .connection_customizer(Box::new(SqliteConnectionCustomizer)) 
        .build(manager)
        .expect("Failed to create pool.");

    // 将数据库连接存储到全局静态变量中
    DB_POOL
        .set(Arc::new(pool))
        .map_err(|_| anyhow::anyhow!("Database pool already initialized"))?;

    Ok(())
}

// 获取全局数据库连接池的函数
pub fn get_database_pool(
) -> anyhow::Result<PooledConnection<ConnectionManager<SqliteConnection>>> {
    let pool = DB_POOL
        .get()
        .ok_or_else(|| {
            anyhow::anyhow!("Database pool not initialized. Call init_database_pool first.")
        })?;
    
    // 设置获取连接的超时时间
    pool.get_timeout(Duration::from_secs(5))
        .map_err(|e| anyhow::anyhow!("Failed to get database connection: {}", e))
}

pub fn path_mapper(mut app_path: std::path::PathBuf, connection_string: &str) -> String {
    app_path.push(
        connection_string
            .split_once(':')
            .expect("Couldn't parse the connection string for DB!")
            .1,
    );

    app_path
        .as_os_str()
        .to_str()
        .expect("Couldn't convert path to string!")
        .to_string()
}

#[derive(Serialize)]
pub struct PageResult<T> {
    pub data: Vec<T>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
    pub has_next_page: Option<bool>,
}

impl<T> PageResult<T> {
    pub fn new(data: Vec<T>, total: i64, page_no: i64, page_size: i64) -> Self {
        Self { data, total, page_no, page_size, has_next_page: Some(page_no * page_size < total) }
    }
}

pub fn paginate<T, F>(
    mut select_list: F,
    page_no: i64,
    page_size: i64,
) -> Result<PageResult<T>, String>
where
    F: FnMut(i64) -> Result<(Vec<T>, i64), String>,
{
    let offset = (page_no - 1).max(0) * page_size;
    let (data_list, total) = select_list(offset)?;

    Ok(PageResult {
        data: data_list,
        total,
        page_no,
        page_size,
        has_next_page: Some(page_no * page_size < total),
    })
}

pub async fn paginate_async<T, F, Fut>(
    mut select_list: F,
    page_no: i64,
    page_size: i64,
) -> Result<PageResult<T>, String>
where
    F: FnMut(i64) -> Fut + Send,
    Fut: Future<Output = Result<(Vec<T>, i64), String>> + Send,
{
    let offset = (page_no - 1).max(0) * page_size;
    let (data_list, total) = select_list(offset).await?;

    Ok(PageResult {
        data: data_list,
        total,
        page_no,
        page_size,
        has_next_page: Some(page_no * page_size < total),
    })
}

// 获取跨平台的数据库路径
pub fn get_database_path(app_handle: &AppHandle) -> anyhow::Result<String> {
    let app_data_dir = app_handle.path().app_data_dir()?;
    
    // 确保目录存在
    std::fs::create_dir_all(&app_data_dir)?;
    
    let db_path = path_mapper(app_data_dir, "sqlite:vop.db");
    Ok(db_path)
}