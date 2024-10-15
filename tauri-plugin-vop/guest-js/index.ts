import { invoke } from '@tauri-apps/api/core'

export async function toggleScreenOrientation(value: string): Promise<string | null> {
  return await invoke<{value?: string}>('plugin:vop|toggle_screen_orientation', {
    payload: {
      value,
    },
  }).then((r) => (r.value ? r.value : null));
}
