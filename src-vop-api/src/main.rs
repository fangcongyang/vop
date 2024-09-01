use actix_web::{HttpServer, App, web};

mod api;
mod cache;

#[actix_web::main]
pub async fn run_api_server(port: u16) -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .route("/siteProxy", web::post().to(api::site_proxy))
            .route("/cacheData", web::post().to(cache::cache_data))
            .route("/getCacheData", web::post().to(cache::get_cache_data))
            .app_data(web::FormConfig::default().limit(327_680))
    })
    .bind(("0.0.0.0", port))?
    .run()
    .await
}

fn main() {
    let _ = run_api_server(8088);
}