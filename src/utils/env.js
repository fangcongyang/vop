import { type } from "@tauri-apps/plugin-os";
import { getVersion } from "@tauri-apps/api/app";
import { initStore } from "./store";
import { AxiosHttpStrategy, TauriHttpStrategy } from "./httpStrategy";
import { useEffect, useState, useCallback } from "react";

// 环境信息缓存
let envCache = {
    osType: "",
    osDetailType: "",
    appVersion: null,
    httpStrategy: null
};

// 环境类型常量
const OS_TYPES = {
    DESKTOP: 'desktop',
    MOBILE: 'mobile',
    WEB: 'web',
    WEB_MOBILE: 'webMobile'
};

const PLATFORM_TYPES = {
    LINUX: 'linux',
    WINDOWS: 'windows',
    MACOS: 'macos',
    ANDROID: 'android',
    IOS: 'ios'
};

/**
 * 通用的环境信息Hook
 * @param {string} key - 环境信息的键名
 * @param {Function} initFn - 初始化函数
 * @returns {[any, boolean]} [value, isLoading]
 */
function useEnvInfo(key, initFn) {
    const [value, setValue] = useState(envCache[key] || null);
    const [isLoading, setIsLoading] = useState(!envCache[key]);

    const initialize = useCallback(async () => {
        if (envCache[key]) {
            setValue(envCache[key]);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const result = await initFn();
            envCache[key] = result;
            setValue(result);
        } catch (error) {
            console.error(`Failed to initialize ${key}:`, error);
        } finally {
            setIsLoading(false);
        }
    }, [key, initFn]);

    useEffect(() => {
        initialize();
    }, [initialize]);

    return [value, isLoading];
}

/**
 * 获取操作系统类型的Hook
 * @returns {[string, boolean]} [osType, isLoading]
 */
export function useOsType() {
    return useEnvInfo('osType', initOsType);
}

/**
 * 获取详细操作系统类型的Hook
 * @returns {[string, boolean]} [osDetailType, isLoading]
 */
export function useOsDetailType() {
    return useEnvInfo('osDetailType', initOsDetailType);
}

/**
 * 检测是否为移动设备（Web环境）
 * @returns {boolean}
 */
function detectMobileDevice() {
    const portraitMobile = window.matchMedia(
        "screen and (max-width: 760px) and (orientation: portrait)"
    ).matches;
    
    const landscapeMobile = window.matchMedia(
        "screen and (max-width: 1000px) and (orientation: landscape)"
    ).matches;
    
    return portraitMobile || landscapeMobile;
}

/**
 * 初始化操作系统类型
 * @returns {Promise<string>}
 */
async function initOsType() {
    try {
        const platformType = await type();
        
        switch (platformType) {
            case PLATFORM_TYPES.LINUX:
            case PLATFORM_TYPES.WINDOWS:
            case PLATFORM_TYPES.MACOS:
                return OS_TYPES.DESKTOP;
            case PLATFORM_TYPES.ANDROID:
            case PLATFORM_TYPES.IOS:
                return OS_TYPES.MOBILE;
            default:
                console.warn(`Unknown platform type: ${platformType}, defaulting to desktop`);
                return OS_TYPES.DESKTOP;
        }
    } catch (error) {
        console.warn('Failed to detect platform via Tauri, falling back to web detection:', error);
        
        // Web环境回退检测
        if (typeof window === 'undefined') {
            return OS_TYPES.DESKTOP; // SSR环境
        }
        
        return detectMobileDevice() ? OS_TYPES.WEB_MOBILE : OS_TYPES.WEB;
    }
}



/**
 * 初始化详细操作系统类型
 * @returns {Promise<string>}
 */
async function initOsDetailType() {
    try {
        const platformType = await type(); // 修复：添加 await
        return platformType;
    } catch (error) {
        console.warn('Failed to detect detailed platform type:', error);
        
        // Web环境回退检测
        if (typeof window === 'undefined') {
            return 'unknown';
        }
        
        return detectMobileDevice() ? 'web-mobile' : 'web-desktop';
    }
}

/**
 * 初始化应用版本
 * @returns {Promise<string>}
 */
async function initAppVersion() {
    try {
        const version = await getVersion();
        return version;
    } catch (error) {
        console.warn('Failed to get app version via Tauri, using fallback:', error);
        const fallbackVersion = import.meta.env.VITE_VOP_VERSION || '0.0.0';
        return fallbackVersion;
    }
}

/**
 * 初始化HTTP策略
 * @param {string} osType - 操作系统类型
 * @returns {object}
 */
function initHttpStrategy(osType) {
    const isWebEnvironment = osType.startsWith('web');
    return isWebEnvironment ? new AxiosHttpStrategy() : new TauriHttpStrategy();
}

/**
 * 获取HTTP策略
 * @returns {object}
 */
export function getHttpStrategy() {
    return envCache.httpStrategy || new AxiosHttpStrategy();
}

/**
 * 获取缓存的环境信息
 * @param {string} key - 环境信息键名
 * @returns {any}
 */
export function getCachedEnvInfo(key) {
    return envCache[key];
}

/**
 * 清除环境信息缓存
 */
export function clearEnvCache() {
    envCache = {
        osType: "",
        osDetailType: "",
        appVersion: null,
        httpStrategy: null
    };
}

/**
 * 初始化环境
 * @returns {Promise<void>}
 */
export async function initEnv() {
    try {
        // 并行初始化基础信息
        const [osType, osDetailType, appVersion] = await Promise.all([
            initOsType(),
            initOsDetailType(), // 添加 osDetailType 初始化
            initAppVersion()
        ]);
        
        // 缓存基础信息
        envCache.osType = osType;
        envCache.osDetailType = osDetailType; // 缓存 osDetailType
        envCache.appVersion = appVersion;
        
        // 初始化HTTP策略
        envCache.httpStrategy = initHttpStrategy(osType);
        
        // 初始化存储
        await initStore(osType);
        
        console.log('Environment initialized successfully:', {
            osType,
            osDetailType, // 添加到日志输出
            appVersion,
            httpStrategy: envCache.httpStrategy.constructor.name
        });
        
    } catch (error) {
        console.error('Failed to initialize environment:', error);
        throw new Error(`Environment initialization failed: ${error.message}`);
    }
}

// 向后兼容的导出
export const httpStrategy = () => getHttpStrategy();
export const osType = () => getCachedEnvInfo('osType');
export const appVersion = () => getCachedEnvInfo('appVersion');
export const osDetailType = () => getCachedEnvInfo('osDetailType');