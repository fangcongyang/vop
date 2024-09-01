import { type } from "@tauri-apps/plugin-os";
import { getVersion } from '@tauri-apps/api/app';
import { initStore } from "./store";

export let osType = '';
export let appVersion = '';

async function initOsType() {
    try {
        let ot = await type();
        let newOsType;
        switch (ot) {
            case 'linux':
            case 'windows':
            case 'macos':
                newOsType = "desktop";
                break;
            case 'android':
            case 'ios':
                newOsType = "mobile";
                break;
            default:
                newOsType = "desktop";
                break;
        }
        osType = newOsType;
    } catch (e) {
        let isMobile = window.matchMedia("screen and (max-width: 760px) and (orientation : portrait)").matches;
        if (!isMobile) {
            isMobile = window.matchMedia("screen and (max-width: 1000px) and (orientation : landscape)").matches;
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
    getVersion().then((v) => {
        appVersion = v;
    }).catch(() => {
        appVersion = import.meta.env.VITE_VOP_VERSION;
    })
}

export function initEnv() {
    return new Promise((resolve, reject) => {
        initOsType().then(async (osType) => {
            await initStore(osType);
            resolve();
        });
        initAppVersion();
    })
}