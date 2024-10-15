use tauri::{
  plugin::{Builder, TauriPlugin},
  Manager, Runtime,
};

pub use models::*;

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

mod commands;
mod error;
mod models;

pub use error::{Error, Result};

#[cfg(desktop)]
use desktop::Vop;
#[cfg(mobile)]
use mobile::Vop;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the vop APIs.
pub trait VopExt<R: Runtime> {
  fn vop(&self) -> &Vop<R>;
}

impl<R: Runtime, T: Manager<R>> crate::VopExt<R> for T {
  fn vop(&self) -> &Vop<R> {
    self.state::<Vop<R>>().inner()
  }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
  Builder::new("vop")
    .invoke_handler(tauri::generate_handler![commands::toggle_screen_orientation])
    .setup(|app, api| {
      #[cfg(mobile)]
      let vop = mobile::init(app, api)?;
      #[cfg(desktop)]
      let vop = desktop::init(app, api)?;
      app.manage(vop);
      Ok(())
    })
    .build()
}
