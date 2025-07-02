import qs from "qs";
import { fetch } from "@tauri-apps/plugin-http";
import axios from "axios";
import { type } from "@tauri-apps/plugin-os";

axios.defaults.headers.post["Content-Type"] =
    "application/x-www-form-urlencoded;charset=UTF-8";
axios.defaults.withCredentials = true;

class HttpStrategy {
    proxyGet(url, params, withTimestamp = false, timeout = 10) {
        return this.get(url, params, withTimestamp, timeout);
    }

    get(_url, _params, _withTimestamp = false, _timeout = 10) {}


    post(_url, _params, _timeout = 10) {}
}

class TauriHttpStrategy extends HttpStrategy {
    async get(url, params, withTimestamp = false, timeout = 10) {
        // 处理时间戳参数
        if (withTimestamp) {
            const timestamp = Date.now();
            params = params ? { ...params, t: timestamp } : { t: timestamp };
        }

        // 构建查询字符串
        const queryString = qs.stringify(params);
        const requestUrl = queryString ? `${url}?${queryString}` : url;

        const response = await fetch(requestUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.58",
                "Content-Type": "application/text",
            },
            method: "GET",
            mode: "cors",
            timeout: timeout * 1000, // 转换为毫秒
        });

        return await response.text();
    }

    async post(url, params, timeout = 10) {
        // 构建请求体
        const body = params ? qs.stringify(params) : undefined;

        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.58",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            method: "POST",
            body,
            timeout: timeout * 1000, // 转换为毫秒
        });

        return await response.text();
    }
}

class AxiosHttpStrategy extends HttpStrategy {
    async proxyGet(url, params, withTimestamp = false, timeout = 10) {
        // 处理时间戳参数
        if (withTimestamp) {
            const timestamp = Date.now();
            params = params ? { ...params, t: timestamp } : { t: timestamp };
        }

        // 构建代理请求URL
        const apiUrl = import.meta.env.VITE_VOP_API + "/api/site/siteProxy";
        const queryString = qs.stringify(params);
        const requestUrl = queryString ? `${url}?${queryString}` : url;

        const response = await axios.post(
            apiUrl,
            { request_path: requestUrl },
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                maxBodyLength: Infinity,
                timeout: timeout * 1000,
                responseType: "text",
            }
        );

        return response.data;
    }

    async get(url, params, withTimestamp = false, timeout = 10) {
        // 处理时间戳参数
        if (withTimestamp) {
            const timestamp = Date.now();
            params = params ? { ...params, t: timestamp } : { t: timestamp };
        }

        // 验证并构建API URL
        if (!params.apiUrl) {
            throw new Error("apiUrl is empty");
        }

        const apiUrl = import.meta.env.VITE_VOP_API + params.apiUrl;
        const requestParams = { ...params };
        delete requestParams.apiUrl;

        // 构建查询字符串
        const queryString = qs.stringify(requestParams);
        const requestUrl = queryString ? `${apiUrl}?${queryString}` : apiUrl;

        const response = await axios.get(requestUrl, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            maxBodyLength: Infinity,
            timeout: timeout * 1000,
            responseType: "text",
        });

        return JSON.parse(response.data);
    }

    async post(url, params, timeout = 10) {
        // 验证并构建API URL
        if (!params.apiUrl) {
            throw new Error("apiUrl is empty");
        }

        const apiUrl = import.meta.env.VITE_VOP_API + params.apiUrl;
        const requestParams = { ...params };
        delete requestParams.apiUrl;

        const response = await axios.post(apiUrl, requestParams, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            timeout: timeout * 1000,
        });

        return response.data;
    }

    async postJson(url, params, timeout = 10) {
        // 验证并构建API URL
        if (!params.apiUrl) {
            throw new Error("apiUrl is empty");
        }

        const apiUrl = import.meta.env.VITE_VOP_API + params.apiUrl;
        const requestParams = { ...params };
        delete requestParams.apiUrl;

        try {
            const response = await axios.post(apiUrl, requestParams, {
                headers: {
                    "Content-Type": "application/json",
                },
                timeout: timeout * 1000,
            });

            return response.data;
        } catch (error) {
            throw new Error(`Post JSON request error: ${error.message}`);
        }
    }
}

export const httpStrategy = (() => {
    try {
        type();
        return new TauriHttpStrategy();
    } catch {
        return new AxiosHttpStrategy();
    }
})();

export { TauriHttpStrategy, AxiosHttpStrategy };
