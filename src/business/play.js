import DPlayer from "dplayerplus";
import { listen } from "@tauri-apps/api/event";
import flvjs from "flv.js";
import Hls from "hls.js";
import { debounce } from "lodash";

export class MoviesPlayer {
    playerType = "";
    dpConfig = {
        container: null,
        isLive: false,
        autoplay: false,
        volume: 1,
        lang: "zh-cn",
        video: {
            type: "customHls",
            customType: {},
        },
        highlight: [],
        speed: 1,
    };
    dp;
    listeners = [];

    constructor(playerType, playerInfo, showPalyPrevAndNext) {
        this.dpConfig.container = document.getElementById("dpplayer");
        this.playerType = playerType;
        this.dpConfig.isLive = playerInfo.isLive;
        this.dpConfig.showPalyPrevAndNext = showPalyPrevAndNext;
        this.setPlayerType(playerType);
        this.dp = new DPlayer(this.dpConfig);
        this.dp.volume(this.dpConfig.volume, true, false);
        this.initTaryEvent();
    }

    async initTaryEvent() {
        let listener = await listen(
            "playOrPause",
            debounce((_event) => {
                this.dp.toggle();
            }, 300)
        );
        this.listeners.push(listener);

        listener = await listen(
            "forward",
            debounce((_event) => {
                this.dp.seek(this.dp.currentTime() + 10);
            }, 300)
        );
        this.listeners.push(listener);

        listener = await listen(
            "backward",
            debounce((_event) => {
                this.dp.seek(this.dp.currentTime() - 10);
            }, 300)
        );
        this.listeners.push(listener);

        listener = await listen(
            "volumeUp",
            debounce((_event) => {
                let volume = this.dpConfig.volume + 0.1;
                if (volume < 1) {
                    this.dpConfig.volume = volume;
                    this.dp.volume(volume + 0.1, true, false);
                }
            }, 300)
        );
        this.listeners.push(listener);

        listener = await listen(
            "volumeDown",
            debounce((_event) => {
                let volume = this.dpConfig.volume - 0.1;
                if (volume > 0) {
                    this.dpConfig.volume = volume;
                    this.dp.volume(volume - 0.1, true, false);
                }
            }, 300)
        );
        this.listeners.push(listener);

        listener = await listen(
            "next",
            debounce((_event) => {
                this.dp.playNext();
            }, 300)
        );
        this.listeners.push(listener);

        listener = await listen(
            "prev",
            debounce((_event) => {
                this.dp.playPrev();
            }, 300)
        );
        this.listeners.push(listener);

        listener = await listen(
            "playbackRateUp",
            debounce((_event) => {
                this.dpConfig.speed = this.dpConfig.speed + 0.5;
                if (this.dpConfig.speed > 3) {
                    this.dpConfig.speed = 3;
                }
                this.dp.speed(this.dpConfig.speed);
            }, 300)
        );
        this.listeners.push(listener);

        listener = await listen(
            "playbackRateDown",
            debounce((_event) => {
                this.dpConfig.speed = this.dpConfig.speed - 0.5;
                if (this.dpConfig.speed < 0.5) {
                    this.dpConfig.speed = 0.5;
                }
                this.dp.speed(this.dpConfig.speed);
            }, 300)
        );
        this.listeners.push(listener);

        listener = await listen(
            "lock",
            () => {
                console.log(123)
                window.location.reload();
            }
        );
        this.listeners.push(listener);
    }

    setPlayerType(playerType) {
        const customTypes = {
            flv: {
                type: "customFlv",
                customType: {
                    customFlv: (video) => {
                        const flvPlayer = flvjs.createPlayer({
                            type: "flv",
                            url: video.src,
                        });
                        flvPlayer.attachMediaElement(video);
                        flvPlayer.load();
                    },
                },
            },
            mp4: { type: "mp4", customType: {} },
            default: {
                type: "customHls",
                customType: {
                    customHls: (video) => {
                        const hls = new Hls({
                            debug: false,
                            p2pConfig: { live: false },
                        });
                        hls.loadSource(video.src);
                        hls.attachMedia(video);
                    },
                },
            },
        };
        const config = customTypes[playerType] || customTypes.default;
        this.dpConfig.video.type = config.type;
        this.dpConfig.video.customType = config.customType;
    }

    durationchange() {
        if (this.dp) {
            const tm = new Map();
            this.dpConfig.highlight = this.dpConfig.highlight.filter(
                (item) =>
                    item.time && !tm.has(item.time) && tm.set(item.time, 1)
            );
            this.dp.durationchange(this.dpConfig.highlight);
        }
    }

    duration() {
        return this.dp?.video?.duration || 0.0;
    }

    currentTime() {
        return this.dp?.video?.currentTime || 0.0;
    }

    playerExist() {
        return !!this.dp;
    }

    videoExist() {
        return !!this.dp?.video;
    }

    destroy() {
        if (this.dp) {
            this.dp.destroy();
            this.dp = null;
        }
        if (this.listeners) {
            this.listeners.forEach((listener) => {
                listener();
            });
            this.listeners = [];
        }
    }

    setHighlightByName(time, name) {
        this.dpConfig.highlight = this.dpConfig.highlight.filter(
            (o) => o.text !== name
        );
        if (time) {
            this.dpConfig.highlight.push({ time, text: name });
        }
    }
}

export const getUrlType = (url) => {
    const match = url?.match(/\.(m3u8|flv|mp4)(\?|$)/m);
    return match ? match[1] : null;
};

export const getPlayerType = (movieUrl) => {
    const typeMap = {
        flv: "customFlv",
        mp4: "mp4",
        m3u8: "customHls",
    };
    return typeMap[getUrlType(movieUrl)] || "customHls";
};

export const getIsVipMovies = (movieUrl) => {
    const vipWebsites = ["iqiyi", "tenxun"];
    return vipWebsites.some((v) => movieUrl.includes(v));
};
