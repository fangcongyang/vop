import React, { useState, useEffect, useRef, useMemo } from "react";
import { listen, emit } from "@tauri-apps/api/event";
import { getDownloadInfoById } from "@/api/downloadInfo";
import { MoviesPlayer, getPlayerType, getIsVipMovies } from "@/business/play";
import { getMovieDetailCacheData } from "@/business/cache";
import movieApi from "@/api/movies";
import { getCurrentHistoryOrSave, updateHistory } from "@/api/history";
import { message } from "antd";
import { useGetState } from "@/hooks";
import _ from "lodash";
import { convertFileSrc } from "@tauri-apps/api/core";
import { GlobalEvent } from "../../business/types";
import { useGlobalStore } from "@/store/useGlobalStore";
import "./index.scss";

let player;
let playPage = {
    isFirstPlay: true,
    movieList: [],
    movieIndex: 0,
    currentHistory: null,
    playing: false,
};

const SmallPlay = () => {
    const [messageApi, contextHolder] = message.useMessage();
    const siteList = useGlobalStore((state) => state.siteList);
    const eventUnlistenFn = useRef(null);

    // 使用useRef来管理定时器ID，避免使用全局变量
    const historyTimerRef = useRef(null);
    // localFile 本地文件 local 本地在线 online iframe网页
    const [playMode, setPlayMode] = useState("local");
    const [playerInfo, _setPlayerInfo] = useState({
        searchTxt: "",
        skipendStatus: false,
        right: {
            show: false,
            type: "",
        },
        isLive: false,
    });

    const [playInfo, setPlayInfo] = useState({
        playMode: "local",
        playUrl: "",
        playType: "",
        playMovieUq: "",
        currentHistory: null,
        movieInfo: {
            index: 0,
            siteKey: "",
            ids: "",
            videoFlag: "",
        },
    });

    // 创建moviesInfo响应对象
    const [moviesInfo, setMoviesInfo, getMoviesInfo] = useGetState({
        currentTime: 0,
        otherSiteMoviesSources: [],
        startPosition: { min: "00", sec: "00" },
        endPosition: { min: "00", sec: "00" },
    });

    // 自动关闭播发器
    const closePlayer = () => {
        player?.destroy();
    };

    const getPlayer = (videoUrl, force = false) => {
        const playerType = getPlayerType(videoUrl);
        const showPalyPrevAndNext = playPage.movieList?.length > 1;
        if (
            force ||
            !player ||
            !player.dp ||
            playerType !== player.playerType
        ) {
            closePlayer();
            player = new MoviesPlayer(
                playerType,
                playerInfo,
                showPalyPrevAndNext
            );
            bindEvent();
        } else {
            player.dp.playPrevAndNext(showPalyPrevAndNext);
        }
        playPage.movieIndex = playInfo.movieInfo.index;
    };

    const getUrls = async () => {
        if (!player || !player.dp) getPlayer();
        if (historyTimerRef.current) {
            clearInterval(historyTimerRef.current);
            historyTimerRef.current = null;
        }

        if (playInfo.playType === "iptv") {
            // 是直播源，直接播放
            playChannel(playInfo.playUrl);
        } else if (playInfo.playType === "localMovie") {
            getDownloadInfoById({ id: playInfo.download.downloadId }).then(
                (downloadInfo) => {
                    const assetUrl = convertFileSrc(downloadInfo.url);
                    player.dp.switchVideo({
                        url: assetUrl,
                        type: "mp4",
                    });
                }
            );
        } else {
            let time = undefined;
            // 初始化片头片尾位置
            setMoviesInfo({
                ...moviesInfo,
                startPosition: { min: "00", sec: "00" },
                endPosition: { min: "00", sec: "00" },
            });

            // 从localStorage恢复片头片尾设置
            const timingKey = `timing_${playMovieUq}`;
            const savedTiming = localStorage.getItem(timingKey);
            if (savedTiming) {
                try {
                    const timing = JSON.parse(savedTiming);
                    setMoviesInfo({
                        ...moviesInfo,
                        startPosition: timing.startPosition || {
                            min: "00",
                            sec: "00",
                        },
                        endPosition: timing.endPosition || {
                            min: "00",
                            sec: "00",
                        },
                    });
                } catch (e) {
                    console.warn(
                        "Failed to parse timing from localStorage:",
                        e
                    );
                }
            }

            let currentHistory = playPage.currentHistory;
            if (currentHistory) {
                if (currentHistory.index == playInfo.movieInfo.index) {
                    time = currentHistory.play_time;
                }

                // 从历史记录中恢复片头片尾设置（优先级高于localStorage）
                if (currentHistory.start_position) {
                    // 数据库保存的时长通过快捷键设置时可能为小数, startPosition为object对应输入框分秒转化到数据库后肯定为整数
                    const startPos = currentHistory.start_position;
                    setMoviesInfo({
                        ...moviesInfo,
                        startPosition: {
                            min: String(Math.floor(startPos / 60)).padStart(
                                2,
                                "0"
                            ),
                            sec: String(Math.floor(startPos % 60)).padStart(
                                2,
                                "0"
                            ),
                        },
                    });
                }
                if (currentHistory.end_position) {
                    const endPos = currentHistory.end_position;
                    setMoviesInfo({
                        ...moviesInfo,
                        endPosition: {
                            min: String(Math.floor(endPos / 60)).padStart(
                                2,
                                "0"
                            ),
                            sec: String(Math.floor(endPos % 60)).padStart(
                                2,
                                "0"
                            ),
                        },
                    });
                }
            }
            const index = playInfo.movieInfo.index || 0;
            playVideo(index, time);
        }
    };

    const getSite = (siteKey) => {
        return siteList.filter((site) => site.site_key === siteKey)[0];
    };

    const playMovieUq = useMemo(() => {
        return playInfo.movieInfo.siteKey + "@" + playInfo.movieInfo.ids;
    }, [playInfo.movieInfo]);

    const playVideo = (index = 0, time = 0) => {
        let site = getSite(playInfo.movieInfo.siteKey);
        let historyInfo = playPage.currentHistory;
        const doHandler = (fullList) => {
            let playlist = fullList[0].list; // ZY支持的已移到首位
            // 如果设定了特定的video flag, 获取该flag下的视频列表
            const videoFlag = playInfo.movieInfo.videoFlag;
            if (videoFlag) {
                fullList.forEach((x, _index) => {
                    if (x.flag == videoFlag) {
                        playlist = x.list;
                    }
                });
            }

            playPage.movieIndex = index;
            playPage.movieList = playlist;
            const url = playlist[index].includes("$")
                ? playlist[index].split("$")[1]
                : playlist[index];

            if (!url.endsWith(".m3u8") && !url.endsWith(".mp4")) {
                if (getIsVipMovies(url)) {
                    messageApi.info("即将调用解析接口播放，请等待...");
                    movieParseUrlInfo.value.vipPlay = true;
                    playInfo.movieInfo.onlineUrl =
                        movieParseUrl.websiteParseUrl + url;
                } else {
                    const newPlayInfo = _.cloneDeep(playInfo);
                    newPlayInfo.movieInfo.onlineUrl = url;
                    newPlayInfo.playType = "iframePlay";
                    togglePlayInfo(newPlayInfo);
                }
                player.destroy();
                videoPlaying("online");
                return;
            } else {
                getPlayer(url, false);
                player.dp.switchVideo({
                    url: url,
                    type: player.dpConfig.video.type,
                });
                // bindOnceEvent();
                // 计算片头跳过时间
                const skipStartTime =
                    parseInt(moviesInfo.startPosition.min) * 60 +
                    parseInt(moviesInfo.startPosition.sec);
                // 使用最大的开始时间（缓存时间或片头跳过时间）
                const finalStartTime = Math.max(time || 0, skipStartTime);
                if (finalStartTime > 0) {
                    player.dp.seek(finalStartTime);
                }
            }
            videoPlaying();
            playerInfo.skipendStatus = false;
        };
        if (historyInfo.detail && historyInfo.detail.fullList) {
            const fullList = historyInfo.detail.fullList;
            doHandler(fullList);
        } else {
            movieApi
                .fetchPlaylist(site, playMovieUq, playInfo.movieInfo.ids)
                .then(async (fullList) => {
                    doHandler(fullList);
                })
                .catch((err) => {
                    console.log(err);
                    messageApi.error("播放地址可能已失效，请换源并调整收藏");
                });
        }
    };

    const videoPlaying = async (isOnline) => {
        // 计算片头片尾位置（秒）
        const startPosition =
            parseInt(moviesInfo.startPosition.min) * 60 +
            parseInt(moviesInfo.startPosition.sec);
        const endPosition =
            parseInt(moviesInfo.endPosition.min) * 60 +
            parseInt(moviesInfo.endPosition.sec);

        if (isOnline) {
            const updateData = {
                id: playPage.currentHistory.id,
                index: playPage.movieIndex,
                onlinePlay: playInfo.movieInfo.onlineUrl,
                startPosition: startPosition,
                endPosition: endPosition,
            };
            await updateHistory(updateData);
        } else {
            timerEvent();
        }
    };

    // 定时更新历史记录时间
    const timerEvent = () => {
        // 清理之前的定时器（如果存在）
        if (historyTimerRef.current) {
            clearInterval(historyTimerRef.current);
            historyTimerRef.current = null;
        }


        // 使用React的方式创建定时器
        const localUpdateHistory = async () => {
            try {
                if (!playPage.currentHistory) {
                    console.warn("当前历史记录为空，跳过更新");
                    return;
                }
                let historyInfo = playPage.currentHistory;
                const mi = getMoviesInfo();
                if (historyInfo) {
                    // 计算片头片尾位置（秒）
                    const startPosition =
                        parseInt(mi.startPosition.min) * 60 +
                        parseInt(mi.startPosition.sec);
                    const endPosition =
                        parseInt(mi.endPosition.min) * 60 +
                        parseInt(mi.endPosition.sec);
                    const currentTime = player.currentTime();
                    const duration = player.duration();
                    // 验证时间数据有效性
                    if (
                        isNaN(currentTime) ||
                        isNaN(duration) ||
                        currentTime < 0
                    ) {
                        console.warn("播放时间数据无效，跳过更新");
                        return;
                    }
                    const updateData = {
                        id: playPage.currentHistory.id,
                        index: playPage.movieIndex,
                        playTime: player.currentTime(),
                        duration: player.duration(),
                        startPosition: startPosition,
                        endPosition: endPosition,
                    };
                    await updateHistory(updateData);
                }
            } catch (error) {
                console.error("更新历史记录失败:", error);
            }
        };

        // 立即执行一次更新
        localUpdateHistory();

        // 创建定时器并保存引用到useRef中
        historyTimerRef.current = setInterval(localUpdateHistory, 10000);
    };

    // 播放下一集
    const prevNextEvent = (isReverse = false) => {
        if (playInfo.playType === "iptv") {
            let index = _.findIndex(channelGroupList, [
                "id",
                playInfo.iptv.channelGroupId,
            ]);
            if (isReverse) {
                index = index === 0 ? channelGroupList.length - 1 : index - 1;
            } else {
                index = index === channelGroupList.length - 1 ? 0 : index + 1;
            }
            const channel = channelGroupList[index];
            playInfo.iptv.channelGroupId = channel.id;
            playInfo.iptv.channelActive = channel.channel_active;
        } else if (playInfo.playType === "localMovie") {
        } else {
            if (isReverse) {
                if (playPage.movieIndex >= 1) {
                    playPage.movieIndex -= 1;
                    emit(GlobalEvent.PlayChangeEvent, {
                        index: playPage.movieIndex,
                        playState: "newPlay",
                    });
                } else {
                    messageApi.warning("这已经是第一集了。");
                }
            } else if (playPage.movieIndex < playPage.movieList.length - 1) {
                playPage.movieIndex += 1;
                emit(GlobalEvent.PlayChangeEvent, {
                    index: playPage.movieIndex,
                    playState: "newPlay",
                });
            } else {
                messageApi.warning("这已经是最后一集了。");
            }
        }
    };

    // 绑定事件
    const bindEvent = () => {
        let dp = player.dp;
        let dpConfig = player.dpConfig;
        dp.on("canplay", () => {
            playPage.playing = true;
            if (dp.video.paused) {
                dp.play();
            }
        });
        dp.on("timeupdate", () => {
            if (dpConfig.isLive || !playInfo.movieInfo.siteKey) return;

            const detail = playPage.cachedDetail || {};
            if (detail && detail.endPosition) {
                const time =
                    dp.video.duration -
                    detail.endPosition -
                    dp.video.currentTime;
                if (time <= 0.25) {
                    // timeupdate每0.25秒触发一次，只有自然播放到该点时才会跳过片尾
                    if (!playerInfo.skipendStatus) {
                        playerInfo.skipendStatus = true;
                        dp.ended();
                    }
                }
            }
        });

        dp.on(
            "ended",
            _.debounce(() => {
                if (
                    playPage.movieList.length > 1 &&
                    playPage.movieList.length - 1 > playPage.movieIndex
                ) {
                    playPage.movieIndex += 1;
                    emit(GlobalEvent.PlayChangeEvent, {
                        index: playPage.movieIndex,
                        playState: "newPlay",
                    });
                }
            }, 1000)
        );

        dp.on("playPrev", () => {
            prevNextEvent(true);
        });

        dp.on("playNext", () => {
            prevNextEvent();
        });
    };

    useEffect(() => {
        getPlayer("", true);

        return () => {
            // 使用useRef清理定时器
            if (historyTimerRef.current) {
                clearInterval(historyTimerRef.current);
                historyTimerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const initUnlisten = async () => {
            const unlisten = await listen(
                GlobalEvent.SmallPlayEvent,
                ({ payload }) => {
                    setPlayMode(payload.playMode);
                    setPlayInfo(payload);
                }
            );
            eventUnlistenFn.current = unlisten;
        };
        initUnlisten();
        return () => {
            if (eventUnlistenFn.current) {
                eventUnlistenFn.current();
            }
        };
    }, []);

    useEffect(() => {
        const initPlay = async () => {
            if (playInfo.playType == "onlineMovie") {
                setPlayMode("local");
                try {
                    let detail = await getMovieDetailCacheData(
                        getSite(playInfo.movieInfo.siteKey),
                        playInfo.movieInfo.ids
                    );
                    // 缓存详情数据供后续使用
                    playPage.cachedDetail = detail;
                    let currentHistory = await getCurrentHistoryOrSave(
                        playInfo,
                        detail
                    );
                    playPage.currentHistory = currentHistory;
                    getUrls();
                } catch {
                    messageApi.error("获取视频资源失败");
                    closePlayerAndInit();
                }
            } else if (playInfo.playType == "iframePlay") {
                setPlayMode("iframePlay");
            } else if (playInfo.playType == "localMovie") {
                setPlayMode("local");
                getUrls();
            }
        };
        initPlay();
    }, [playInfo.playStateTime]);

    const onlinePlayKey = useMemo(() => {
        return playInfo.movieInfo.onlineUrl ? new Date().getTime() : 0;
    }, [playInfo.movieInfo.onlineUrl]);

    const closePlayerAndInit = () => {
        setPlayMode("local");
        playPage.isFirstPlay = true;
        playPage.movieList = [];
        playPage.movieIndex = 0;
        playPage.playing = false;
        getPlayer("", true);
    };

    return (
        <div data-tauri-drag-region className="small-play">
            {contextHolder}
            <div className="box">
                <div
                    className={
                        playMode === "local" ? "player" : "player hidden"
                    }
                >
                    <div id="dpplayer"></div>
                </div>
                <div
                    className={
                        playMode === "iframePlay"
                            ? shortVideoMode
                                ? "iframePlayer short-video-mode"
                                : "iframePlayer"
                            : "iframePlayer hidden"
                    }
                >
                    <iframe
                        id="iframePlayer"
                        key={onlinePlayKey}
                        src={playInfo.movieInfo.onlineUrl}
                        width="100%"
                        height="100%"
                        style={{ border: "none" }}
                        allow="autoplay;fullscreen"
                    ></iframe>
                </div>
            </div>
        </div>
    );
};

export default SmallPlay;
