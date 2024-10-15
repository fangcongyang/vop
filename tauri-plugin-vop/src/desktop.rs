use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::models::*;

pub fn init<R: Runtime, C: DeserializeOwned>(
  app: &AppHandle<R>,
  _api: PluginApi<R, C>,
) -> crate::Result<Vop<R>> {
  Ok(Vop(app.clone()))
}

/// Access to the vop APIs.
pub struct Vop<R: Runtime>(AppHandle<R>);

impl<R: Runtime> Vop<R> {
  pub fn toggle_screen_orientation(&self, payload: VopRequest) -> crate::Result<VopResponse> {
    Ok(VopResponse {
      value: payload.value,
    })
  }
}
