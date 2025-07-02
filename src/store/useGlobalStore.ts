import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { type, OsType as OsDetailType } from "@tauri-apps/plugin-os";
import { getVersion } from "@tauri-apps/api/app";
import utils from "@/utils";

import { getSiteList } from "@/db";

type OsType = "desktop" | "mobile" | "web" | "webMobile";

export interface IptvInfo {
    channelGroupId: string | null;
    channelActive: string | null;
}

export interface DownloadInfo {
    downloadId: number | null;
}

export interface MovieInfo {
    siteKey: string;
    ids: string | null;
    index: number;
    videoFlag: string | null;
    onlineUrl: string | null;
}

export interface PlayInfo {
    playState: "newPlay" | "noPlay" | "stop";
    playStateTime: number;
    playType: "onlineMovie" | "localMovie" | "iptv";
    isLive: boolean;
    name: string | null;
    iptvInfo: IptvInfo;
    downloadInfo: DownloadInfo;
    movieInfo: MovieInfo;
}

export interface GlobalState {
    siteList: any[];
    siteMap: Map<string, any>;
    pageActive: "movie" | "history" | "setting" | "play";
    loading: boolean;
    error: string | null;
    appVersion: string | null;
    osType: OsType;
    osDetailType: OsDetailType;
    currentSite: any;
    searchKeyword: string | null;
    playInfo: PlayInfo;
    initGlobal: () => Promise<void>;
    toggleSiteList: (siteList: any[]) => void;
    toggleCurrentSite: (site: any) => void;
    togglePageActive: (pageActive: GlobalState["pageActive"]) => void;
    toggleSearchKeyword: (searchKeyword: string | null) => void;
    togglePlayInfo: (playInfo: PlayInfo, toPlay: boolean) => void;
    updatePlayInfoIndex: (parmas: {
        index: number;
        playState: PlayInfo["playState"];
    }) => void;
    resetPlayInfo: () => void;
}

export const useGlobalStore = create<GlobalState>()(
    persist(
        (set) => ({
            isInit: false,
            siteList: [],
            siteMap: new Map(),
            currentSite: null,
            pageActive: "movie",
            loading: false,
            error: null,
            appVersion: null,
            osType: "desktop",
            osDetailType: "windows",
            searchKeyword: null,
            playInfo: {
                playState: "noPlay",
                playStateTime: 0,
                playType: "onlineMovie",
                isLive: false,
                name: null,
                iptvInfo: {
                    channelGroupId: null,
                    channelActive: null,
                },
                downloadInfo: {
                    downloadId: null,
                },
                movieInfo: {
                    siteKey: "",
                    ids: null,
                    index: 0,
                    videoFlag: null,
                    onlineUrl: null,
                },
            },
            initGlobal: async () => {
                set({ loading: true, error: null });
                try {
                    const siteList = await getSiteList();
                    if (!siteList) {
                        throw new Error("Failed to fetch site list");
                    }
                    const osDetailType = type();
                    const appVersion = await getVersion();
                    const siteMap = siteList.reduce(
                        (acc: Record<string, any>, site: any) => {
                            acc[site.site_key] = site;
                            return acc;
                        },
                        {}
                    );

                    set((state) => {
                        const shouldUpdateCurrentSite =
                            !state.currentSite ||
                            !siteList.some((site: any) => site.site_key === state.currentSite?.site_key);
                        return {
                            siteList,
                            siteMap,
                            currentSite: shouldUpdateCurrentSite ? siteList[0] : state.currentSite,
                            loading: false,
                            osType: getOsType(osDetailType),
                            osDetailType,
                            appVersion,
                        };
                    });
                } catch (err: any) {
                    set({
                        error: err.message || "Unknown error",
                        loading: false,
                    });
                }
            },
            toggleSiteList: (siteList: any[]) => {
                const siteMap = siteList.reduce(
                    (acc: Map<string, any>, site: any) => {
                        acc.set(site.site_key, site);
                        return acc;
                    },
                    new Map()
                );
                set({ siteList, siteMap });
            },
            toggleCurrentSite: (site: any) => {
                set({ currentSite: site });
            },
            togglePageActive: (pageActive: GlobalState["pageActive"]) => {
                set({ pageActive });
            },
            toggleSearchKeyword: (searchKeyword: string | null) => {
                set({ searchKeyword });
            },
            togglePlayInfo: (playInfo: PlayInfo, toPlay = false) => {
                playInfo.playStateTime = Date.now();
                if (toPlay) {
                    set({ playInfo, pageActive: "play" });
                } else {
                    set({ playInfo });
                }
            },
            updatePlayInfoIndex: (parmas: {
                index: number;
                playState: PlayInfo["playState"];
            }) => {
                set((state) => ({
                    playInfo: {
                        ...state.playInfo,
                        movieInfo: {
                            ...state.playInfo.movieInfo,
                            index: parmas.index,
                        },
                        playState: parmas.playState,
                        playStateTime: Date.now(),
                    },
                }));
            },
            resetPlayInfo: () => {
                set({
                    playInfo: {
                        playState: "noPlay",
                        playStateTime: 0,
                        playType: "onlineMovie",
                        isLive: false,
                        name: null,
                        iptvInfo: {
                            channelGroupId: null,
                            channelActive: null,
                        },
                        downloadInfo: {
                            downloadId: null,
                        },
                        movieInfo: {
                            siteKey: "",
                            ids: null,
                            index: 0,
                            videoFlag: null,
                            onlineUrl: null,
                        },
                    },
                });
            },
        }),
        {
            name: "global-store",
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                pageActive: state.pageActive,
                currentSite: state.currentSite,
                searchKeyword: state.searchKeyword,
                playInfo: state.playInfo,
                osType: state.osType,
                osDetailType: state.osDetailType,
            }),
        }
    )
);

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
