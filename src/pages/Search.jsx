import { useEffect, useRef, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { useGlobalStore } from "@/store/useGlobalStore";
import { pageActiveStore } from "@/store/coreSlice";
import { searchKeywordStore, siteListStore } from "@/store/movieSlice";
import MovidCard from "@/components/MovieCard";
import Waterfall from "@/components/Waterfall";
import movieApi from "@/api/movies";
import { AutoComplete, message } from "antd";
import { getAllSearchList, addSearchRecord, clearSearchRecord } from "@/db";
import _ from "lodash";
import "./Movie.scss";

const searchInfo = {
  searchId: 0,
};
const Search = (props) => {
  const osType = useGlobalStore((state) => state.osType);
  const [messageApi] = message.useMessage();
  const siteList = useAppSelector(siteListStore);
  const pageActive = useAppSelector(pageActiveStore);
  const searchKeyword = useAppSelector(searchKeywordStore);
  const searchKeywordRef = useRef("");
  const movieListRef = useRef([]);
  const [movieList, setMovieList] = useState([]);
  const [searchList, setSearchList] = useState([]);

  useEffect(() => {
    if (
      osType != "mobile" &&
      pageActive === "search" &&
      searchKeyword != searchKeywordRef.current
    ) {
      searchKeywordRef.current = searchKeyword;
      searchMovie();
    }
  }, [pageActive, searchKeyword]);

  const getSearchList = () => {
    getAllSearchList().then((res) => {
      res.unshift({ id: -1, keyword: "清除搜索记录" });
      res = res.map((option) => {
        return { value: option.keyword };
      });
      setSearchList(res);
    });
  };

  const doSearch = (e) => {
    if (e.key === "Enter" || e.keyCode === 13) {
        addSearchRecord(keywords).then(() => {
          getSearchList();
        });
      searchMovie();
    }
  };
  
  const onClearSearchRecord = () => {
    clearSearchRecord().then(() => {
      getSearchList();
      searchKeywordRef.current = "";
      return;
    });
  };

  const isValidSearchResult = (detailRes) => {
    return (
      detailRes.dl.dd &&
      (detailRes.dl.dd._t ||
        (Object.prototype.toString.call(detailRes.dl.dd) === "[object Array]" &&
          detailRes.dl.dd.some((i) => i._t)))
    );
  };

  const searchMovie = _.debounce(async () => {
    searchInfo.searchId++;
    movieListRef.current = [];
    setMovieList([]);
    if (!searchKeywordRef.current) {
      return;
    }
    const id = searchInfo.searchId;
    const allSiteRequest = [];
    siteList.forEach((site) => {
      allSiteRequest.push(siteSearch(site, id));
    });
    Promise.all(allSiteRequest)
      .then(() => {})
      .catch((error) => {
        console.log(error);
      });
  }, 500);

  const siteSearch = (site, searchId) => {
    return new Promise((resolve, reject) => {
      movieApi
        .search(site, searchKeywordRef.current)
        .then((res) => {
          if (searchId !== searchInfo.searchId) {
            messageApi.info("搜索已取消");
            return reject("搜索已取消");
          }
          const processDetail = (detailRes) => {
            if (detailRes) {
              detailRes.site = site;
              detailRes.siteKey = site.site_key;
              if (isValidSearchResult(detailRes)) {
                let newMovieList = [...movieListRef.current, detailRes];
                newMovieList.sort((a, b) => a.site.id - b.site.id);
                movieListRef.current = newMovieList;
                setMovieList(newMovieList);
              }
            }
          };

          if (_.isArray(res)) {
            res.forEach((element) => {
              movieApi
                .detail(site, element.id)
                .then(processDetail)
                .finally(resolve);
            });
          } else if (_.isObject(res)) {
            movieApi.detail(site, res.id).then(processDetail).finally(resolve);
          }
        })
        .catch(() => {
            messageApi.error("搜索失败");
            resolve();
        });
    });
  };

  return (
    <div
      className={props.className ? "pageMain " + props.className : "pageMain"}
    >
      {osType.toLowerCase().includes("mobile") && (
        <div style={{ marginTop: "10px" }}>
            <AutoComplete
              style={{
                width: 200,
              }}
              allowClear
              clearText="清除"
              options={searchList}
              onChange={(value) => {
                if (value === "清除搜索记录") {
                  onClearSearchRecord();
                  return;
                }
                searchKeywordRef.current = value;
              }}
              onInputKeyDown={doSearch}
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
            rowKey={["id", "siteKey"]}
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
