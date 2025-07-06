import { useEffect, useState } from "react";
import { useGetState } from "@/hooks";
import { useGlobalStore } from "@/store/useGlobalStore";
import { useMovieStore } from "@/store/useMovieStore";
import MovieCard from "@/components/MovieCard";
import Waterfall from "@/components/Waterfall";
import { getSiteByKey } from "@/db";
import { starMovie } from "@/api/star";
import movieApi from "@/api/movies";
import doubanApi from "@/api/douban";
import { getCurrentHistory } from "@/api/history";
import _ from "lodash";
import "./Detail.scss";

const Detail = (props) => {
    const movieDetailInfo = useMovieStore((state) => state.movieDetailInfo);
    const togglePlayInfo = useGlobalStore((state) => state.togglePlayInfo);
    const [loading, setLoading] = useState(false);
    const [videoFlag, setVideoFlag, getVideoFlag] = useGetState("");
    const [selectedEpisode, setSelectedEpisode] = useState(0);
    const [info, setInfo] = useState({});
    const [doubanRate, setDoubanRate] = useState(null);
    const [doubanRecommendations, setDoubanRecommendations] = useState([]);


    useEffect(() => {
        getMovieDetailInfo();
    }, []);

    const getMovieDetailInfo = async () => {
        setLoading(true);
        const history = await getCurrentHistory({
            siteKey: movieDetailInfo.siteKey,
            ids: movieDetailInfo.ids.toString()
        });
        if (history) {
            setVideoFlag(history.videoFlag);
            setSelectedEpisode(history.index);
        }

        const currentSite = await getSiteByKey(movieDetailInfo.siteKey);
        let res = await movieApi.detail(currentSite, movieDetailInfo.ids);
        handlerDetailData(res);
    };



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

    // 计算剧集名称字数并设置动态宽度
    const calculateEpisodeWidth = (episodeName) => {
        const charCount = episodeName.length;
        return charCount;
    };

    // 设置剧集网格的动态宽度CSS变量
    const updateEpisodeGridWidth = () => {
        if (!info.videoList || info.videoList.length === 0) return;
        
        // 计算所有剧集名称的最大字数
        const maxCharCount = Math.max(
            ...info.videoList.map((item, index) => {
                const episodeName = ftName(item, index);
                return calculateEpisodeWidth(episodeName);
            })
        );
        
        // 设置计算参数
        const baseWidth = 60;
        const charWidth = 12;
        const maxWidth = 150;
        
        // 计算动态宽度：基础宽度 + 字数 * 每字宽度
        const calculatedWidth = Math.min(baseWidth + maxCharCount * charWidth, maxWidth);
        
        // 设置CSS变量
        const episodeGrid = document.querySelector('.episodes-grid');
        if (episodeGrid) {
            episodeGrid.style.setProperty('--episode-min-width', `${calculatedWidth}px`);
        }
    };

    // 当info.videoList变化时更新剧集网格宽度
    useEffect(() => {
        updateEpisodeGridWidth();
    }, [info.videoList]);

    const starEvent = () => {
        const star = {
            star_name: info.name,
            ids: info.id.toString(),
            site_key: detailInfo.siteKey,
            movie_type: info.type,
            year: `${info.year || new Date().getFullYear()}年`,
            note: info.note,
            douban_rate: doubanRate,
            last_update_time: info.last_update_time,
            pic: info.pic,
            area: info.area,
            has_update: "0",
        };
        starMovie({star});
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
        togglePlayInfo(playInfo, true);
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
                            <div className="episodes-grid">
                                {info.videoList &&
                                    info.videoList.length > 0 &&
                                    info.videoList.map((i, j) => (
                                        <div
                                            key={j}
                                            className={`episode-btn ${selectedEpisode === j ? 'active' : ''}`}
                                            onClick={() => {
                                                setSelectedEpisode(j);
                                                playEvent(j);
                                            }}
                                        >
                                            <span>{ftName(i, j)}</span>
                                        </div>
                                    ))}
                            </div>
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
