import { useState, useEffect } from "react";
import { useGlobalStore } from "@/store/useGlobalStore";
import { AutoComplete } from "antd";
import { getAllSearchList, addSearchRecord, clearSearchRecord } from "@/db";

const SearchAutoComplete = ({ width = "100%" }) => {
  const togglePageActive = useGlobalStore((state) => state.togglePageActive);
  const toggleSearchKeyword = useGlobalStore((state) => state.toggleSearchKeyword);
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
    if (e.key !== "Enter" && e.keyCode !== 13) return;
    if (!keywords) return;
    addSearchRecord(keywords).then(() => {
      getSearchList();
    });
    toggleSearchKeyword(keywords);
  };

  const goSearch = () => {
    togglePageActive("search");
  };

  const onClearSearchRecord = () => {
    clearSearchRecord().then(() => {
      getSearchList();
      setKeywords("");
      return;
    });
  };

  return (
    <AutoComplete
      style={{
        width: width,
      }}
      allowClear
      options={searchList}
      onChange={(value) => setKeywords(value)}
      onSelect={(value) => {
          if (value === "清除搜索记录") {
            onClearSearchRecord();
            return;
          }
          setKeywords(value);
          toggleSearchKeyword(value);
      }}
      onInputKeyDown={(e) => doSearch(e)}
      onFocus={() => goSearch()}
    />
  );
};

export default SearchAutoComplete;