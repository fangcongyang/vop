import { useState, useMemo, useEffect, useRef } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { pageActiveStore, togglePageActive } from "@/store/coreSlice";
import { updateDownloadProcess } from "@/store/movieSlice";
import Navbar from "./components/Navbar";
import WinTool from "./components/WinTool";
import Paper from "@mui/material/Paper";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Movie from "./pages/Movie";
import Play from "./pages/Play";
import History from "./pages/History";
import Download from "./pages/Download";
import Star from "./pages/Star";
import Settings from "./pages/Settings";
import { osType } from "@/utils/env";
import { DownloadBus } from "./business/download";
import "./App.scss";
import Search from "./pages/Search";
import Site from "./pages/Site";
import Detail from "./pages/Detail";

const downloadWebsocketNum = 2;
let downloadBusArr = [];

function App() {
    const dispatch = useAppDispatch();
    const pageActive = useAppSelector(pageActiveStore);
    const main = useRef(null);

    useEffect(() => {
        if (osType === "desktop") {
            initDownloadWebsocket();
            return () => {
                downloadBusArr.forEach((item) => {
                    item.compulsionClose();
                });
                downloadBusArr = [];
            };
        }
    }, []);

    const initDownloadWebsocket = () => {
        for (var i = 0; i < downloadWebsocketNum; i++) {
            const downloadBus = new DownloadBus();
            downloadBus.updateDownloadInfoEvent = (download) => {
                dispatch(updateDownloadProcess(download));
            };
            downloadBusArr.push(downloadBus);
        }
    };

    return (
        <div className="main-body">
            {osType == "desktop" && <WinTool />}
            <main ref={main}>
                {!osType.toLowerCase().includes("mobile") && (
                    <>
                        <Navbar>
                             <Movie
                                className={
                                    pageActive == "movie"
                                        ? ""
                                        : "hidden"
                                }
                            />
                            <Play
                                className={
                                    pageActive == "play" ? "" : "hidden"
                                }
                            />
                            <History
                                className={
                                    pageActive == "history"
                                        ? ""
                                        : "hidden"
                                }
                            />
                            <Star
                                className={
                                    pageActive == "star" ? "" : "hidden"
                                }
                            />
                            {osType === "desktop" && (
                                <Download
                                    className={
                                        pageActive == "download"
                                            ? ""
                                            : "hidden"
                                    }
                                />
                            )}
                            <Settings
                                className={
                                    pageActive == "settings"
                                        ? ""
                                        : "hidden"
                                }
                            />
                            <Search
                                className={
                                    pageActive == "search"
                                        ? ""
                                        : "hidden"
                                }
                            />
                            <Site
                                className={
                                    pageActive == "site" ? "" : "hidden"
                                }
                            />
                            <Detail
                                className={
                                    pageActive == "detail"
                                        ? ""
                                        : "hidden"
                                }
                            />
                        </Navbar>
                    </>
                )}
                {osType.toLowerCase().includes("mobile") && (
                    <>
                        <Movie
                            className={pageActive == "movie" ? "" : "hidden"}
                        />
                        <Play
                            className={pageActive == "play" ? "" : "hidden"}
                        />
                        <History
                            className={pageActive == "history" ? "" : "hidden"}
                        />
                        <Star
                            className={pageActive == "star" ? "" : "hidden"}
                        />
                        <Settings
                            className={pageActive == "settings" ? "" : "hidden"}
                        />
                        <Search
                            className={pageActive == "search" ? "" : "hidden"}
                        />
                        <Site
                            className={pageActive == "site" ? "" : "hidden"}
                        />
                        <Detail
                            className={pageActive == "detail" ? "" : "hidden"}
                        />
                        <Paper
                            sx={{
                                position: "fixed",
                                bottom: 0,
                                left: 0,
                                right: 0,
                            }}
                            elevation={3}
                        >
                            <BottomNavigation
                                value={pageActive}
                                onChange={(event, newValue) => {
                                    dispatch(togglePageActive(newValue));
                                }}
                                showLabels
                            >
                                <BottomNavigationAction
                                    label="影视"
                                    value="movie"
                                />
                                <BottomNavigationAction
                                    label="播放"
                                    value="play"
                                />
                                <BottomNavigationAction
                                    label="历史"
                                    value="history"
                                />
                                <BottomNavigationAction
                                    label="收藏"
                                    value="star"
                                />
                                <BottomNavigationAction
                                    label="设置"
                                    value="settings"
                                />
                            </BottomNavigation>
                        </Paper>
                    </>
                )}
            </main>
        </div>
    );
}

export default App;
