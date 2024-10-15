import qs from "qs";
import { fetch } from "@tauri-apps/plugin-http";
import axios from "axios";

axios.defaults.headers.post["Content-Type"] =
    "application/x-www-form-urlencoded;charset=UTF-8";
axios.defaults.withCredentials = true;

class HttpStrategy {
    proxyGet(url, params, withTimestamp = false, timeout = 10) {
        return this.get(url, params, withTimestamp, timeout);
    }

    get(url, params, withTimestamp = false, timeout = 10) {}

    post(url, params, timeout = 10) {}
}

class TauriHttpStrategy extends HttpStrategy {
    get(url, params, withTimestamp = false, timeout = 10) {
        return new Promise(async (resolve, reject) => {
            if (withTimestamp) {
                let date = new Date().getTime();
                if (params) {
                    params["t"] = date;
                } else {
                    params = {};
                    params["t"] = date;
                }
            }
            let pp = qs.stringify(params);
            if (pp) url += "?" + pp;
            try {
                let res = await fetch(url, {
                    headers: {
                        "User-agent":
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.58",
                        "Content-Type": "application/text",
                    },
                    method: "GET",
                    mode: "cors",
                    timeout,
                });
                res.text()
                    .then((data) => {
                        resolve(data);
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    }

    post(url, params, timeout = 10) {
        return new Promise(async (resolve, reject) => {
            try {
                let res = await fetch(url, {
                    headers: {
                        "User-agent":
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.182",
                    },
                });
                resolve(res);
            } catch (error) {
                reject(error);
            }
        });
    }
}

class AxiosHttpStrategy extends HttpStrategy {
    proxyGet(url, params, withTimestamp = false, timeout = 10) {
        return new Promise(async (resolve, reject) => {
            if (withTimestamp) {
                let date = new Date().getTime();
                if (params) {
                    params["t"] = date;
                } else {
                    params = {};
                    params["t"] = date;
                }
            }
            try {
                let apiUrl =
                    import.meta.env.VITE_VOP_API + "/api/site/siteProxy";
                let pp = qs.stringify(params);
                if (pp) url += "?" + pp;
                axios
                    .post(
                        apiUrl,
                        {
                            request_path: url,
                        },
                        {
                            headers: {
                                "Content-Type":
                                    "application/x-www-form-urlencoded",
                            },
                            maxBodyLength: Infinity,
                            timeout: timeout * 1000,
                            responseType: "text",
                        }
                    )
                    .then((res) => {
                        resolve(res.data);
                    })
                    .catch((error) => {
                        console.log(error);
                        reject(error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    }

    get(url, params, withTimestamp = false, timeout = 10) {
        return new Promise(async (resolve, reject) => {
            if (withTimestamp) {
                let date = new Date().getTime();
                if (params) {
                    params["t"] = date;
                } else {
                    params = {};
                    params["t"] = date;
                }
            }
            try {
                if (!params.apiUrl) throw new Error("apiUrl is empty");
                let apiUrl = import.meta.env.VITE_VOP_API + params.apiUrl;
                delete params.apiUrl;
                let pp = qs.stringify(params);
                if (pp) apiUrl += "?" + pp;
                axios
                    .get(apiUrl, {
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        maxBodyLength: Infinity,
                        timeout: timeout * 1000,
                        responseType: "text",
                    })
                    .then((res) => {
                        resolve(JSON.parse(res.data));
                    })
                    .catch((error) => {
                        console.log(error);
                        reject(error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    }

    post(url, params, timeout = 10) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!params.apiUrl) throw new Error("apiUrl is empty");
                let apiUrl = import.meta.env.VITE_VOP_API + params.apiUrl;

                delete params.apiUrl;
                // 优化：使用 async/await 替代 then/catch
                const res = await axios.post(apiUrl, params, {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    timeout: timeout * 1000,
                });
                resolve(res.data);
            } catch (error) {
                reject(error);
            }
        });
    }

    postJson(url, params, timeout = 10) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!params.apiUrl) throw new Error("apiUrl is empty");
                let apiUrl = import.meta.env.VITE_VOP_API + params.apiUrl;

                delete params.apiUrl;
                // 优化：使用 async/await 替代 then/catch
                const res = await axios.post(apiUrl, params, {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    timeout: timeout * 1000,
                });
                resolve(res.data);
            } catch (error) {
                reject("Post JSON request error" + error.message);
            }
        });
    }
}

export { TauriHttpStrategy, AxiosHttpStrategy };
