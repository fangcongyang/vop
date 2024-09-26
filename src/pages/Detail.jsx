import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useGetState } from "@/hooks";
import { pageActiveStore, updatePlayInfo } from "@/store/coreSlice";
import { detailInfoStore } from "@/store/movieSlice";
import MovidCard from "@/components/MovidCard";
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
    const [moveOn, setMoveOn] = useState(undefined);

    useEffect(() => {
        if (pageActive === "detail") {
            getDetailInfo();
        }
    }, [detailInfo.ids]);

    const getDetailInfo = async () => {
        setLoading(true);
        const cacheKey = `${detailInfo.siteKey}@${detailInfo.ids}`;
        const history = await getCurrentHistory(detailInfo.siteKey, detailInfo.ids);
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

        const recommendations = await doubanApi.doubanRecommendations(trimmedName, year);
        if (recommendations) {
            for (const element of recommendations) {
                const currentSite = await getSiteByKey(detailInfo.siteKey);
                const detailRes = await movieApi.searchFirstDetail(currentSite, element);
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
        <div className={props.className ? `detail ${props.className}` : "detail"}>
            <div className="detail-content">
                <div className="detail-header">
                    <span className="detail-title">详情</span>
                </div>
                {!loading && (
                    <div className="detail-body">
                        <div className="info">
                            <div className="info-left">
                                <img src={info.pic} alt="" />
                            </div>
                            <div className="info-right">
                                <div className="name">{info.name}</div>
                                {info.director && <div className="director">导演: {info.director}</div>}
                                {info.actor && <div className="actor">主演: {info.actor}</div>}
                                <div className="type">类型: {info.type}</div>
                                <div className="area">地区: {info.area}</div>
                                <div className="lang">语言: {info.lang}</div>
                                <div className="year">上映: {info.year}</div>
                                <div className="last">更新: {info.last}</div>
                                <div className="note">备注: {info.note}</div>
                                {doubanRate && <div className="rate">豆瓣评分: {doubanRate}</div>}
                            </div>
                        </div>
                        <div className="operate">
                            <span onClick={() => playEvent(selectedEpisode)}>播放</span>
                            <span onClick={starEvent}>收藏</span>
                            <span onClick={doubanLinkEvent}>豆瓣</span>
                        </div>
                        {info.des && <div className="desc" dangerouslySetInnerHTML={{ __html: info.des }}></div>}
                        {info.videoFullList && info.videoFullList.length > 1 && (
                            <div className="m3u8">
                                <div className="box">
                                    {info.videoFullList.map((i, j) => (
                                        <span
                                            key={j}
                                            className={i.flag === videoFlag ? "selected" : ""}
                                            onClick={() => setVideoFlag(i.flag)}
                                        >
                                            {i.flag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="m3u8">
                            <div className="box">
                                {info.videoList &&
                                    info.videoList.length > 0 &&
                                    info.videoList.map((i, j) => (
                                        <div
                                            key={j}
                                            onClick={() => playEvent(j)}
                                            onMouseEnter={() => setMoveOn(j)}
                                            onMouseLeave={() => setMoveOn(undefined)}
                                        >
                                            <span 
                                                className={j === selectedEpisode || j === moveOn ? "selected" : ""}>
                                                {ftName(i, j)}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                        {info.recommendations && info.recommendations.length > 0 && (
                            <div className="m3u8">
                                <span>喜欢这部电影的人也喜欢 · · · · · ·</span>
                                <Waterfall list={doubanRecommendations} gutter={20} width={200} viewMode="detail">
                                    <MovidCard
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
