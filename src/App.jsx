import { useState, useMemo, useEffect, useRef } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { pageActiveStore, togglePageActive } from "@/store/coreSlice";
import { updateDownloadProcess } from "@/store/movieSlice";
import { applyTheme } from "./theme";
import { store } from "./utils/store";
import Navbar from "./components/Navbar";
import WinTool from "./components/WinTool";
import BottomNav from "./components/BottomNav";
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
import KeepAlive from "./components/KeepAlive";

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
        
        // 初始化主题设置
        const initTheme = async () => {
            const darkMode = await store.get("darkMode") || false;
            const themeColor = await store.get("themeColor") || "#335eea";
            applyTheme(darkMode, themeColor);
        };
        
        initTheme();
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
                            <KeepAlive cacheKey="movie" active={pageActive==="movie"}>
                                <Movie />
                            </KeepAlive>
                            <KeepAlive cacheKey="play" active={pageActive==="play"}>
                                <Play />
                            </KeepAlive>
                            <KeepAlive cacheKey="history" active={pageActive==="history"}>
                                <History />
                            </KeepAlive>
                            <KeepAlive cacheKey="star" active={pageActive==="star"}>
                                <Star />
                            </KeepAlive>
                            {osType === "desktop" && (
                                <KeepAlive cacheKey="download" active={pageActive==="download"}>
                                    <Download />
                                </KeepAlive>
                            )}
                            <KeepAlive cacheKey="settings" active={pageActive==="settings"}>
                                <Settings />
                            </KeepAlive>
                            <KeepAlive cacheKey="search" active={pageActive==="search"}>
                                <Search />
                            </KeepAlive>
                            <KeepAlive cacheKey="site" active={pageActive==="site"}>
                                <Site />
                            </KeepAlive>
                            <KeepAlive cacheKey="detail" active={pageActive==="detail"}>
                                <Detail />
                            </KeepAlive>
                        </Navbar>
                    </>
                )}
                {osType.toLowerCase().includes("mobile") && (
                    <>
                        <KeepAlive cacheKey="movie" active={pageActive==="movie"}>
                            <Movie />
                        </KeepAlive>
                        <KeepAlive cacheKey="play" active={pageActive==="play"}>
                            <Play />
                        </KeepAlive>
                        <KeepAlive cacheKey="history" active={pageActive==="history"}>
                            <History />
                        </KeepAlive>
                        <KeepAlive cacheKey="star" active={pageActive==="star"}>
                            <Star />
                        </KeepAlive>
                        <KeepAlive cacheKey="settings" active={pageActive==="settings"}>
                            <Settings />
                        </KeepAlive>
                        <KeepAlive cacheKey="search" active={pageActive==="search"}>
                            <Search />
                        </KeepAlive>
                        <KeepAlive cacheKey="site" active={pageActive==="site"}>
                            <Site />
                        </KeepAlive>
                        <KeepAlive cacheKey="detail" active={pageActive==="detail"}>
                            <Detail />
                        </KeepAlive>
                        <BottomNav value={pageActive} />
                    </>
                )}
            </main>
        </div>
    );
}

export default App;
