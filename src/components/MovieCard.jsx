import { useGlobalStore } from "@/store/useGlobalStore";
import LazyImage from "@/components/LazyImage";
import doubanApi from "@/api/douban";
import { getSiteByKey } from "@/api/site";
import { saveDownloadInfo } from "@/api/downloadInfo";
import { starMovie } from "@/api/star";
import { message } from "antd";
import { fmtMSS } from "@/utils/common";
import util from "@/utils";
import moviesApi from "@/api/movies";
import "./MovieCard.scss";
import { useMovieStore } from "@/store/useMovieStore";

const MovieCard = ({ key, item, layoutHandle, site, viewMode = "default", showSiteName = true, onDelete }) => {
    const osType = useGlobalStore((state) => state.osType);
    const [messageApi, _contextHolder] = message.useMessage();
    const togglePageActive = useGlobalStore((state) => state.togglePageActive);
    const toggleMovieDetailInfo = useMovieStore((state) => state.toggleMovieDetailInfo);
    const togglePlayInfo = useGlobalStore((state) => state.togglePlayInfo);
    const siteMap = useGlobalStore((state) => state.siteMap);

    const imgLoad = () => layoutHandle();

    const getSiteKey = () => {
        switch (viewMode) {
            case "history":
            case "star":
            case "play":
                return item.site_key;
            case "search":
                return item.site.site_key;
            default:
                return site.site_key;
        }
    };

    const getSiteName = () => {
        switch (viewMode) {
            case "history":
            case "star":
                return siteMap? siteMap[item.site_key]?.site_name: "";
            case "search":
                return item.site.site_name;
            default:
                return site?.site_name || item.site?.site_name;
        }
    };

    const getMovieId = () => (viewMode === "history" || viewMode === "star" ? item.ids : item.id);

    const playEvent = (e) => {
        e.stopPropagation();
        const playInfo = {
            playState: "newPlay",
            playType: "onlineMovie",
            isLive: false,
            name: getName(),
            iptv: { channelGroupId: 0, channelActive: "" },
            download: { downloadId: 0 },
            movieInfo: {
                siteKey: getSiteKey(),
                ids: getMovieId(),
                index: viewMode === "history" ? item.index : 0,
                videoFlag: "",
                onlineUrl: "",
            },
        };
        togglePlayInfo(playInfo, true);
    };

    const starEvent = async (e) => {
        e.stopPropagation();
        const movieName = getName();
        const star = {
            star_name: movieName,
            ids: getMovieId(),
            site_key: getSiteKey(),
            movie_type: item.type,
            year: `${item.year || new Date().getFullYear()}年`,
            note: item.note,
            douban_rate: await doubanApi.doubanRate(movieName, item.year),
            last_update_time: item.last_update_time,
            pic: getPic(),
            area: item.area,
            has_update: "0",
        };
        starMovie({star}).then(() => {
            messageApi.success("收藏影片成功");
        });
    };

    const downloadEvent = async (e) => {
        e.stopPropagation();
        try {
            const siteInfo = await getSiteByKey(getSiteKey());
            const res = await moviesApi.download(siteInfo, getMovieId(), null);
            const downloadInfos = res.downloadUrls.map((url) => ({
                movie_name: util.trimAll(url.name),
                url: url.url,
                sub_title_name: util.trimAll(url.subTitleName),
                status: "parseSource",
                download_count: 0,
                count: 0,
                parentId: "0",
                download_status: "wait",
            }));
            saveDownloadInfo({downloadInfos});
            messageApi.success(res.info);
        } catch (err) {
            console.log(err);
            messageApi.error(err.info);
        }
    };

    const deleteEvent = (e) => {
        e.stopPropagation();
        if (onDelete) {
            onDelete(item).then(layoutHandle);
        }
    };

    const progress = (e) => (e.duration > 0 ? ((e.play_time / e.duration) * 100).toFixed(0) : 0);

    const getPic = () => (viewMode === "history" ? item.detail?.pic : item.pic);

    const getName = () => {
        switch (viewMode) {
            case "history":
                return item.history_name;
            case "star":
                return item.star_name;
            default:
                return item.name;
        }
    };

    const getInfoDom = () => {
        const renderDefaultOrStarMode = () => (
            <>
                <span>{item.area}</span>
                <span>{item.year}</span>
                <span className="note">{item.note}</span>
                <span>{viewMode === "star" ? item.movie_type : item.type}</span>
            </>
        );

        const renderOtherModes = () => {
            const spanArr = [];

            if (item.play_time && item.duration) {
                spanArr.push(
                    <span key="play_time">
                        {fmtMSS(item.play_time.toFixed(0))}/{fmtMSS(item.duration.toFixed(0))}({progress(item)}%)
                    </span>
                );
            }

            if (item.online_play) {
                spanArr.push(<span key="online_play">在线解析</span>);
            }

            if (item.detail) {
                const detail = item.detail;
                if (detail?.fullList?.[0]?.list.length > 1) {
                    spanArr.push(
                        <span key="detail">
                            第{item.index + 1}集(共{detail.fullList[0].list.length}集)
                        </span>
                    );
                }
            }

            return spanArr;
        };

        return viewMode === "default" || viewMode === "star" ? renderDefaultOrStarMode() : renderOtherModes();
    };

    const onDetail = () => {
        toggleMovieDetailInfo({ siteKey: getSiteKey(), ids: getMovieId() });
        togglePageActive("detail");
    };

    return (
        <div key={key} className="card" onClick={onDetail}>
            <div className="img">
                {showSiteName  && (
                    <div className="site">
                        <span>{getSiteName()}</span>
                    </div>
                )}
                {item.douban_rate && item.douban_rate !== "暂无评分" && (
                    <div className="rate">
                        <span>{item.douban_rate}分</span>
                    </div>
                )}
                <div className={viewMode !== "default" && item.has_update === "1" ? "update" : "update hidden"}>
                    <span>有更新</span>
                </div>
                <LazyImage url={getPic()} onLoad={imgLoad} />
                <div className="operate">
                    <div className="operate-wrap">
                        <span className="o-play" onClick={playEvent}>
                            播放
                        </span>
                        {(viewMode !== "star") && (
                            <span className="o-star" onClick={starEvent}>
                                收藏
                            </span>
                        )}
                        {osType === "desktop" && (
                            <span className="o-star" onClick={downloadEvent}>
                                下载
                            </span>
                        )}
                        {(viewMode === "star" || viewMode === "history") && (
                            <span className="o-star" onClick={deleteEvent}>
                                删除
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <div className="name">{getName()}</div>
            <div className="info">{getInfoDom()}</div>
        </div>
    );
};

export default MovieCard;
