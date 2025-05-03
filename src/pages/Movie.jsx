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
import movieApi from "@/api/movies";
import { cacheData, getCacheData } from "@/business/cache";
import {
  getSiteClassList,
  cacheSiteClassList,
  getSiteList,
  getAllSearchList,
  addSearchRecord,
  clearSearchRecord,
} from "@/db";
import { uniqBy } from "lodash";
import { AutoComplete, message, Button } from "antd";
import { LoadingOutlined, UpOutlined, DownOutlined } from "@ant-design/icons";
import { Flex, Spin } from "antd";
import { osType } from "@/utils/env";
import utils from "@/utils";
import NProgress from "nprogress";
import { useConfig, useGetState } from "@/hooks";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import "./Movie.scss";


let movieInfo = {
  forceRequest: false,
  classChange: false,
  movieRequestList: false,
  currentSite: {},
  classType: 0,
};

const Movie = () => {
  const dispatch = useAppDispatch();
  const [messageApi, contextHolder] = message.useMessage();
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

  const [excludeR18Classes, setExcludeR18Classes] = useConfig(
    "excludeR18Classes",
    false
  );
  const [r18ClassFilter, setR18ClassFilter] = useConfig("r18ClassFilter", []);
  const [classList, setClassList] = useState([]);
  const [currentClass, setCurrentClass] = useState({ id: -1, name: "" });
  const movieListRef = useRef([]);
  const pageRef = useRef(1);
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
  const cancelSiteClassRequest = useRef(null);
  const loadingRef = useRef(null);
  const [showBackTop, setShowBackTop] = useState(false);

  // 优化后的 IntersectionObserver 监听
  useIntersectionObserver(loadingRef, async () => {
    if (pageRef.current > getMoviePageInfo().pageCount) return messageApi.info("已加载全部");
    await infiniteHandler(pageRef.current);
    pageRef.current = pageRef.current + 1;
  }, { root: null, threshold: 0.5 });
  
  // 监听页面滚动，控制回到顶部按钮的显示和隐藏
  useEffect(() => {
    const handleScroll = () => {
      if (pageMainRef.current) {
        setShowBackTop(pageMainRef.current.scrollTop > 300);
      }
    };
    
    const pageMainElement = pageMainRef.current;
    if (pageMainElement) {
      pageMainElement.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (pageMainElement) {
        pageMainElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  useEffect(() => {
    getSiteList().then((result) => {
      if (result) {
        result = result.filter((item) => {
          return !excludeR18Site || item.site_group !== "18+";
        });
        dispatch(storeSiteList({ siteList: result, forceRefresh: true }));
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

  const siteClick = (site) => {

    // 重置状态
    setClassList([]);
    resetMoviePageInfo();
    dispatch(toggleCurrentSite(site));
    movieInfo.currentSite = site;

    // 取消之前的请求
    if (cancelSiteClassRequest.current) {
      cancelSiteClassRequest.current();
    }

    // 创建可取消的请求
    const { cancelableRequest, cancel } = utils.createCancelableRequest(() =>
      getSiteClassList(site.site_key)
        .then((newClassList) => {
          if (newClassList?.length > 0) {
            setClassList(newClassList);
            classClick(newClassList[0]);
          } else {
            refreshClass();
          }
        })
        .catch(() => refreshClass())
        .finally(() => {
          cancelSiteClassRequest.current = null;
        })
    );

    cancelableRequest.apply();
    cancelSiteClassRequest.current = cancel;
  };

  const refreshClass = async () => {
    const site = movieInfo.currentSite;
    try {
      const res = await movieApi.getSiteClass(site);
      const allClass = [{ class_id: -1, class_name: "最新" }, ...res.classList];
      const classList = await cacheSiteClassList(site.site_key, allClass);

      // 查找匹配的分类或使用第一个分类
      const classType =
        classList.find((x) => x.name === currentClass.name) || classList[0];

      setClassList(classList);
      classClick(classType);
    } catch (err) {
      messageApi.error("获取分类资源失败");
      movieListRef.current = [];
    }
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
        (excludeRootClasses && !anyContain(item.class_name, rootClassFilter)) ||
        !excludeRootClasses;
      let r18Exclude =
        (excludeR18Classes && !anyContain(item.class_name, r18ClassFilter)) ||
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

    NProgress.start();
    movieListRef.current = [];
    setTipMessage("加载中...");
    movieInfo.classType = classType;
    movieInfo.classChange = true;

    const site = movieInfo.currentSite;
    resetMoviePageInfo();
    const classId = classType.class_id;

    if (classId !== currentClass.class_id) {
      setCurrentClass(classType);
    }

    pageRef.current = 1;
    const cacheKey = site.site_key + "@" + classId + "@" + pageRef.current;
    getCacheData(cacheKey)
      .then((data) => {
        if (data?.movieList?.length) {
          setMoviePageInfo(data);
          refreshFilteredList(data.movieList);
        } else {
          // 请求新数据
          const params = classId !== -1 ? { t: classId } : {};
          return movieApi.pageMovies(site, params);
        }
      })
      .then(async (res) => {
        if (res) {
          setMoviePageInfo(res);
          movieInfo.forceRequest = true;
          await infiniteHandler(pageRef.current);
          pageRef.current = pageRef.current + 1;
        }
      })
      .catch((err) => {
        setTipMessage("获取数据失败");
        messageApi.error("获取分类资源失败");
      })
      .finally(() => {
        movieInfo.classChange = false;
        NProgress.done();
      });
  };

  const infiniteHandler = async (page) => {
    // 如果正在处理其他请求且不是强制请求，则跳过
    if (
      !movieInfo.forceRequest &&
      (movieInfo.classChange || movieInfo.movieRequestList)
    ) {
      return;
    }

    const site = movieInfo.currentSite;
    const classId = movieInfo.classType.class_id;
    const cacheKey = `${site.site_key}@${classId}@${page}`;

    setTipMessage("加载中...");
    movieInfo.forceRequest = false;

    try {
      // 尝试从缓存获取数据
      const cachedData = await getCacheData(cacheKey);
      if (cachedData?.movieList?.length) {
        setMoviePageInfo(cachedData);
        refreshFilteredList(cachedData.movieList);
        return;
      }

      // 缓存中没有数据，需要请求新数据
      movieInfo.movieRequestList = true;

      // 验证请求参数
      const totalPageCount = getMoviePageInfo().totalPageCount;
      if (
        !site.site_key ||
        page < 1 ||
        (totalPageCount > 0 && page > totalPageCount)
      ) {
        movieInfo.movieRequestList = false;
        return false;
      }

      // 准备请求参数
      const listMoviesParams = {
        t: classId === -1 ? undefined : classId,
        pg: page,
      };

      // 请求新数据
      const res = await movieApi.listMovies(site, listMoviesParams);

      if (res) {
        // 更新状态
        setMoviePageInfo((prevState) => ({ ...prevState, movieList: res }));

        // 更新缓存
        cacheData(cacheKey, getMoviePageInfo());

        // 更新列表
        refreshFilteredList(res);
      } else {
        messageApi.error("获取资源列表失败");
      }
    } catch (error) {
      messageApi.error("获取资源列表失败");
    } finally {
      movieInfo.movieRequestList = false;
    }
  };

  const refreshFilteredList = (res) => {
    let filteredData = movieListRef.current.concat(res);
    movieListRef.current = filteredData;
    movieInfo.movieRequestList = false;
  };

  const movieFilteredList = useMemo(() => {
    let filteredData = movieListRef.current;

    filteredData = uniqBy(filteredData, "name");

    if (!filteredData || filteredData.length == 0) {
      setTipMessage("暂无数据");
      return [];
    }
    return filteredData;
  }, [movieListRef.current]);

  const getSearchList = () => {
    getSearchList().then((res) => {
      res = res.map((option) => {
        return { value: option.keyword };
      });
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

  const onClearSearchRecord = () => {
    clearSearchRecord().then(() => {
      getSearchList();
      setKeywords("");
      return;
    });
  };
  
  // 回到顶部功能
  const scrollToTop = () => {
    if (pageMainRef.current) {
      pageMainRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };
  
  // 滚动到底部功能
  const scrollToBottom = () => {
    if (pageMainRef.current) {
      pageMainRef.current.scrollTo({
        top: pageMainRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div
      ref={pageMainRef}
      className="pageMain"
    >
      <div className="panel">
        {osType.toLowerCase().includes("mobile") && (
          <div className="movieSearch">
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
                setKeywords(value);
                dispatch(updateSearchKeyword(value));
              }}
              onInputKeyDown={(e) => doSearch(e)}
              onFocus={() => goSearch()}
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
                    currentSite.site_key == site.site_key ? "cat active" : "cat"
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
          >
            <MovieCard
              site={currentSite}
            />
          </Waterfall>
        </div>
      </div>
      {movieFilteredList.length > 0 && <div ref={loadingRef} className="loading">
        <Spin indicator={<LoadingOutlined spin />} />
      </div>}
      
      {/* 回到顶部按钮 */}
      {showBackTop && (
        <Button 
          className="back-to-top-btn" 
          type="primary" 
          shape="circle" 
          icon={<UpOutlined />} 
          onClick={scrollToTop} 
        />
      )}
      
      {/* 滚动到底部按钮 */}
      {showBackTop && (
        <Button 
          className="scroll-to-bottom-btn" 
          type="primary" 
          shape="circle" 
          icon={<DownOutlined />} 
          onClick={scrollToBottom} 
        />
      )}
    </div>
  );
};

export default Movie;
