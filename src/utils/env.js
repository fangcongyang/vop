import { type } from "@tauri-apps/plugin-os";
import { getVersion } from "@tauri-apps/api/app";
import { initStore } from "./store";
import { AxiosHttpStrategy, TauriHttpStrategy } from "./httpStrategy";
import { useEffect, useState } from "react";

export let osType = "";
export let appVersion = "";

export function useOsType() {
    const [osType, setOsType] = useState("");

    useEffect(() => {
        initOsType().then((osType) => {
            setOsType(osType);
        });
    }, []);
}

async function initOsType() {
    try {
        let ot = type();
        let newOsType;
        switch (ot) {
            case "linux":
            case "windows":
            case "macos":
                newOsType = "desktop";
                break;
            case "android":
            case "ios":
                newOsType = "mobile";
                break;
            default:
                newOsType = "desktop";
                break;
        }
        osType = newOsType;
    } catch (e) {
        let isMobile = window.matchMedia(
            "screen and (max-width: 760px) and (orientation : portrait)"
        ).matches;
        if (!isMobile) {
            isMobile = window.matchMedia(
                "screen and (max-width: 1000px) and (orientation : landscape)"
            ).matches;
        }
        if (isMobile) {
            osType = "webMobile";
        } else {
            osType = "web";
        }
    }
    return osType;
}

async function initAppVersion() {
    getVersion()
        .then((v) => {
            appVersion = v;
        })
        .catch(() => {
            appVersion = import.meta.env.VITE_VOP_VERSION;
        });
}

export let httpStrategy = new AxiosHttpStrategy();

export function initEnv() {
    return new Promise(async (resolve, reject) => {
        try {
            const osType = await initOsType();
            httpStrategy = osType.startsWith("web")
                ? new AxiosHttpStrategy()
                : new TauriHttpStrategy();
            await initStore(osType);
            await initAppVersion(); // 如果 initAppVersion 是异步的
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}
