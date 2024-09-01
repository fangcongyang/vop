import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { invoke } from "@tauri-apps/api/core";
import _ from "lodash";

const initialState = {
    mainEnableScrolling: true,
    settings: {
        title: "vop",
        closeAppOption: "exit",
        proxyProtocol: "noProxy",
        proxyServer: "",
        proxyPort: 0,
        enableGlobalShortcut: true,
        shortcuts: [
            {
                id: "play",
                name: "播放/暂停",
                shortcut: "CmdOrCtrl+1",
                globalShortcut: "Alt+CommandOrControl+1",
                isPersonalUse: false,
            },
            {
                id: "next",
                name: "下一首",
                shortcut: "CmdOrCtrl+Right",
                globalShortcut: "Alt+CommandOrControl+Right",
                isPersonalUse: false,
            },
            {
                id: "previous",
                name: "上一首",
                shortcut: "CmdOrCtrl+Left",
                globalShortcut: "Alt+CommandOrControl+Left",
                isPersonalUse: false,
            },
            {
                id: "increaseVolume",
                name: "增加音量",
                shortcut: "CmdOrCtrl+Up",
                globalShortcut: "Alt+CommandOrControl+Up",
                isPersonalUse: false,
            },
            {
                id: "decreaseVolume",
                name: "减少音量",
                shortcut: "CmdOrCtrl+Down",
                globalShortcut: "Alt+CommandOrControl+Down",
                isPersonalUse: false,
            },
            {
                id: "like",
                name: "喜欢歌曲",
                shortcut: "CmdOrCtrl+L",
                globalShortcut: "Alt+CommandOrControl+L",
                isPersonalUse: false,
            },
            {
                id: "minimize",
                name: "隐藏/显示播放器",
                shortcut: "CmdOrCtrl+M",
                globalShortcut: "Alt+CommandOrControl+M",
                isPersonalUse: false,
            },
        ],
    },
    pageActive: "movie",
    playInfo: {
        playState: "noPlay",
        playStateTime: 0,
        // iptv onlineMovie localMovie
        playType: "onlineMovie",
        isLive: false,
        name: "",
        iptv: {
            channelGroupId: 0,
            channelActive: "",
        },
        download: {
            downloadId: 0,
        },
        movie: {
            siteKey: "",
            ids: "",
            index: 0,
            videoFlag: "",
            onlineUrl: "",
        },
    },
    playerConf: {
        volume: 0.6,
        autoChangeSourceWhenIptvStalling: true,
        waitingTimeInSec: 5,
        forwardTimeInSec: 5,
    },
    toast: {
        show: false,
        text: "",
        timer: null,
    },
};

export const getAppConf = createAsyncThunk("getAppConf", async () => {
    let appConf = await invoke("get_app_conf", {});
    return appConf;
});

export const restoreDefaultShortcuts = createAsyncThunk(
    "restoreDefaultShortcuts",
    async () => {
        let appConf = await invoke("restore_default_shortcuts", {});
        for (let shortcut of appConf.settings.shortcuts) {
            shortcut.isPersonalUse = await registeredGlobalShortcut(shortcut);
        }
        return appConf;
    }
);

export const updateAppConf = createAsyncThunk(
    "updateAppConf",
    async (confUpdate, _) => {
        return confUpdate;
    }
);

export const updateShortcut = createAsyncThunk(
    "updateShortcut",
    async (data, thunkAPI) => {
        const state = thunkAPI.getState();
        let newShortcut = _.cloneDeep(
            state.core.settings.shortcuts.find((s) => s.id === data.id)
        );
        newShortcut[data.type] = data.shortcut;
        let shortcuts = state.core.settings.shortcuts.map((sny) => {
            if (s.id !== data.id) return s;
            return newShortcut;
        });
        invoke("conf_update", { data: { key: "shortcuts", value: shortcuts } });
        return shortcuts;
    }
);

export const coreSlice = createSlice({
    name: "core",
    initialState,
    reducers: {
        enableMainScrolling: (state, action) => {
            state.mainEnableScrolling = action.payload;
        },

        updatePlayInfo: (state, action) => {
            let { playInfo, toPlay } = action.payload;
            playInfo.playStateTime = new Date().getTime();
            state.playInfo = playInfo;
            if (toPlay) {
                state.pageActive = "play";
            }
        },

        resetPlayInfo: (state, action) => {
            state.playInfo = {
                playState: "noPlay",
                playStateTime: 0,
                // iptv onlineMovie localMovie
                playType: "onlineMovie",
                isLive: false,
                name: "",
                iptv: {
                    channelGroupId: 0,
                    channelActive: "",
                },
                download: {
                    downloadId: 0,
                },
                movie: {
                    siteKey: "",
                    ids: "",
                    index: 0,
                    videoFlag: "",
                    onlineUrl: "",
                },
            };
        },

        updatePlayInfoIndex: (state, action) => {
            let { index, playState } = action.payload;
            state.playInfo.movie.index = index;
            state.playInfo.playState = playState;
            state.playInfo.playStateTime = new Date().getTime();
        },

        updateplayerConf: (state, action) => {
            let { key, value } = action.payload;
            state.playerConf[key] = value;
        },

        setToast: (state, action) => {
            state.toast = action.payload;
        },

        togglePageActive: (state, action) => {
            state.pageActive = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(getAppConf.fulfilled, (state, action) => {
            const appConf = action.payload;
            for (let key in state.settings) {
                if (appConf[key]) {
                    state.settings[key] = appConf[key];
                }
            }
        }),
            builder.addCase(
                restoreDefaultShortcuts.fulfilled,
                (state, action) => {
                    const appConf = action.payload.settings;
                    state.settings.shortcuts = appConf.shortcuts;
                }
            ),
            builder.addCase(updateAppConf.fulfilled, (state, action) => {
                const confUpdate = action.payload;
                state[confUpdate.confName][confUpdate.key] = confUpdate.value;
            });
    },
});

export const {
    enableMainScrolling,
    setToast,
    updatePlayInfo,
    togglePageActive,
    updateplayerConf,
    updatePlayInfoIndex,
    resetPlayInfo,
    updateIsPhone
} = coreSlice.actions;

export const mainEnableScrollingStore = (state) =>
    state.core.mainEnableScrolling;

export const settingsStore = (state) => state.core.settings;

export const playInfoStore = (state) => state.core.playInfo;

export const playerConfStore = (state) => state.core.playerConf;

export const pageActiveStore = (state) => state.core.pageActive;

export const toastStore = (state) => state.core.toast;

export default coreSlice.reducer;
