import { invoke } from "@tauri-apps/api/core";
import { type } from "@tauri-apps/plugin-os"
import movieApi from "@/api/movies";
import fetch from '@/api/fetch';

export let cacheData = (key, value) => {
    if (!value) return;
    try {
        type();
        cacheData = (params) => invoke("cache_data", params);
    } catch {
        cacheData = (params) => {
            params.apiUrl = "/api/cache/cacheData";
            params.value = JSON.stringify(value);
            fetch.post("", params)
        }
    }
    cacheData({ key, value })
};

export let getCacheData = (key) => {
    try {
        type();
        getCacheData = (key) => invoke("get_cache_data", { key });
    } catch {
        getCacheData = (key) => {
            const params = { key };
            params.apiUrl = "/api/cache/getCacheData";
            return fetch.post("", params);
        }
    }
    try {
        return getCacheData(key)
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
