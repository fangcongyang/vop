const COMMANDS: &[&str] = &["toggle_screen_orientation"];

fn main() {
  tauri_plugin::Builder::new(COMMANDS)
    .android_path("android")
    .ios_path("ios")
    .build();
}
