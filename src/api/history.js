import { invoke } from "@tauri-apps/api/core";

export const getCurrentHistory = async (data) => {
    return await invoke("get_history_by_uq", { siteKeyStr: data.siteKey, idsStr: data.ids });
}