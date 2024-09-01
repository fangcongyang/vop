import { invoke } from "@tauri-apps/api/core";
import { osType } from "@/utils/env";
import fetch from '@/api/fetch';

export const cacheData = async (key, value) => {
    if (!value) return;
    let params = { key, value };
    if (osType.startsWith("web")) {
        params.value = JSON.stringify(value);
        fetch.post("/vopApi/cacheData", params)
    } else {
        invoke("cache_data", params);
    }
};

export const getCacheData = async (key) => {
    try {
        let params = { key };
        let data;
        if (osType.startsWith("web")) {
            data = fetch.post("/vopApi/getCacheData", params);
        } else {
            data = await invoke("get_cache_data", params);
        }
        return data;
    } catch (err) {
        console.log(err);
        return null;
    }
};
