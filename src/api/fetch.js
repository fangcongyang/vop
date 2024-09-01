import qs from "qs";
import { fetch } from "@tauri-apps/plugin-http";
import { osType } from "@/utils/env";
import axios from "axios";

axios.defaults.headers.post["Content-Type"] =
    "application/x-www-form-urlencoded;charset=UTF-8";
axios.defaults.withCredentials = true;

//axios 请求
export default {
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
                if (!osType.startsWith("web")) {
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
                } else {
                    let apiUrl = "/vopApi/siteProxy";
                    if (import.meta.env.PROD) {
                        apiUrl = import.meta.env.VITE_API_URL + apiUrl;
                    }
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
                }
            } catch (error) {
                console.log(error);
                reject(error);
            }
        });
    },
    post(url, params, timeout=10) {
        if (import.meta.env.PROD) {
            url = import.meta.env.VITE_API_URL + url;
        }
        return new Promise(async (resolve, reject) => {
            axios
                .post(url, params, {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    timeout: timeout * 1000,
                })
                .then((res) => {
                    resolve(res.data);
                })
                .catch((error) => {
                    console.log(error);
                    reject(error);
                });
        });
    },
};
