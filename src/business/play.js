import DPlayer from "dplayerplus";
import flvjs from "flv.js";
import Hls from "hls.js";
import { _ } from "lodash";

export class MoviesPlayer {
    playerType = "";
    dpConfig = {
        container: null,
        isLive: false,
        autoplay: false,
        volume: 0.6,
        lang: "zh-cn",
        video: {
            type: "customHls",
            customType: {},
        },
        highlight: [],
    };
    dp;

    constructor(playerType, playerInfo, playerConf, showPalyPrevAndNext) {
        this.dpConfig.container = document.getElementById("dpplayer");
        this.playerType = playerType;
        this.dpConfig.volume = playerConf.volume;
        this.dpConfig.isLive = playerInfo.isLive;
        this.dpConfig.showPalyPrevAndNext = showPalyPrevAndNext;
        this.setPlayerType(playerType);
        this.dp = new DPlayer(this.dpConfig);
    }

    setPlayerType(playerType) {
        const customTypes = {
            flv: {
                type: "customFlv",
                customType: {
                    customFlv: (video) => {
                        const flvPlayer = flvjs.createPlayer({ type: "flv", url: video.src });
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
                        const hls = new Hls({ debug: false, p2pConfig: { live: false } });
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
                (item) => item.time && !tm.has(item.time) && tm.set(item.time, 1)
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
    }

    setHighlightByName(time, name) {
        this.dpConfig.highlight = this.dpConfig.highlight.filter((o) => o.text !== name);
        if (time) {
            this.dpConfig.highlight.push({ time, text: name });
        }
    }
}

export const getUrlType = (url) => {
    const match = url.match(/\.(m3u8|flv|mp4)(\?|$)/m);
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
