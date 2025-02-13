import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useGetState } from "@/hooks";
import { pageActiveStore, updatePlayInfo } from "@/store/coreSlice";
import { detailInfoStore } from "@/store/movieSlice";
import MovieCard from "@/components/MovieCard";
import SvgIcon from "@/components/SvgIcon";
import Waterfall from "@/components/Waterfall";
import { getCurrentHistory, getSiteByKey, starMovie } from "@/db";
import { cacheData, getCacheData } from "@/business/cache";
import movieApi from "@/api/movies";
import doubanApi from "@/api/douban";
import _ from "lodash";
import "./Detail.scss";

const Detail = (props) => {
    const dispatch = useAppDispatch();
    const detailInfo = useAppSelector(detailInfoStore);
    const pageActive = useAppSelector(pageActiveStore);
    const [loading, setLoading] = useState(false);
    const [videoFlag, setVideoFlag, getVideoFlag] = useGetState("");
    const [selectedEpisode, setSelectedEpisode] = useState(0);
    const [info, setInfo] = useState({});
    const [doubanRate, setDoubanRate] = useState(null);
    const [doubanRecommendations, setDoubanRecommendations] = useState([]);
    const [maxWidth, setMaxWidth] = useState(0);

    useEffect(() => {
        if (pageActive === "detail") {
            setMaxWidth(0);
            getDetailInfo();
        }
    }, [detailInfo.ids]);

    const getDetailInfo = async () => {
        setLoading(true);
        const cacheKey = `${detailInfo.siteKey}@${detailInfo.ids}`;
        const history = await getCurrentHistory(
            detailInfo.siteKey,
            detailInfo.ids
        );
        if (history) {
            setVideoFlag(history.videoFlag);
            setSelectedEpisode(history.index);
        }

        let res = await getCacheData(cacheKey);
        if (_.isEmpty(res)) {
            const currentSite = await getSiteByKey(detailInfo.siteKey);
            res = await movieApi.detail(currentSite, detailInfo.ids);
            cacheData(cacheKey, res);
        }
        handlerDetailData(res);
    };

    useEffect(() => {
        // 获取所有具有指定类名的节点
        const items = document.querySelectorAll(".episode-btn");
        if (items.length == 0) return;

        // 初始化最大宽度
        let maxWidth = 0;

        // 遍历所有节点，计算最大宽度
        items.forEach((item) => {
            const itemWidth = item.offsetWidth; // 获取节点的宽度
            if (itemWidth > maxWidth) {
                maxWidth = itemWidth; // 更新最大宽度
            }
        });
        maxWidth > 0 && setMaxWidth(Math.ceil(maxWidth) + 1);
    }, [info.videoList]);

    const handlerDetailData = async (res) => {
        if (res) {
            const di = {
                ...res,
                rate: res.rate || "",
                recommendations: res.recommendations || [],
                videoList: res.fullList[0].list,
                videoFullList: res.fullList,
            };
            setVideoFlag(getVideoFlag() || res.fullList[0].flag);
            setInfo(di);
            setLoading(false);
            if (!info.rate) {
                getDoubanRate(di);
            }
        }
    };

    const getDoubanRate = async (di) => {
        const { name, year } = di;
        const trimmedName = name?.trim();
        const rate = await doubanApi.doubanRate(trimmedName, year);
        setDoubanRate(rate);

        const recommendations = await doubanApi.doubanRecommendations(
            trimmedName,
            year
        );
        if (recommendations) {
            for (const element of recommendations) {
                const currentSite = await getSiteByKey(detailInfo.siteKey);
                const detailRes = await movieApi.searchFirstDetail(
                    currentSite,
                    element
                );
                if (detailRes) {
                    setDoubanRecommendations((prev) => [...prev, detailRes]);
                }
            }
        }
    };

    const ftName = (e, n) => {
        const num = e.split("$");
        return num.length > 1 ? num[0] : `第${n + 1}集`;
    };

    const starEvent = () => {
        const star = {
            star_name: info.name,
            ids: info.id.toString(),
            site_key: detailInfo.siteKey,
            movie_type: info.type,
            year: `${info.year}年`,
            note: info.note,
            douban_rate: doubanRate,
            last_update_time: info.last,
            pic: info.pic,
            area: info.area,
        };
        starMovie(star);
    };

    const playEvent = (index) => {
        const playInfo = {
            playState: "newPlay",
            playType: "onlineMovie",
            isLive: false,
            name: info.name,
            iptv: { channelGroupId: 0, channelActive: "" },
            download: { downloadId: 0 },
            movie: {
                siteKey: detailInfo.siteKey,
                ids: info.id.toString(),
                index,
                videoFlag: "",
                onlineUrl: "",
            },
        };
        dispatch(updatePlayInfo({ playInfo, toPlay: true }));
    };

    const doubanLinkEvent = () => {
        window.open("https://www.douban.com/");
    };

    return (
        <div
            className={props.className ? `detail ${props.className}` : "detail"}
        >
            <div className="detail-content">
                {!loading && (
                    <div className="detail-body">
                        <div className="poster-section enhanced">
                            <div className="poster-container">
                                <img
                                    src={info.pic}
                                    alt="剧集海报"
                                    className="poster"
                                />
                                <div className="poster-overlay">
                                    <h1 className="title">{info.name}</h1>
                                    <p className="rating">
                                        豆瓣评分: {doubanRate}
                                    </p>
                                </div>
                            </div>
                            <div className="poster-details">
                                {info.director && (
                                    <p>
                                        <strong>导演:</strong> {info.director}
                                    </p>
                                )}
                                <p>
                                    <strong>主演:</strong> {info.actor}
                                </p>
                                <p>
                                    <strong>类型:</strong> {info.type}
                                </p>
                                <p>
                                    <strong>地区:</strong> {info.area}
                                </p>
                                <p>
                                    <strong>语言:</strong> {info.lang}
                                </p>
                                <p>
                                    <strong>上映:</strong> {info.year}
                                </p>
                                <p>
                                    <strong>更新:</strong> {info.last}
                                </p>
                                <p>
                                    <strong>备注:</strong> {info.note}
                                </p>
                            </div>
                        </div>
                        {info.des && (
                            <div className="description-section">
                                <p
                                    className="description"
                                    dangerouslySetInnerHTML={{
                                        __html: info.des
                                    }}
                                ></p>
                            </div>
                        )}
                        <div className="action-section">
                            <button
                                className="action-btn play-btn"
                                onClick={() => playEvent(selectedEpisode)}
                            >
                                播放
                            </button>
                            <button
                                className="action-btn favorite-btn"
                                onClick={starEvent}
                            >
                                收藏
                            </button>
                            <button
                                className="action-btn douban-btn"
                                onClick={doubanLinkEvent}
                            >
                                豆瓣
                            </button>
                        </div>
                        {info.videoFullList &&
                            info.videoFullList.length > 1 && (
                                <div className="episodes-section">
                                    <h2>剧集源选择</h2>
                                    {info.videoFullList.map((i, j) => (
                                        <div
                                            key={j}
                                            className={
                                                j === videoFlag
                                                    ? "episode-source active"
                                                    : "episode-source"
                                            }
                                            onClick={() => setVideoFlag(i.flag)}
                                        >
                                            <div>
                                                <span>{i.flag}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        <div className="episodes-section">
                            <h2>剧集选择</h2>
                            {info.videoList &&
                                info.videoList.length > 0 &&
                                info.videoList.map((i, j) => (
                                    <div
                                        key={j}
                                        className="episode-btn"
                                        onClick={() => playEvent(j)}
                                        style={{
                                            width:
                                                maxWidth == 0
                                                    ? "auto"
                                                    : `${maxWidth}px`,
                                        }}
                                    >
                                        <div>
                                            <span>{ftName(i, j)}</span>
                                        </div>
                                    </div>
                                ))}
                                {
                                    Array.from({ length: 12 }).map((i, j) => (
                                        <div
                                            key={j}
                                            className="episode-btn h1"
                                            style={{
                                                width:
                                                    maxWidth == 0
                                                        ? "auto"
                                                        : `${maxWidth}px`,
                                            }}
                                        />
                                    ))
                                }
                        </div>
                        {info.recommendations &&
                            info.recommendations.length > 0 && (
                                <div className="recommend-section">
                                    <h2>喜欢这部电影的人也喜欢 · · · · · ·</h2>
                                    <Waterfall
                                        list={doubanRecommendations}
                                        gutter={20}
                                        width={200}
                                        viewMode="detail"
                                    >
                                        <MovieCard
                                            viewMode="detail"
                                            breakpoints={{
                                                1400: { rowPerView: 5 },
                                                1200: { rowPerView: 4 },
                                                800: { rowPerView: 3 },
                                                500: { rowPerView: 2 },
                                            }}
                                        />
                                    </Waterfall>
                                </div>
                            )}
                    </div>
                )}
                {loading && (
                    <div className="detail-mask zy-loading">
                        <div className="loader"></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Detail;
