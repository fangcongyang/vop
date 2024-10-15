use tauri::{AppHandle, command, Runtime};

use crate::models::*;
use crate::Result;
use crate::VopExt;

#[command]
pub(crate) async fn toggle_screen_orientation<R: Runtime>(
    app: AppHandle<R>,
    payload: VopRequest,
) -> Result<VopResponse> {
    app.vop().toggle_screen_orientation(payload)
}
