import { invoke } from "@tauri-apps/api/core";
import { osType } from "@/utils/env";
import movieApi from "@/api/movies";
import fetch from '@/api/fetch';

export const cacheData = async (key, value) => {
    if (!value) return;
    let params = { key, value };
    if (osType().startsWith("web")) {
        params.apiUrl = "/api/cache/cacheData";
        params.value = JSON.stringify(value);
        fetch.post("", params)
    } else {
        invoke("cache_data", params);
    }
};

export const getCacheData = async (key) => {
    try {
        let params = { key };
        let data;
        if (osType().startsWith("web")) {
            params.apiUrl = "/api/cache/getCacheData";
            data = fetch.post("", params);
        } else {
            data = await invoke("get_cache_data", params);
        }
        return data;
    } catch (err) {
        console.log(err);
        return null;
    }
};

export const getMovieDetailCacheData = async (site, id) => {
    const cacheKey = `${site.site_key}@${id}`;
    const cacheValue = await getCacheData(cacheKey);
    if (cacheValue) {
        return cacheValue;
    }
    const data = await movieApi.detail(site, id);
    cacheData(cacheKey, data);
    return data;
};
