use serde::de::DeserializeOwned;
use tauri::{
  plugin::{PluginApi, PluginHandle},
  AppHandle, Runtime,
};

use crate::models::*;

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_vop);

// initializes the Kotlin or Swift plugin classes
pub fn init<R: Runtime, C: DeserializeOwned>(
  _app: &AppHandle<R>,
  api: PluginApi<R, C>,
) -> crate::Result<Vop<R>> {
  #[cfg(target_os = "android")]
  let handle = api.register_android_plugin("com.plugin.vop", "VopPlugin")?;
  #[cfg(target_os = "ios")]
  let handle = api.register_ios_plugin(init_plugin_vop)?;
  Ok(Vop(handle))
}

/// Access to the vop APIs.
pub struct Vop<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Vop<R> {
  pub fn toggle_screen_orientation(&self, payload: VopRequest) -> crate::Result<VopResponse> {
    self
      .0
      .run_mobile_plugin("toggle_screen_orientation", payload)
      .map_err(Into::into)
  }
}
