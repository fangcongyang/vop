import React, {
    useState,
    useEffect,
    useRef,
    useMemo,
    useCallback,
} from "react";
import { getDownloadInfoById } from "@/api/downloadInfo";
import {
    selectAllHistory,
    updateHistory,
    getCurrentHistoryOrSave,
} from "@/api/history";
import { emit, listen } from "@tauri-apps/api/event";
import { MoviesPlayer, getPlayerType, getIsVipMovies } from "@/business/play";
import { getMovieDetailCacheData } from "@/business/cache";
import { convertFileSrc } from "@tauri-apps/api/core";
import movieApi from "@/api/movies";
import SvgIcon from "@/components/SvgIcon";
import Waterfall from "@/components/Waterfall";
import MovieCard from "@/components/MovieCard";
import { message, Button, Tooltip, Input, Space } from "antd";
import QRCodeModal from "@/components/QRCodeModal";
import { fmtMSS } from "@/utils/common";
import { useGetState } from "@/hooks";
import { useGlobalStore } from "@/store/useGlobalStore";
import _ from "lodash";
import { invoke } from "@tauri-apps/api/core";
import { toggleScreenOrientation } from "tauri-plugin-vop-api";
import { GlobalEvent } from "@/business/types";
import "./Play.scss";
import {
    QrcodeOutlined,
    FullscreenExitOutlined,
    FullscreenOutlined,
    PlayCircleOutlined,
    PoweroffOutlined,
} from "@ant-design/icons";
import { useMovieStore } from "@/store/useMovieStore";

let player;
let playPage = {
    isFirstPlay: true,
    movieList: [],
    movieIndex: 0,
    currentHistory: null,
    playing: false,
    cancelAutoPlay: false,
};

const Play = (props) => {
    const siteList = useGlobalStore((s) => s.siteList);
    const osType = useGlobalStore((state) => state.osType);
    const [messageApi, contextHolder] = message.useMessage();
    const playInfo = useGlobalStore((state) => state.playInfo);
    const togglePlayInfo = useGlobalStore((state) => state.togglePlayInfo);
    const updatePlayInfoIndex = useGlobalStore(
        (state) => state.updatePlayInfoIndex
    );
    const resetPlayInfo = useGlobalStore((state) => state.resetPlayInfo);
    const historyInfoList = useMovieStore((state) => state.historyInfoList);
    const toggleHistoryInfoList = useMovieStore(
        (state) => state.toggleHistoryInfoList
    );
    const [movieList, setMovieList] = useState([]);
    const playChangeEventUnlistenFn = useRef(null);

    // 监听historyList变化，获取第一条历史记录
    const firstHistoryItem = useMemo(() => {
        return historyInfoList && historyInfoList.length > 0
            ? historyInfoList[0]
            : null;
    }, [historyInfoList]);

    // 使用useRef来管理定时器ID，避免使用全局变量
    const historyTimerRef = useRef(null);
    // localFile 本地文件 local 本地在线 online iframe网页
    const [playMode, setPlayMode] = useState("local");
    const [playing, setPlaying] = useState(false);

    const [qrCodeVisible, setQrCodeVisible] = useState(false);
    const [currentPlayUrl, setCurrentPlayUrl] = useState("");
    const [smallPlayVisible, setSmallPlayVisible] = useState(false);
    const [playerInfo, _setPlayerInfo] = useState({
        searchTxt: "",
        skipendStatus: false,
        right: {
            show: false,
            type: "",
        },
        isLive: false,
    });

    // 创建moviesInfo响应对象
    const [moviesInfo, setMoviesInfo, getMoviesInfo] = useGetState({
        currentTime: 0,
        otherSiteMoviesSources: [],
        startPosition: { min: "00", sec: "00" },
        endPosition: { min: "00", sec: "00" },
    });

    // 短剧模式状态 - 只在桌面端生效
    const [shortVideoMode, setShortVideoMode] = useState(() => {
        // 从本地存储中获取用户偏好，但只在桌面端生效
        const savedMode = localStorage.getItem("shortVideoMode");
        return savedMode === "true" && osType.startsWith("desktop");
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
            playChannel(currentChannel.value);
        } else if (playInfo.playType === "localMovie") {
            getDownloadInfoById({ id: playInfo.download.downloadId }).then(
                (downloadInfo) => {
                    const assetUrl = convertFileSrc(downloadInfo.url);
                    player.dp.switchVideo({
                        url: assetUrl,
                        type: "mp4",
                    });
                    if (smallPlayVisible) {
                        emit("smallPlayEvent", playInfo);
                        playPage.cancelAutoPlay = true;
                        const dp = player.dp;
                        dp.pause();
                        return;
                    }
                }
            );
        } else {
            // iptvInfo.showChannelGroupList = false;
            const _key = playMovieUq;
            let time = undefined;
            // 初始化片头片尾位置
            setMoviesInfo((prev) => ({
                ...prev,
                startPosition: { min: "00", sec: "00" },
                endPosition: { min: "00", sec: "00" },
            }));

            // 从localStorage恢复片头片尾设置
            const timingKey = `timing_${_key}`;
            const savedTiming = localStorage.getItem(timingKey);
            if (savedTiming) {
                try {
                    const timing = JSON.parse(savedTiming);
                    setMoviesInfo((prev) => ({
                        ...prev,
                        startPosition: timing.startPosition || {
                            min: "00",
                            sec: "00",
                        },
                        endPosition: timing.endPosition || {
                            min: "00",
                            sec: "00",
                        },
                    }));
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
                    setMoviesInfo((prev) => ({
                        ...prev,
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
                    }));
                }
                if (currentHistory.end_position) {
                    const endPos = currentHistory.end_position;
                    setMoviesInfo((prev) => ({
                        ...prev,
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
                    }));
                }
            }
            const index = playInfo.movieInfo.index || 0;
            playVideo(index, time);
        }
    };

    const playMovieUq = useMemo(() => {
        return playInfo.movieInfo.siteKey + "@" + playInfo.movieInfo.ids;
    }, [playInfo.movieInfo]);

    const getSite = (siteKey) => {
        return siteList.filter((site) => site.site_key === siteKey)[0];
    };

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
            setMovieList(playlist);
            playPage.movieList = playlist;
            const url = playlist[index].includes("$")
                ? playlist[index].split("$")[1]
                : playlist[index];

            // 保存当前播放URL用于二维码显示
            setCurrentPlayUrl(url);
            if (!url.endsWith(".m3u8") && !url.endsWith(".mp4")) {
                if (getIsVipMovies(url)) {
                    messageApi.info("即将调用解析接口播放，请等待...");
                    movieParseUrlInfo.value.vipPlay = true;
                    playInfo.movieInfo.onlineUrl =
                        movieParseUrl.websiteParseUrl + url;
                    // 更新在线解析URL用于二维码
                    setCurrentPlayUrl(movieParseUrl.websiteParseUrl + url);
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
                if (smallPlayVisible) {
                    emit("smallPlayEvent", playInfo);
                    playPage.cancelAutoPlay = true;
                    const dp = player.dp;
                    dp.pause();
                    return;
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
            if (!playPage.playing) {
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
        };

        // 立即执行一次更新
        localUpdateHistory();

        // 创建定时器并保存引用到useRef中
        historyTimerRef.current = setInterval(localUpdateHistory, 10000);
    };

    // 使用 useMemo 缓存活跃站点列表
    const activeSites = useMemo(() => {
        if (!playInfo.movieInfo.siteKey) return [];

        const currentSite = getSite(playInfo.movieInfo.siteKey);
        if (!currentSite) return [];

        return siteList.filter(
            (x) =>
                x.is_active &&
                x.site_group === currentSite.site_group &&
                x.site_key !== playInfo.movieInfo.siteKey
        );
    }, [playInfo.movieInfo.siteKey, siteList]);

    // 获取其他站点资源的函数
    const getOtherSiteMovies = useCallback(async () => {
        // 检查必要条件
        if (
            !playInfo.name ||
            !playInfo.movieInfo.siteKey ||
            activeSites.length === 0
        ) {
            setMoviesInfo((prev) => ({ ...prev, otherSiteMoviesSources: [] }));
            return;
        }

        // 重置其他站点资源
        setMoviesInfo((prev) => ({ ...prev, otherSiteMoviesSources: [] }));

        try {
            // 统一处理搜索结果的函数
            const normalizeResult = (item, siteItem) => ({
                ...item,
                key: siteItem.site_key,
                site: siteItem,
                site_key: siteItem.site_key,
                site_name: siteItem.site_name,
            });

            // 并行搜索所有站点
            const searchPromises = activeSites.map(async (siteItem) => {
                try {
                    const searchRes = await movieApi.search(
                        siteItem,
                        playInfo.name || firstHistoryItem?.history_name
                    );

                    if (Array.isArray(searchRes)) {
                        return searchRes.map((item) =>
                            normalizeResult(item, siteItem)
                        );
                    } else if (searchRes && typeof searchRes === "object") {
                        return [normalizeResult(searchRes, siteItem)];
                    }
                    return [];
                } catch (error) {
                    console.error(
                        `搜索站点 ${siteItem.site_name} 失败:`,
                        error
                    );
                    return [];
                }
            });

            const results = await Promise.all(searchPromises);
            const allResults = results.flat();

            setMoviesInfo((prev) => ({
                ...prev,
                otherSiteMoviesSources: allResults,
            }));
        } catch (error) {
            console.error("获取其他站点资源失败:", error);
            setMoviesInfo((prev) => ({ ...prev, otherSiteMoviesSources: [] }));
        }
    }, [playInfo.name, activeSites, firstHistoryItem?.history_name]);

    // 使用 useEffect 触发获取其他站点资源，添加防抖
    useEffect(() => {
        if (!playInfo.name || !playInfo.movieInfo.siteKey) return;

        const timer = setTimeout(() => {
            getOtherSiteMovies();
        }, 300); // 300ms 防抖

        return () => clearTimeout(timer);
    }, [getOtherSiteMovies, playInfo.name, playInfo.movieInfo.siteKey]);

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
                    updatePlayInfoIndex({
                        index: playPage.movieIndex,
                        playState: "newPlay",
                    });
                } else {
                    messageApi.warning("这已经是第一集了。");
                }
            } else if (playPage.movieIndex < playPage.movieList.length - 1) {
                playPage.movieIndex += 1;
                updatePlayInfoIndex({
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
            setPlaying(true);
            if (!playPage.cancelAutoPlay && dp.video.paused) {
                dp.play();
            } else {
                playPage.cancelAutoPlay = false;
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

        dp.on("play", async () => {
            if (playPage.isFirstPlay) {
                const localHistoryList = await selectAllHistory();
                if (localHistoryList.length === 0) {
                    messageApi.warning("历史记录为空，无法播放！");
                    return;
                }
                const historyItem = localHistoryList[0];
                let playInfo = {
                    playState: "newPlay",
                    // iptv onlineMovie localMovie
                    playType: "onlineMovie",
                    isLive: false,
                    name: historyItem.history_name,
                    iptv: {
                        channelGroupId: 0,
                        channelActive: "",
                    },
                    download: {
                        downloadId: 0,
                    },
                    movieInfo: {
                        siteKey: historyItem.site_key,
                        ids: historyItem.ids,
                        index: historyItem.index,
                        videoFlag: "",
                        onlineUrl: "",
                    },
                };
                togglePlayInfo(playInfo);
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
                    updatePlayInfoIndex({
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

        dp.on("fullscreen", async () => {
            toggleScreenOrientation("");
        });

        dp.on("fullscreen_cancel", async () => {
            toggleScreenOrientation("");
        });
    };

    const updateSelectAllHistory = () => {
        selectAllHistory().then((res) => {
            toggleHistoryInfoList(res);
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



    const initPlay = async () => {
        playPage.isFirstPlay = false;
        if (playInfo.playType == "onlineMovie") {
            setPlayMode("local");
            try {
                const site = getSite(playInfo.movieInfo.siteKey);
                if (!site || !site.site_key) {
                    return;
                }
                let detail = await getMovieDetailCacheData(
                    site,
                    playInfo.movieInfo.ids
                );
                // 缓存详情数据供后续使用
                playPage.cachedDetail = detail;
                let currentHistory = await getCurrentHistoryOrSave(
                    playInfo,
                    detail
                );
                updateSelectAllHistory();
                playPage.currentHistory = currentHistory;
                getUrls();
            } catch (err) {
                console.error("获取视频资源失败:", err);
                closePlayerAndInit();
            }
        } else if (playInfo.playType == "iframePlay") {
            setPlayMode("iframePlay");
        } else if (playInfo.playType == "localMovie") {
            setPlayMode("local");
            setMovieList([]);
            getUrls();
        }
    };

    useEffect(() => {
        if (playInfo.playState !== "newPlay" && !playInfo.movieInfo.siteKey)
            return;
        initPlay();
    }, [playInfo.playStateTime]);

    useEffect(() => {
        invoke("create_top_small_play_window", {
            createWindow: smallPlayVisible,
            shortVideoMode: shortVideoMode,
        });
        if (smallPlayVisible) {
            setTimeout(() => {
                let dp = player.dp;
                dp.pause();
                emit("smallPlayEvent", playInfo);
            }, 2000);
        }
    }, [smallPlayVisible]);

    useEffect(() => {
        updateSelectAllHistory();
        const initUnlisten = async () => {
            const unlisten = await listen(
                GlobalEvent.PlayChangeEvent,
                (payload) => {
                    updatePlayInfoIndex(payload);
                }
            );
            playChangeEventUnlistenFn.current = unlisten;
        };
        initUnlisten();
        return () => {
            if (playChangeEventUnlistenFn.current) {
                playChangeEventUnlistenFn.current();
            }
        };
    }, []);

    const onlinePlayKey = useMemo(() => {
        if (smallPlayVisible) {
            emit("smallPlayEvent", playInfo);
            return;
        }
        return playInfo.movieInfo.onlineUrl ? new Date().getTime() : 0;
    }, [playInfo.movieInfo.onlineUrl]);

    const closePlayerAndInit = () => {
        resetPlayInfo();
        setPlayMode("local");
        playPage.isFirstPlay = true;
        playPage.movieList = [];
        playPage.movieIndex = 0;
        playPage.playing = false;
        setPlaying(false);
        setMovieList([]);
        getPlayer("", true);
    };

    const ftName = (e, n) => {
        const num = e.split("$");
        if (num.length > 1) {
            return e.split("$")[0];
        } else {
            return `第${n + 1}集`;
        }
    };

    const listItemEvent = (n) => {
        if (playInfo.playType == "iptv") {
            const channel = channelGroupList.value[n];
            // 是直播源，直接播放
            playInfo.value.iptv.channelGroupId = channel.id;
            playInfo.value.iptv.channelActive = channel.channel_active;
        } else if (playInfo.playType == "localMovie") {
            const movie = downloadList.value[n];
            playInfo.value.download.downloadId = movie.id;
        } else {
            updatePlayInfoIndex({
                index: n,
                playState: "newPlay",
            });
        }
    };

    // 显示二维码弹窗
    const showQRCode = () => {
        setQrCodeVisible(true);
    };

    // 关闭二维码弹窗
    const closeQRCode = () => {
        setQrCodeVisible(false);
    };

    return (
        <div className={props.className ? "play " + props.className : "play"}>
            {contextHolder}
            <div className="box">
                <div className="title">
                    {playing || playMode === "iframePlay" ? (
                        <>
                            {movieList.length > 1 ? (
                                <span>
                                    『第 {playInfo.movieInfo.index + 1} 集』
                                </span>
                            ) : (
                                ""
                            )}
                            <span className="span-one-line">
                                {playInfo.name}
                            </span>
                            {currentPlayUrl && (
                                <Tooltip title="显示播放链接二维码">
                                    <Button
                                        type="text"
                                        icon={<QrcodeOutlined />}
                                        onClick={showQRCode}
                                        style={{ marginLeft: "8px" }}
                                    />
                                </Tooltip>
                            )}
                        </>
                    ) : (
                        firstHistoryItem && (
                            <div className="span-one-line">
                                <strong>上次播放到:</strong> 【
                                {firstHistoryItem?.site_key}】
                                {firstHistoryItem?.history_name}第
                                {firstHistoryItem?.index + 1}集
                                <span
                                    className={
                                        firstHistoryItem?.time &&
                                        firstHistoryItem?.duration
                                            ? ""
                                            : "hidden"
                                    }
                                >
                                    {fmtMSS(firstHistoryItem?.time?.toFixed(0))}
                                    /
                                    {fmtMSS(
                                        firstHistoryItem?.duration?.toFixed(0)
                                    )}
                                </span>
                                <span
                                    className={
                                        firstHistoryItem?.onlinePlay
                                            ? ""
                                            : "hidden"
                                    }
                                >
                                    在线解析
                                </span>
                            </div>
                        )
                    )}
                    {/* 只在桌面端显示短剧模式切换按钮 */}
                    {osType.startsWith("desktop") && (
                        <Tooltip
                            title={
                                shortVideoMode
                                    ? "切换到正常模式"
                                    : "切换到短剧模式"
                            }
                        >
                            <Button
                                type="text"
                                icon={
                                    shortVideoMode ? (
                                        <FullscreenOutlined />
                                    ) : (
                                        <FullscreenExitOutlined />
                                    )
                                }
                                onClick={() => {
                                    const newMode = !shortVideoMode;
                                    setShortVideoMode(newMode);
                                    // 保存用户偏好到本地存储
                                    localStorage.setItem(
                                        "shortVideoMode",
                                        newMode.toString()
                                    );
                                }}
                                style={{ marginLeft: "8px" }}
                            />
                        </Tooltip>
                    )}
                    {/* 只在桌面端显示短剧模式切换按钮 */}
                    {osType.startsWith("desktop") && (
                        <Tooltip
                            title={
                                smallPlayVisible
                                    ? "关闭小窗口播放"
                                    : "打开小窗口播放"
                            }
                        >
                            <Button
                                type="text"
                                icon={
                                    smallPlayVisible ? (
                                        <PoweroffOutlined />
                                    ) : (
                                        <PlayCircleOutlined />
                                    )
                                }
                                onClick={() => {
                                    const newMode = !smallPlayVisible;
                                    setSmallPlayVisible(newMode);
                                }}
                                style={{ marginLeft: "8px" }}
                            />
                        </Tooltip>
                    )}
                    <div className="right" onClick={() => closePlayerAndInit()}>
                        <SvgIcon name="close" />
                    </div>
                </div>
                <div
                    className={
                        playMode === "local"
                            ? shortVideoMode
                                ? "player short-video-mode"
                                : "player"
                            : "player hidden"
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

                {/* 片头片尾设置 */}
                {playing && (
                    <div
                        className={`play-timing-section pb-3 ${
                            shortVideoMode ? "short-video-timing" : ""
                        }`}
                    >
                        <h2>片头片尾</h2>
                        <div className="timing-controls">
                            <Space size="large" wrap>
                                <div className="timing-item">
                                    <span className="timing-label">
                                        片头跳过：
                                    </span>
                                    <Space.Compact>
                                        <Input
                                            style={{ width: 60 }}
                                            value={moviesInfo.startPosition.min}
                                            onChange={(e) => {
                                                const value = e.target.value
                                                    .replace(/\D/g, "")
                                                    .slice(0, 2);
                                                const newMoviesInfo = {
                                                    ...moviesInfo,
                                                    startPosition: {
                                                        ...moviesInfo.startPosition,
                                                        min: value || "00",
                                                    },
                                                };
                                                setMoviesInfo(newMoviesInfo);

                                                // 实时保存到localStorage
                                                const timingKey = `timing_${playMovieUq}`;
                                                const timingData = {
                                                    startPosition:
                                                        newMoviesInfo.startPosition,
                                                    endPosition:
                                                        newMoviesInfo.endPosition,
                                                    timestamp: Date.now(),
                                                };
                                                localStorage.setItem(
                                                    timingKey,
                                                    JSON.stringify(timingData)
                                                );
                                            }}
                                            placeholder="分"
                                            maxLength={2}
                                        />
                                        <span
                                            style={{
                                                padding: "0 8px",
                                                lineHeight: "32px",
                                            }}
                                        >
                                            分
                                        </span>
                                        <Input
                                            style={{ width: 60 }}
                                            value={moviesInfo.startPosition.sec}
                                            onChange={(e) => {
                                                const value = e.target.value
                                                    .replace(/\D/g, "")
                                                    .slice(0, 2);
                                                if (
                                                    value === "" ||
                                                    parseInt(value) <= 59
                                                ) {
                                                    const newMoviesInfo = {
                                                        ...moviesInfo,
                                                        startPosition: {
                                                            ...moviesInfo.startPosition,
                                                            sec: value || "00",
                                                        },
                                                    };
                                                    setMoviesInfo(
                                                        newMoviesInfo
                                                    );

                                                    // 实时保存到localStorage
                                                    const timingKey = `timing_${playMovieUq}`;
                                                    const timingData = {
                                                        startPosition:
                                                            newMoviesInfo.startPosition,
                                                        endPosition:
                                                            newMoviesInfo.endPosition,
                                                        timestamp: Date.now(),
                                                    };
                                                    localStorage.setItem(
                                                        timingKey,
                                                        JSON.stringify(
                                                            timingData
                                                        )
                                                    );
                                                }
                                            }}
                                            placeholder="秒"
                                            maxLength={2}
                                        />
                                        <span
                                            style={{
                                                padding: "0 8px",
                                                lineHeight: "32px",
                                            }}
                                        >
                                            秒
                                        </span>
                                    </Space.Compact>
                                </div>
                                <div className="timing-item">
                                    <span className="timing-label">
                                        片尾跳过：
                                    </span>
                                    <Space.Compact>
                                        <Input
                                            style={{ width: 60 }}
                                            value={moviesInfo.endPosition.min}
                                            onChange={(e) => {
                                                const value = e.target.value
                                                    .replace(/\D/g, "")
                                                    .slice(0, 2);
                                                const newMoviesInfo = {
                                                    ...moviesInfo,
                                                    endPosition: {
                                                        ...moviesInfo.endPosition,
                                                        min: value || "00",
                                                    },
                                                };
                                                setMoviesInfo(newMoviesInfo);

                                                // 实时保存到localStorage
                                                const timingKey = `timing_${playMovieUq}`;
                                                const timingData = {
                                                    startPosition:
                                                        newMoviesInfo.startPosition,
                                                    endPosition:
                                                        newMoviesInfo.endPosition,
                                                    timestamp: Date.now(),
                                                };
                                                localStorage.setItem(
                                                    timingKey,
                                                    JSON.stringify(timingData)
                                                );
                                            }}
                                            placeholder="分"
                                            maxLength={2}
                                        />
                                        <span
                                            style={{
                                                padding: "0 8px",
                                                lineHeight: "32px",
                                            }}
                                        >
                                            分
                                        </span>
                                        <Input
                                            style={{ width: 60 }}
                                            value={moviesInfo.endPosition.sec}
                                            onChange={(e) => {
                                                const value = e.target.value
                                                    .replace(/\D/g, "")
                                                    .slice(0, 2);
                                                if (
                                                    value === "" ||
                                                    parseInt(value) <= 59
                                                ) {
                                                    const newMoviesInfo = {
                                                        ...moviesInfo,
                                                        endPosition: {
                                                            ...moviesInfo.endPosition,
                                                            sec: value || "00",
                                                        },
                                                    };
                                                    setMoviesInfo(
                                                        newMoviesInfo
                                                    );

                                                    // 实时保存到localStorage
                                                    const timingKey = `timing_${playMovieUq}`;
                                                    const timingData = {
                                                        startPosition:
                                                            newMoviesInfo.startPosition,
                                                        endPosition:
                                                            newMoviesInfo.endPosition,
                                                        timestamp: Date.now(),
                                                    };
                                                    localStorage.setItem(
                                                        timingKey,
                                                        JSON.stringify(
                                                            timingData
                                                        )
                                                    );
                                                }
                                            }}
                                            placeholder="秒"
                                            maxLength={2}
                                        />
                                        <span
                                            style={{
                                                padding: "0 8px",
                                                lineHeight: "32px",
                                            }}
                                        >
                                            秒
                                        </span>
                                    </Space.Compact>
                                </div>
                                <Button
                                    type="primary"
                                    size="small"
                                    onClick={() => {
                                        // 保存到localStorage
                                        const timingKey = `timing_${playMovieUq}`;
                                        const timingData = {
                                            startPosition:
                                                moviesInfo.startPosition,
                                            endPosition: moviesInfo.endPosition,
                                            timestamp: Date.now(),
                                        };
                                        localStorage.setItem(
                                            timingKey,
                                            JSON.stringify(timingData)
                                        );

                                        // 立即保存设置到历史记录
                                        if (playPage.currentHistory) {
                                            const startPosition =
                                                parseInt(
                                                    moviesInfo.startPosition.min
                                                ) *
                                                    60 +
                                                parseInt(
                                                    moviesInfo.startPosition.sec
                                                );
                                            const endPosition =
                                                parseInt(
                                                    moviesInfo.endPosition.min
                                                ) *
                                                    60 +
                                                parseInt(
                                                    moviesInfo.endPosition.sec
                                                );

                                            const updateData = {
                                                id: playPage.currentHistory.id,
                                                startPosition: startPosition,
                                                endPosition: endPosition,
                                            };
                                            updateHistory(updateData);
                                        }

                                        message.success(
                                            "片头片尾设置已保存到本地和历史记录"
                                        );
                                    }}
                                >
                                    保存设置
                                </Button>
                            </Space>
                        </div>
                    </div>
                )}
                <div
                    className={`play-episodes-section pb-3 ${
                        shortVideoMode ? "short-video-episodes" : ""
                    }`}
                    style={{ display: movieList.length == 0 ? "none" : "" }}
                >
                    <h2>剧集选择</h2>
                    <div className="play-episodes-grid">
                        {movieList.map((i, j) => (
                            <div
                                key={j}
                                className={`play-episode-btn ${
                                    playInfo.movieInfo.index === j
                                        ? "play-episode-btn-active"
                                        : ""
                                }`}
                                onClick={() => listItemEvent(j)}
                            >
                                <span>{ftName(i)}</span>
                            </div>
                        ))}
                    </div>
                </div>
                {/* 其他站点播放资源 */}
                {moviesInfo.otherSiteMoviesSources &&
                    moviesInfo.otherSiteMoviesSources.length > 0 && (
                        <div
                            id="otherSiteMoviesSources"
                            className={`play-other-sites-section pb-3 ${
                                shortVideoMode ? "short-video-other-sites" : ""
                            }`}
                        >
                            <h2>其他站点</h2>
                            <Waterfall
                                list={moviesInfo.otherSiteMoviesSources}
                                domId="otherSiteMoviesSources"
                                rowKey={["site_key", "id"]}
                                gutter={10}
                                tipMessage="暂无其他站点资源"
                                initYzb={10}
                                breakpoints={{
                                    1400: { rowPerView: 6 },
                                    1200: { rowPerView: 5 },
                                    1000: { rowPerView: 4 },
                                    800: { rowPerView: 3 },
                                    500: { rowPerView: 2 },
                                }}
                            >
                                <MovieCard viewMode="play" />
                            </Waterfall>
                        </div>
                    )}
            </div>

            {/* 二维码弹窗 */}
            <QRCodeModal
                visible={qrCodeVisible}
                url={currentPlayUrl}
                onClose={closeQRCode}
            />
        </div>
    );
};

export default Play;
