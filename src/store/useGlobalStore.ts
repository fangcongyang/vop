import { create } from "zustand";
import { type, OsType as OsDetailType } from "@tauri-apps/plugin-os";
import { getVersion } from "@tauri-apps/api/app";
import utils from "@/utils";

import { getSiteList } from "@/db";

type OsType = "desktop" | "mobile" | "web" | "webMobile";

export interface GlobalState {
  siteList: any[];
  pageActive: "movie" | "history" | "setting";
  loading: boolean;
  error: string | null;
  appVersion: string | null;
  osType: OsType;
  osDetailType: OsDetailType;
  initGlobal: () => Promise<void>;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  siteList: [],
  pageActive: "movie",
  loading: false,
  error: null,
  appVersion: null,
  osType: "desktop",
  osDetailType: "windows",
  initGlobal: async () => {
    set({ loading: true, error: null });
    try {
      const siteList = await getSiteList();
      if (!siteList) {
        throw new Error("Failed to fetch site list");
      }
      const osDetailType = type();
      const appVersion = await getVersion();
      set({ siteList, loading: false, osType: getOsType(osDetailType), osDetailType, appVersion });
    } catch (err: any) {
      set({ error: err.message || "Unknown error", loading: false });
    }
  },
}));

function getOsType(platformType: OsDetailType) {
  try {
    switch (platformType) {
      case "linux":
      case "windows":
      case "macos":
        return "desktop";
      case "android":
      case "ios":   
        return "mobile";
      default:
        return "desktop";
    }
  } catch (error) {
    console.warn(
      "Failed to detect platform via Tauri, falling back to web detection:",
      error
    );

    // Web环境回退检测
    if (typeof window === "undefined") {
      return "desktop"; // SSR环境
    }

    return utils.detectMobileDevice() ? "webMobile" : "web";
  }
}
