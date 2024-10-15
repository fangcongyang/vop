import { useState, useRef, memo, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { pageActiveStore, togglePageActive } from "@/store/coreSlice";
import { searchKeywordStore, updateSearchKeyword } from "@/store/movieSlice";
import SvgIcon from "./SvgIcon";
import ButtonIcon from "./ButtonIcon";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
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
            setSearchList(res);
        });
    };

    const doSearch = (e) => {
        if (e.key !== "Enter") return;
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

    const go = (where) => {};

    return (
        <div className="navBar">
            <nav className="nav">
                <div className="navigationButtons">
                    <ButtonIcon
                        onClick={() => go("back")}
                        children={<SvgIcon name="arrow-left" title="后退" />}
                    />
                    <ButtonIcon
                        children={<SvgIcon name="arrow-right" title="前进" />}
                        onClick={() => go("forward")}
                    />
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
                            onClick={() =>
                                dispatch(togglePageActive("download"))
                            }
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
                    <Autocomplete
                        freeSolo
                        id="free-solo"
                        size="small"
                        sx={{
                            width: 200,
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
                        clearText="清除"
                        options={searchList.map((option) => option.keyword)}
                        onClose={(event) => {
                            clearSearchRecord().then(() => {
                                getSearchList();
                                setKeywords("");
                                return;
                            });
                        }}
                        onChange={(event, value) => {
                            if (typeof value === "string") {
                                dispatch(updateSearchKeyword(value));
                            }
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="搜索"
                                value={keywords}
                                InputProps={{
                                    ...params.InputProps,
                                    type: "search",
                                }}
                                onKeyDown={(e) => doSearch(e)}
                                onChange={(e) => setKeywords(e.target.value)}
                                onClick={(e) => goSearch()}
                            />
                        )}
                    />
                </div>
            </nav>
            {children}
        </div>
    );
});

export default Navbar;
