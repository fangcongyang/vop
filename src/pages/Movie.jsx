import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
    pageActiveStore,
    togglePageActive,
    settingsStore,
} from "@/store/coreSlice";
import {
    storeSiteList,
    siteListStore,
    toggleCurrentSite,
    currentSiteStore,
    searchKeywordStore,
    updateSearchKeyword,
} from "@/store/movieSlice";
import MovieCard from "@/components/MovieCard";
import Waterfall from "@/components/Waterfall";
import Pagination from "@mui/material/Pagination";
import movieApi from "@/api/movies";
import { cacheData, getCacheData } from "@/business/cache";
import { getSiteClassList, cacheSiteClassList, getSiteList } from "@/db";
import _ from "lodash";
import message from "@/components/message";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { osType } from "@/utils/env";
import NProgress from "nprogress";
import { useConfig, useGetState } from "@/hooks";
import "./Movie.scss";

let movieInfo = {
    forceRequest: false,
    classChange: false,
    movieRequestList: false,
    statusText: "",
    currentSite: {},
    classType: 0,
    refreshClass: false,
};

const Movie = ({ className }) => {
    const dispatch = useAppDispatch();
    const pageActive = useAppSelector(pageActiveStore);
    const siteList = useAppSelector(siteListStore);
    const currentSite = useAppSelector(currentSiteStore);
    const settings = useAppSelector(settingsStore);
    const [excludeR18Site, setExcludeR18Site, getExcludeR18Site] = useConfig(
        "excludeR18Site",
        true
    );
    const [excludeRootClasses] = useConfig("excludeRootClasses", true);
    const [rootClassFilter] = useConfig("rootClassFilter", []);

    const [excludeR18Classes, setExcludeR18Classes] = useConfig("excludeR18Classes", false);
    const [r18ClassFilter, setR18ClassFilter] = useConfig("r18ClassFilter", []);
    const [classList, setClassList] = useState([]);
    const [currentClass, setCurrentClass] = useState({ id: -1, name: "" });
    const [movieFilteredList, setMovieFilteredList] = useState([]);
    const [page, setPage] = useState(1);
    const pageMainRef = useRef(null);
    const [searchList, setSearchList] = useState([]);
    const [keywords, setKeywords] = useState("");
    const [moviePageInfo, setMoviePageInfo, getMoviePageInfo] = useGetState({
        totalPageCount: 0,
        pageCount: 0,
        recordcount: 0,
        movieList: [],
    });
    const [tipMessage, setTipMessage] = useState("");

    useEffect(() => {
        getSiteList().then((result) => {
            if (result) {
                result = result.filter((item) => {
                    return !excludeR18Site || item.site_group !== "18+";
                });
                dispatch(
                    storeSiteList({ siteList: result, forceRefresh: true })
                );
                if (result[0]) siteClick(result[0]);
            }
        });
    }, [excludeR18Site]);

    const resetMoviePageInfo = () => {
        setMoviePageInfo({
            totalPageCount: 0,
            pageCount: 0,
            recordcount: 0,
            movieList: [],
        });
    };

    const siteClick = _.debounce((site) => {
        if (movieInfo.refreshClass) return;
        movieInfo.refreshClass = true;
        if (classList.length > 0) {
            setClassList([]);
        }
        resetMoviePageInfo();
        dispatch(toggleCurrentSite(site));
        movieInfo.currentSite = site;
        getSiteClassList(site.site_key)
            .then((newClassList) => {
                if (newClassList && newClassList.length > 0) {
                    setClassList(newClassList);
                    classClick(newClassList[0]);
                    movieInfo.refreshClass = false;
                } else {
                    refreshClass();
                }
            })
            .catch(() => {
                refreshClass();
            });
    }, 500);

    const refreshClass = () => {
        const site = movieInfo.currentSite;
        movieApi
            .getSiteClass(site)
            .then((res) => {
                const allClass = [{ class_id: -1, class_name: "最新" }];
                res.classList.forEach((element) => {
                    allClass.push(element);
                });
                cacheSiteClassList(site.site_key, allClass)
                    .then((classList) => {
                        let classType = classList.find(
                            (x) => x.name === currentClass.name
                        );
                        if (!classType) {
                            classType = classList[0];
                        }
                        setClassList(classList);
                        classClick(classType);
                        movieInfo.refreshClass = false;
                    })
                    .catch(() => {
                        movieInfo.refreshClass = false;
                    });
            })
            .catch((err) => {
                message.error("获取分类资源失败");
                setMovieFilteredList([]);
                movieInfo.refreshClass = false;
            });
    };

    const anyContain = (value, arr) => {
        let anyContain = false;
        for (const item of arr) {
            if (value.includes(item)) {
                return true;
            }
        }
        return anyContain;
    };

    const showClassList = useMemo(() => {
        let newClassList = classList.filter((item) => {
            if (item.class_id === -1) {
                return true;
            }

            let rootExclude =
                (excludeRootClasses &&
                    !anyContain(item.class_name, rootClassFilter)) ||
                !excludeRootClasses;
            let r18Exclude =
                (excludeR18Classes &&
                    !anyContain(item.class_name, r18ClassFilter)) ||
                !excludeR18Classes;
            return rootExclude && r18Exclude;
        });
        return newClassList;
    }, [
        classList,
        excludeRootClasses,
        rootClassFilter,
        excludeR18Classes,
        r18ClassFilter,
    ]);

    const classClick = (classType) => {
        movieInfo.classChange = false;
        if (movieInfo.classChange) return;
        NProgress.start();
        setMovieFilteredList([]);
        setTipMessage("加载中...");
        movieInfo.classType = classType;
        const site = movieInfo.currentSite;
        movieInfo.classChange = true;
        resetMoviePageInfo();
        const classId = classType.class_id;
        if (classId !== currentClass.class_id) {
            setCurrentClass(classType);
        }
        let page = 1;
        const cacheKey = site.site_key + "@" + classId + "@" + page;
        getCacheData(cacheKey).then((data) => {
            if (data && data.movieList.length != 0) {
                setPage(page);
                setMoviePageInfo(data);
                refreshFilteredList();
                movieInfo.classChange = false;
                NProgress.done();
            } else {
                let params = {};
                if (classId != -1) {
                    params.t = classId;
                }
                movieApi
                    .pageMovies(site, params)
                    .then((res) => {
                        setMoviePageInfo(res);
                        movieInfo.forceRequest = true;
                        infiniteHandler(page);
                        movieInfo.classChange = false;
                        NProgress.done();
                    })
                    .catch((err) => {
                        movieInfo.classChange = false;
                        NProgress.done();
                        setTipMessage("获取数据失败");
                        message.error("获取分类资源失败");
                    });
            }
        });
    };

    const infiniteHandler = (page) => {
        if (
            !movieInfo.forceRequest &&
            (movieInfo.classChange || movieInfo.movieRequestList)
        ) {
            return false;
        }
        pageMainRef.current.scrollTop = 0;
        setPage(page);
        let site = movieInfo.currentSite;
        const cacheKey =
            site.site_key + "@" + movieInfo.classType.class_id + "@" + page;
        setTipMessage("加载中...");
        getCacheData(cacheKey).then((data) => {
            if (data && data.movieList.length != 0) {
                setMoviePageInfo(data);
                refreshFilteredList();
                return;
            }
            movieInfo.forceRequest = false;
            movieInfo.movieRequestList = true;
            const key = site.site_key;
            let totalPageCount = getMoviePageInfo().totalPageCount;
            movieInfo.statusText = " ";
            if (key === undefined || page < 1 || page > totalPageCount) {
                movieInfo.statusText = "暂无数据";
                return false;
            }

            let listMoviesParams = {
                t:
                    movieInfo.classType.class_id == -1
                        ? undefined
                        : movieInfo.classType.class_id,
                pg: page,
            };

            movieApi
                .listMovies(site, listMoviesParams)
                .then((res) => {
                    if (res) {
                        setMoviePageInfo((prevState) => ({
                            ...prevState, // 保留 state 中的其他字段
                            movieList: res, // 更新特定字段的值
                        }));
                        // 更新缓存数据
                        cacheData(cacheKey, getMoviePageInfo());
                        refreshFilteredList();
                    } else {
                        movieInfo.movieRequestList = false;
                        message.error("获取资源列表失败");
                    }
                })
                .catch((e) => {
                    console.log(e);
                    movieInfo.movieRequestList = false;
                });
        });
    };

    const refreshFilteredList = () => {
        let filteredData = getMoviePageInfo().movieList;
        movieInfo.selectedClassName =
            currentClass.name +
            "    " +
            filteredData.length +
            "/" +
            getMoviePageInfo().recordcount;

        filteredData = _.uniqBy(filteredData, "name");
        if (filteredData.length == 0) setTipMessage("暂无数据");
        setMovieFilteredList(filteredData);
        movieInfo.movieRequestList = false;
    };

    const getSearchList = () => {
        getSearchList().then((res) => {
            setSearchList(res);
        });
    };

    const doSearch = (e) => {
        if (e.key !== "Enter" && e.keyCode !== 13) return;
        if (!keywords) return;
        addSearchRecord(keywords).then(() => {
            getSearchList();
        });
        if (pageActive == "search") {
            dispatch(updateSearchKeyword(keywords));
            return;
        }
        dispatch(updateSearchKeyword(keywords));
    };

    const goSearch = () => {
        dispatch(togglePageActive("search"));
    };

    return (
        <div
            ref={pageMainRef}
            className={className ? "pageMain " + className : "pageMain"}
        >
            <div className="panel">
                {osType.toLowerCase().includes("mobile") && (
                    <div className="movieSearch">
                        <Autocomplete
                            freeSolo
                            id="free-solo"
                            size="small"
                            sx={{
                                width: "100%",
                                color: "var(--color-text)",
                                outline: "none",
                                background:
                                    "var(--color-secondary-bg-for-transparent)",
                                borderRadius: "8px",
                                "& .MuiOutlinedInput-notchedOutline": {
                                    height: "32px",
                                    border: "none !important",
                                    background: "transparent",
                                    outline: "none",
                                },
                            }}
                            options={searchList.map((option) => option.keyword)}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    value={keywords}
                                    label="搜索"
                                    InputProps={{
                                        ...params.InputProps,
                                        type: "search",
                                    }}
                                    onKeyUp={(e) => doSearch(e)}
                                    onChange={(e) =>
                                        setKeywords(e.target.value)
                                    }
                                    onClick={(e) => goSearch()}
                                />
                            )}
                        />
                    </div>
                )}
                <div className="big-cat">
                    <div className="name">源站</div>
                    <div className="cats">
                        {siteList.map((site) => {
                            return (
                                <div
                                    key={site.site_key}
                                    className={
                                        currentSite.site_key == site.site_key
                                            ? "cat active"
                                            : "cat"
                                    }
                                    onClick={() => siteClick(site)}
                                >
                                    <span>{site.site_name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="big-cat">
                    <div className="name">分类</div>
                    <div className="cats">
                        {showClassList.map((item) => {
                            return (
                                <div
                                    key={item.class_id}
                                    className={
                                        currentClass.class_id == item.class_id
                                            ? "cat active"
                                            : "cat"
                                    }
                                    onClick={() => classClick(item)}
                                >
                                    <span>{item.class_name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className="panelBody">
                <div className="showPicture">
                    <Waterfall
                        list={movieFilteredList}
                        gutter={10}
                        tipMessage={tipMessage}
                        initYzb={10}
                    >
                        <MovieCard
                            site={currentSite}
                            breakpoints={{
                                1400: {
                                    //当屏幕宽度小于等于1200
                                    rowPerView: 6,
                                },
                                1200: {
                                    //当屏幕宽度小于等于1200
                                    rowPerView: 5,
                                },
                                1000: {
                                    //当屏幕宽度小于等于1200
                                    rowPerView: 4,
                                },
                                800: {
                                    //当屏幕宽度小于等于800
                                    rowPerView: 3,
                                },
                                500: {
                                    //当屏幕宽度小于等于500
                                    rowPerView: 2,
                                },
                            }}
                        />
                    </Waterfall>
                </div>
            </div>
            <div className="pagination">
                <Pagination
                    page={page}
                    count={moviePageInfo.pageCount}
                    boundaryCount={1}
                    siblingCount={0}
                    onChange={(event, newPage) => infiniteHandler(newPage)}
                    showFirstButton
                    showLastButton
                />
            </div>
        </div>
    );
};

export default Movie;
