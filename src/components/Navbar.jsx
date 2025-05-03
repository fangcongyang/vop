import { useState, useRef, memo, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { pageActiveStore, togglePageActive } from "@/store/coreSlice";
import { searchKeywordStore, updateSearchKeyword } from "@/store/movieSlice";
import SvgIcon from "./SvgIcon";
import ButtonIcon from "./ButtonIcon";
import { AutoComplete } from "antd";
import { osType } from "@/utils/env";
import { getAllSearchList, addSearchRecord, clearSearchRecord } from "@/db";
import "./Navbar.scss";

const Navbar = memo(({ children }) => {
  const dispatch = useAppDispatch();
  const pageActive = useAppSelector(pageActiveStore);
  const [inputFocus, setInputFocus] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [searchList, setSearchList] = useState([]);

  useEffect(() => {
    getSearchList();
  }, []);

  const getSearchList = () => {
    getAllSearchList().then((res) => {
      res.unshift({ id: -1, keyword: "清除搜索记录" });
      res = res.map((option) => {return { value: option.keyword }})
      setSearchList(res);
    });
  };

  const doSearch = (e) => {
    if (e.key !== "Enter") return;
    if (!keywords) return;
    addSearchRecord(keywords).then(() => {
      getSearchList();
    });
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

  return (
    <div id="contentBody" className="navBar">
      <nav className="nav">
        <div className="navigationButtons">
        </div>
        <div className="navigationLinks">
          <a
            className={pageActive == "movie" ? "active" : ""}
            onClick={() => dispatch(togglePageActive("movie"))}
          >
            影视
          </a>
          <a
            className={pageActive == "play" ? "active" : ""}
            onClick={() => dispatch(togglePageActive("play"))}
          >
            播放
          </a>
          <a
            className={pageActive == "history" ? "active" : ""}
            onClick={() => dispatch(togglePageActive("history"))}
          >
            历史
          </a>
          <a
            className={pageActive == "star" ? "active" : ""}
            onClick={() => dispatch(togglePageActive("star"))}
          >
            收藏
          </a>
          {osType === "desktop" && (
            <a
              className={pageActive == "download" ? "active" : ""}
              onClick={() => dispatch(togglePageActive("download"))}
            >
              下载
            </a>
          )}
          <a
            className={pageActive == "settings" ? "active" : ""}
            onClick={() => dispatch(togglePageActive("settings"))}
          >
            设置
          </a>
        </div>

        <div className="rightPart">
          <AutoComplete
            style={{
              width: 200,
            }}
            allowClear
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
      </nav>
      {children}
    </div>
  );
});

export default Navbar;
