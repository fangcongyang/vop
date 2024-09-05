import { useAppDispatch } from "@/store/hooks";
import { updatePlayInfo, togglePageActive } from "@/store/coreSlice";
import { updateDetailInfo } from "@/store/movieSlice";
import { osType } from "@/utils/env";
import LazyImage from "@/components/LazyImage";
import doubanApi from "@/api/douban";
import { getSiteByKey, starMovie, addDownloads } from "@/db";
import message from "@/components/message";
import { fmtMSS } from "@/utils/common";
import util from "@/utils";
import moviesApi from "@/api/movies";
import "./MovieCard.scss";

const MovieCard = ({ key, item, layoutHandle, site, viewMode = "default", onDelete }) => {
    const dispatch = useAppDispatch();

    const imgLoad = () => layoutHandle();

    const getSiteKey = () => {
        switch (viewMode) {
            case "history":
            case "star":
                return item.site_key;
            case "search":
                return item.site.site_key;
            default:
                return site.site_key;
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
            movie: {
                siteKey: getSiteKey(),
                ids: getMovieId(),
                index: viewMode === "history" ? item.index : 0,
                videoFlag: "",
                onlineUrl: "",
            },
        };
        dispatch(updatePlayInfo({ playInfo, toPlay: true }));
    };

    const starEvent = async (e) => {
        e.stopPropagation();
        const star = {
            star_name: item.name,
            ids: item.id.toString(),
            site_key: site.site_key,
            movie_type: item.type,
            year: `${item.year}年`,
            note: item.note,
            douban_rate: await doubanApi.doubanRate(item.name, item.year),
            last_update_time: item.last,
            pic: item.pic,
            area: item.area,
        };
        starMovie(star);
    };

    const downloadEvent = async (e) => {
        e.stopPropagation();
        try {
            const siteInfo = await getSiteByKey(getSiteKey());
            const res = await moviesApi.download(siteInfo, getMovieId(), null);
            const downloadInfos = res.downloadUrls.map((url) => ({
                movie_name: util.trimAll(url.name),
                url: url.url,
                sub_title_name: url.subTitleName,
                status: "parseSource",
                download_count: 0,
                count: 0,
                parentId: "0",
                download_status: "wait",
            }));
            addDownloads(downloadInfos);
            message.success(res.info);
        } catch (err) {
            console.log(err);
            message.error(err.info);
        }
    };

    const deleteEvent = (e) => {
        e.stopPropagation();
        if (onDelete) {
            onDelete(item).then(layoutHandle);
        }
    };

    const progress = (e) => (e.duration > 0 ? ((e.play_time / e.duration) * 100).toFixed(0) : 0);

    const getPic = () => (viewMode === "history" ? JSON.parse(item.detail)?.pic : item.pic);

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
        if (viewMode === "default" || viewMode === "star") {
            return (
                <>
                    <span>{item.area}</span>
                    <span>{item.year}</span>
                    <span className="note">{item.note}</span>
                    <span>{viewMode === "star" ? item.movie_type : item.type}</span>
                </>
            );
        } else {
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
                const detail = JSON.parse(item.detail);
                if (detail?.fullList?.[0]?.list.length > 1) {
                    spanArr.push(
                        <span key="detail">
                            第{item.index + 1}集(共{detail.fullList[0].list.length}集)
                        </span>
                    );
                }
            }
            return <>{spanArr}</>;
        }
    };

    const onDetail = () => {
        dispatch(updateDetailInfo({ siteKey: getSiteKey(), ids: item.id }));
        dispatch(togglePageActive("detail"));
    };

    return (
        <div key={key} className="card" onClick={onDetail}>
            <div className="img">
                {viewMode === "search" && (
                    <div className="site">
                        <span>{item.site.site_name}</span>
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
                        {(viewMode === "default" || viewMode === "search") && (
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
