import { useState, useEffect, useRef, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
    playInfoStore,
    playerConfStore,
    updatePlayInfo,
    updateplayerConf,
    updatePlayInfoIndex,
    resetPlayInfo,
} from "@/store/coreSlice";
import { siteListStore, historyListStore, storeHistoryList } from "@/store/movieSlice";
import { getAllHistory, getCurrentHistory, saveHistory, getDownloadById } from "@/db";
import { MoviesPlayer, getPlayerType, getIsVipMovies } from "@/business/play";
import { getCacheData } from "@/business/cache";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Transition } from "react-transition-group";
import movieApi from "@/api/movies";
import SvgIcon from "@/components/SvgIcon";
import message from "@/components/message";
import { fmtMSS } from "@/utils/common";
import _ from "lodash";
import date from "@/utils/date";
import { osType } from "@/utils/env";
import "./Play.scss";

let player;
let playPage = {
    isFirstPlay: true,
    movieList: [],
    movieIndex: 0,
    historyTimer: null,
    currentHistory: null,
    playing: false,
    stallIptvTimeout: null,
};

const Play = (props) => {
    const dispatch = useAppDispatch();
    const playInfo = useAppSelector(playInfoStore);
    const playerConf = useAppSelector(playerConfStore);
    const siteList = useAppSelector(siteListStore);
    const historyList = useAppSelector(historyListStore);
    const [movieList, setMovieList] = useState([]);
    // localFile 本地文件 local 本地在线 online iframe网页
    const [playMode, setPlayMode] = useState("local");
    const [playing, setPlaying] = useState(false);
    const [menuRigthShowType, setMenuRigthShowType] = useState("");
    const [playerInfo, setPlayerInfo] = useState({
        searchTxt: "",
        skipendStatus: false,
        right: {
            show: false,
            type: "",
        },
        isLive: false,
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
                playerConf,
                showPalyPrevAndNext
            );
            bindEvent();
        } else {
            player.dp.playPrevAndNext(showPalyPrevAndNext);
        }
        playPage.movieIndex = playInfo.movie.index;
    };

    const getUrls = async () => {
        if (!player || !player.dp) getPlayer();
        if (playPage.historyTimer) {
            clearInterval(playPage.historyTimer);
            playPage.historyTimer = null;
        }

        if (playInfo.playType === "iptv") {
            // 是直播源，直接播放
            playChannel(currentChannel.value);
        } else if (playInfo.playType === "localMovie") {
            getDownloadById(playInfo.download.downloadId).then((downloadInfo) => {
                const assetUrl = convertFileSrc(downloadInfo.url);
                player.dp.switchVideo({
                    url: assetUrl,
                    type: "mp4",
                });
            })
        } else {
            // iptvInfo.showChannelGroupList = false;
            const key = playMovieUq;
            let time = undefined;
            // moviesInfo.startPosition = { min: "00", sec: "00" };
            // moviesInfo.endPosition = { min: "00", sec: "00" };
            let currentHistory = playPage.currentHistory;
            if (currentHistory) {
                if (currentHistory.index == playInfo.movie.index) {
                    time = currentHistory.play_time;
                }

                //     if (!videoDetailCache.value[key])
                //         videoDetailCache.value[key] = {};
                //     if (!playInfo.value.movie.videoFlag)
                //         playInfo.value.movie.videoFlag =
                //             currentHistory.value.videoFlag;
                //     if (currentHistory.value.startPosition) {
                //         // 数据库保存的时长通过快捷键设置时可能为小数, this.startPosition为object对应输入框分秒转化到数据库后肯定为整数
                //         videoDetailCache.value[key].startPosition =
                //             currentHistory.value.startPosition;
                //         moviesInfo.startPosition = {
                //             min:
                //                 "" +
                //                 parseInt(currentHistory.value.startPosition / 60),
                //             sec:
                //                 "" +
                //                 parseInt(currentHistory.value.startPosition % 60),
                //         };
                //     }
                //     if (currentHistory.value.endPosition) {
                //         videoDetailCache.value[key].endPosition =
                //             currentHistory.value.endPosition;
                //         moviesInfo.endPosition = {
                //             min:
                //                 "" +
                //                 parseInt(currentHistory.value.endPosition / 60),
                //             sec:
                //                 "" +
                //                 parseInt(currentHistory.value.endPosition % 60),
                //         };
                //     }
            }
            const index = playInfo.movie.index || 0;
            playVideo(index, time);
        }
    };

    const playMovieUq = useMemo(() => {
        return playInfo.movie.siteKey + "@" + playInfo.movie.ids;
    }, [playInfo.movie]);

    const getSite = (siteKey) => {
        return siteList.filter((site) => site.site_key === siteKey)[0];
    };

    const playVideo = (index = 0, time = 0) => {
        // moviesInfo.isStar = false;
        let site = getSite(playInfo.movie.siteKey);
        movieApi
            .fetchPlaylist(site, playMovieUq, playInfo.movie.ids)
            .then(async (fullList) => {
                // moviesInfo.currentMoviesFullList = fullList;
                let playlist = fullList[0].list; // ZY支持的已移到首位
                // 如果设定了特定的video flag, 获取该flag下的视频列表
                const videoFlag = playInfo.movie.videoFlag;
                if (videoFlag) {
                    fullList.forEach((x, index) => {
                        if (x.flag == videoFlag) {
                            playlist = x.list;
                            // moviesInfo.moviesFullListIndex = index;
                        }
                    });
                }
                setMovieList(playlist);
                playPage.movieList = playlist;
                const url = playlist[index].includes("$")
                    ? playlist[index].split("$")[1]
                    : playlist[index];
                if (
                    playlist.every((e) =>
                        e.includes("$")
                            ? e.split("$")[1].endsWith(".m3u8")
                            : e.endsWith(".m3u8")
                    )
                )
                    if (!url.endsWith(".m3u8") && !url.endsWith(".mp4")) {
                        // moviesInfo.exportablePlaylist = true;
                        if (getIsVipMovies(url)) {
                            message.info("即将调用解析接口播放，请等待...");
                            movieParseUrlInfo.value.vipPlay = true;
                            playInfo.value.movie.onlineUrl =
                                movieParseUrl.websiteParseUrl + url;
                        } else {
                            playInfo.value.movie.onlineUrl = url;
                        }
                        player.destroy();
                        setPlayMode("online");
                        videoPlaying("online");
                        return;
                    } else {
                        setPlayMode("local");
                        const key = playMovieUq;
                        getPlayer(url, false);
                        player.dp.switchVideo({
                            url: url,
                            type: player.dpConfig.video.type,
                        });
                        // bindOnceEvent();
                        getCacheData(key).then((data) => {
                            const startTime = data?.startPosition || 0;
                            player.dp.seek(time > startTime ? time : startTime);
                        });
                    }
                videoPlaying();
                playerInfo.skipendStatus = false;
            })
            .catch((err) => {
                console.log(err);
                message.error("播放地址可能已失效，请换源并调整收藏");
                // otherEvent();
            });
    };

    const videoPlaying = async (isOnline) => {
        const videoFlag = playInfo.movie.videoFlag || "";
        let time, duration;
        let startPosition = 0;
        let endPosition = 0;
        if (isOnline) {
            time = duration = 0;
        } else {
            time = player.currentTime();
            duration = player.duration();
        }
        let currentHistory = playPage.currentHistory;
        if (!currentHistory) {
            getCacheData(playMovieUq).then(async (detail) => {
                const history = {
                    history_name: playInfo.name,
                    site_key: playInfo.movie.siteKey,
                    ids: playInfo.movie.ids.toString(),
                    index: playInfo.movie.index,
                    play_time: time,
                    duration: duration,
                    start_position: startPosition,
                    end_position: endPosition,
                    detail: JSON.stringify(detail),
                    online_play: isOnline ? playInfo.movie.onlineUrl : "",
                    video_flag: videoFlag,
                    has_update: "0",
                    update_time: date.getDateTimeStr(),
                };
                saveHistory(history).then(() => {
                    getCurrentHistory(
                        playInfo.movie.siteKey,
                        playInfo.movie.ids.toString()
                    ).then((res) => {
                        playPage.currentHistory = res;
                    });
                });
            });
        }
        if (isOnline) {
            currentHistory.index = playPage.movieIndex;
            currentHistory.online_play = playInfo.movie.onlineUrl;
            currentHistory.update_time = date.getDateTimeStr();
            saveHistory(currentHistory);
        } else {
            timerEvent();
        }
        getAllHistory(true);
    };

    // 定时更新历史记录时间
    const timerEvent = () => {
        playPage.historyTimer = setInterval(async () => {
            if (!playPage.playing) {
                return;
            }
            let historyInfo = playPage.currentHistory;
            if (historyInfo) {
                historyInfo.index = playPage.movieIndex;
                historyInfo.play_time = player.currentTime();
                historyInfo.duration = player.duration();
                historyInfo.update_time = date.getDateTimeStr();
                saveHistory(historyInfo);
            }
        }, 10000);
    };

    const otherEvent = () => {
        if (playInfo.playType != "iptv") {
            playerInfo.right.type = "other";
            getOtherSites();
            moviesInfo.currentTime = player.dp
                ? player.dp.video.currentTime
                : 0;
        } else {
            playerInfo.right.type = "sources";
        }
        playerInfo.right.show = true;
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
                    dispatch(
                        updatePlayInfoIndex({
                            index: playPage.movieIndex,
                            playState: "newPlay",
                        })
                    );
                } else {
                    message.warning("这已经是第一集了。");
                }
            } else if (playPage.movieIndex < playPage.movieList.length - 1) {
                playPage.movieIndex += 1;
                dispatch(
                    updatePlayInfoIndex({
                        index: playPage.movieIndex,
                        playState: "newPlay",
                    })
                );
            } else {
                message.warning("这已经是最后一集了。");
            }
        }
    };

    // 绑定事件
    const bindEvent = () => {
        let dp = player.dp;
        let dpConfig = player.dpConfig;
        let stallCount = 0;
        dp.on("waiting", () => {
            if (
                dpConfig.isLive &&
                playerConf.value.autoChangeSourceWhenIptvStalling
            ) {
                playPage.stallIptvTimeout = setTimeout(() => {
                    stallCount++;
                    if (stallCount >= 4) {
                        stallCount = 0;
                        prevNextEvent();
                    }
                }, 5 * 1000);
            }
        });
        dp.on("canplay", () => {
            playPage.playing = true;
            setPlaying(true);
            stallCount = 0;
            clearTimeout(playPage.stallIptvTimeout);
            if (dp.video.paused) {
                dp.play();
            }
        });
        dp.on("destroy", () => {
            stallCount = 0;
            clearTimeout(playPage.stallIptvTimeout);
        });

        dp.on(
            "volumechange",
            _.debounce(async () => {
                dispatch(
                    updateplayerConf({
                        key: "volume",
                        value: player.dp.video.volume,
                    })
                );
            }, 500)
        );

        dp.on("timeupdate", () => {
            if (dpConfig.isLive || !playInfo.movie.siteKey) return;
            const key = playMovieUq;
            getCacheData(key).then((data) => {
                if (data && data.endPosition) {
                    const time =
                        dp.video.duration -
                        data.endPosition -
                        dp.video.currentTime;
                    if (time > 0 && time < 0.3) {
                        // timeupdate每0.25秒触发一次，只有自然播放到该点时才会跳过片尾
                        if (!playerInfo.skipendStatus) {
                            playerInfo.skipendStatus = true;
                            dp.ended();
                        }
                    }
                }
            });
        });

        dp.on("play", async () => {
            clearTimeout(playPage.stallIptvTimeout);
            if (playPage.isFirstPlay) {
                getAllHistory(true).then((res) => {
                    const newHistoryList = res;
                    // 如果当前播放页面的播放信息没有被赋值,播放历史记录
                    if (newHistoryList.length === 0) {
                        message.warning("历史记录为空，无法播放！");
                        return;
                    }
                    const historyItem = newHistoryList[0];
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
                        movie: {
                            siteKey: historyItem.site_key,
                            ids: historyItem.ids,
                            index: historyItem.index,
                            videoFlag: "",
                            onlineUrl: "",
                        },
                    };
                    dispatch(updatePlayInfo({ playInfo }));
                });
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
                    dispatch(
                        updatePlayInfoIndex({
                            index: playPage.movieIndex,
                            playState: "newPlay",
                        })
                    );
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
            if (osType.toLowerCase().includes("mobile")) {
                screen.orientation.lock("landscape-primary");
            }
        });

        dp.on("fullscreen_cancel", async () => {
            if (osType.toLowerCase().includes("mobile")) {
                screen.orientation.unlock();
            }
        });
    };

    useEffect(() => {
        getAllHistory().then((res) => {
            dispatch(storeHistoryList({historyList: res, forceRefresh: true}));
        })
        getPlayer("", true);

        return () => {
            if (playPage.historyTimer) clearInterval(playPage.historyTimer);
            if (playPage.stallIptvTimeout)
                clearTimeout(playPage.stallIptvTimeout);
        };
    }, []);

    useEffect(() => {
        if (playInfo.playState !== "newPlay" && !playInfo.movie.siteKey) return;
        playPage.isFirstPlay = false;
        if (playInfo.playType == "onlineMovie") {
            getCurrentHistory(
                playInfo.movie.siteKey,
                playInfo.movie.ids.toString()
            ).then((res) => {
                playPage.currentHistory = res;
                getUrls();
            });
        } else {
            getUrls();
        }
    }, [playInfo.playStateTime]);

    const onlinePlayKey = useMemo(() => {
        return playInfo.movie.onlineUrl ? new Date().getTime() : 0;
    }, [playInfo.movie.onlineUrl]);

    const closePlayerAndInit = () => {
        dispatch(resetPlayInfo());
        playPage.isFirstPlay = true;
        playPage.movieList = [];
        playPage.movieIndex = 0;
        playPage.playing = false;
        setPlaying(false);
        setMovieList([]);
        getPlayer("", true);
    };

    const menuRigthShowTypeChange = (type) => {
        if (type == menuRigthShowType) {
            setMenuRigthShowType("");
        } else {
            setMenuRigthShowType(type);
        }
    };

    const getMenuRigthName = () => {
        let mrn;
        switch (menuRigthShowType) {
            case "channelGroupList":
                break;
            case "movieList":
                mrn = "播放列表";
                break;
        }
        return mrn;
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
            dispatch(
                updatePlayInfoIndex({
                    index: n,
                    playState: "newPlay",
                })
            );
        }
    };

    return (
        <div className={props.className ? "play " + props.className : "play"}>
            <div className="box">
                <div className="title">
                    {movieList.length > 1 ? (
                        <span>『第 {playInfo.movie.index + 1} 集』</span>
                    ) : (
                        ""
                    )}
                    <span>{playInfo.name}</span>
                    <div className="right" onClick={() => closePlayerAndInit()}>
                        <SvgIcon name="close" />
                    </div>
                </div>
                <div
                    className={
                        playMode !== "online" ? "player" : "player hidden"
                    }
                >
                    <div id="dpplayer"></div>
                </div>
                <div
                    className={
                        playMode === "online"
                            ? "iframePlayer"
                            : "iframePlayer hidden"
                    }
                >
                    <iframe
                        id="iframePlayer"
                        key={onlinePlayKey}
                        v-bind:src={playInfo.movie.onlineUrl}
                        width="100%"
                        height="100%"
                        allow="autoplay;fullscreen"
                    ></iframe>
                </div>
                <div
                    className={
                        !playing && historyList.length > 0 && historyList[0]
                            ? "more"
                            : "more hidden"
                    }
                >
                    <span className="last-tip">
                        <span>
                            上次播放到:【{historyList[0]?.site_key}】
                            {historyList[0]?.history_name}第
                            {historyList[0]?.index + 1}集
                        </span>
                        <span
                            className={
                                historyList[0]?.time && historyList[0]?.duration
                                    ? ""
                                    : "hidden"
                            }
                        >
                            {fmtMSS(historyList[0]?.time?.toFixed(0))}/
                            {fmtMSS(historyList[0]?.duration?.toFixed(0))}
                        </span>
                        <span
                            className={
                                historyList[0]?.onlinePlay ? "" : "hidden"
                            }
                        >
                            在线解析
                        </span>
                    </span>
                </div>
                <div className="list">
                    <div className="listTitle">剧集</div>
                    <div className="episode-list">
                        {movieList.length == 0 ? (
                            <li>无数据</li>
                        ) : (
                            movieList.map((i, j) => {
                                return (
                                    <div onClick={() => listItemEvent(j)}
                                        className={
                                            playInfo.movie.index === j
                                                ? "episode active"
                                                : "episode"
                                        }
                                        key={j}>
                                        {ftName(i)}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Play;
