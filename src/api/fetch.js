import { httpStrategy } from "@/utils/env";

//axios 请求
export default {
    proxyGet(url, params, withTimestamp = false, timeout = 10) {
        return httpStrategy.proxyGet(url, params, withTimestamp, timeout);
    },

    get(url, params, withTimestamp = false, timeout = 10) {
        return httpStrategy.get(url, params, withTimestamp, timeout);
    },

    post(url, params, timeout=10) {
        return httpStrategy.post(url, params, timeout);
    },
};
