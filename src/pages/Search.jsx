import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { pageActiveStore } from "@/store/coreSlice";
import { searchKeywordStore, siteListStore } from "@/store/movieSlice";
import MovidCard from "@/components/MovidCard";
import Waterfall from "@/components/Waterfall";
import movieApi from "@/api/movies";
import message from "@/components/message";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import _ from "lodash";
import { osType } from "@/utils/env";
import "./Movie.scss";

const searchInfo = {
    searchId: 0,
    searchRunning: false,
    siteSearchCount: 0,
};
const Search = (props) => {
    const dispatch = useAppDispatch();
    const siteList = useAppSelector(siteListStore);
    const pageActive = useAppSelector(pageActiveStore);
    const searchKeyword = useAppSelector(searchKeywordStore);
    const searchKeywordRef = useRef("");
    const movieListRef= useRef([]);
    const [movieList, setMovieList]= useState([]);
    const [searchList, setSearchList] = useState([]);

    useEffect(() => {
        if (pageActive === "search" && searchKeyword != searchKeywordRef.current) {
            searchKeywordRef.current = searchKeyword;
            console.log(searchKeyword)
            searchMovie();
        }
    }, [pageActive, searchKeyword]);

    const isValidSearchResult = (detailRes) => {
        return (
            detailRes.dl.dd &&
            (detailRes.dl.dd._t ||
                (Object.prototype.toString.call(detailRes.dl.dd) ===
                    "[object Array]" &&
                    detailRes.dl.dd.some((i) => i._t)))
        );
    };

    const searchMovie = _.debounce(async () => {
        searchInfo.searchId++;
        searchInfo.searchRunning = true;
        movieListRef.current = []
        setMovieList([]);
        if (!searchKeywordRef.current) {
            return;
        }
        siteList.forEach((site) => {
            const id = searchInfo.searchId;
            movieApi
                .search(site, searchKeywordRef.current)
                .then((res) => {
                    if (id !== searchInfo.searchId || !searchInfo.searchRunning)
                        return;
                    if (_.isArray(res)) {
                        let count = 0;
                        res.forEach((element) => {
                            movieApi
                                .detail(site, element.id)
                                .then((detailRes) => {
                                    if (
                                        id !== searchInfo.searchId ||
                                        !searchInfo.searchRunning
                                    )
                                        return;
                                    if (detailRes) {
                                        detailRes.site = site;
                                        if (isValidSearchResult(detailRes)) {
                                            let newMovieList = [
                                                ...movieListRef.current,
                                                detailRes,
                                            ];
                                            newMovieList.sort(function (a, b) {
                                                return a.site.id - b.site.id;
                                            });
                                            movieListRef.current = newMovieList;
                                            setMovieList(newMovieList);
                                        }
                                    }
                                })
                                .finally(() => {
                                    count++;
                                    if (count === res.length) {
                                        searchInfo.siteSearchCount++;
                                    }
                                });
                        });
                    } else if (_.isObject(res)) {
                        movieApi
                            .detail(site, res.id)
                            .then((detailRes) => {
                                if (
                                    id !== searchInfo.searchId ||
                                    !searchInfo.searchRunning
                                )
                                    return;
                                detailRes.site = site;
                                if (isValidSearchResult(detailRes)) {
                                    let newMovieList = [
                                        ...movieListRef.current,
                                        detailRes,
                                    ];
                                    newMovieList.sort(function (a, b) {
                                        return a.site.id - b.site.id;
                                    });
                                    movieListRef.current = newMovieList;
                                    setMovieList(newMovieList);
                                }
                            })
                            .finally(() => {
                                searchInfo.siteSearchCount++;
                            });
                    }
                })
                .catch(() => {
                    searchInfo.siteSearchCount++;
                });
        });
    }, 500);

    useEffect(() => {
        if (searchInfo.siteSearchCount === siteList.length) {
            searchInfo.searchRunning = false;
        }
    }, [searchInfo.siteSearchCount])

    return (
        <div
            className={
                props.className ? "pageMain " + props.className : "pageMain"
            }
        >
             {osType.toLowerCase().includes("mobile") && (
                    <div style={{marginTop: '10px'}}>
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
                                    value={searchKeywordRef.current}
                                    label="搜索"
                                    InputProps={{
                                        ...params.InputProps,
                                        type: "search",
                                    }}
                                    onKeyUp={(e) => {
                                        if (e.key === "Enter" || e.keyCode === 13) {
                                            searchMovie()
                                        }
                                    }}
                                    onChange={(e) =>
                                        searchKeywordRef.current = e.target.value
                                    }
                                />
                            )}
                        />
                    </div>
                )}
            <div className="panelBody">
                <div className="showPicture">
                    <Waterfall
                        list={movieList}
                        gutter={20}
                        width={200}
                        viewMode="search"
                    >
                        <MovidCard
                            viewMode="search"
                            breakpoints={{
                                1400: {
                                    //当屏幕宽度小于等于1200
                                    rowPerView: 5,
                                },
                                1200: {
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
        </div>
    );
};

export default Search;
