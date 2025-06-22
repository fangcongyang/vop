import { useState, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { updateDownloadProcess } from "@/store/movieSlice";
import { ask } from "@tauri-apps/plugin-dialog";
import { exit } from "@tauri-apps/plugin-process";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { applyTheme, antdThemeConfig } from "./theme";
import { pageActiveStore } from "@/store/coreSlice";
import { store } from "@/utils/store";
import { useConfig } from "@/hooks";
import WinTool from "./components/WinTool";
import Navbar from "./components/Navbar";
import KeepAlive from "./components/KeepAlive";
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
import { ConfigProvider } from "antd";
import "./App.scss";

const downloadWebsocketNum = 2;
let downloadBusArr = [];

function App() {
  const dispatch = useAppDispatch();
  const pageActive = useAppSelector(pageActiveStore);
  const main = useRef(null);
  const exitUnlistenFn = useRef(null);
  const [closeAppOption] = useConfig("closeAppOption", "ask"); // 添加状态
  // 使用深拷贝初始化主题状态，确保后续更新能被正确识别
  const [antdTheme, setAntdTheme] = useState({ ...antdThemeConfig });

  useEffect(() => {
    if (osType === "desktop") {
      initDownloadWebsocket();
    }

    // 初始化主题设置
    const initTheme = async () => {
      const darkMode = (await store.get("darkMode")) || false;
      const themeColor = (await store.get("themeColor")) || "#335eea";
      applyTheme(darkMode, themeColor);
    };

    initTheme();
    // 监听Ant Design主题更新事件
    const handleAntdThemeUpdate = (event) => {
      // 使用深拷贝确保React能检测到状态变化
      setAntdTheme({ ...event.detail });
    };
    window.addEventListener("antd-theme-update", handleAntdThemeUpdate);
    return () => {
      if (osType === "desktop") {
        downloadBusArr.forEach((item) => {
          item.compulsionClose();
        });
        downloadBusArr = [];
      }
      window.removeEventListener("antd-theme-update", handleAntdThemeUpdate);
    };
  }, []);

  // 监听配置更新
  useEffect(() => {
    if (osType === "desktop") {
      getCurrentWindow()
        .onCloseRequested(async (event) => {
          event.preventDefault();
          if (closeAppOption === "ask") {
            const ok = await ask("是否退出程序？", {
              kind: "error",
              title: "退出",
            });
            if (ok) {
              exit(0);
            }
          } else if (closeAppOption === "close") {
            exit(0);
          } else {
            await getCurrentWindow().minimize();
          }
        })
        .then((unlisten) => {
          if (exitUnlistenFn.current) {
            exitUnlistenFn.current();
          }
          exitUnlistenFn.current = unlisten;
        });
    }
    return () => {
      if (osType === "desktop") {
        if (exitUnlistenFn.current) {
          exitUnlistenFn.current();
          exitUnlistenFn.current = null;
        }
      }
    };
  }, [closeAppOption]);

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
    <ConfigProvider theme={antdTheme}>
      <div className="main-body">
        {osType == "desktop" && <WinTool />}
        <main ref={main}>
          {!osType.toLowerCase().includes("mobile") && (
            <>
              <Navbar>
                <KeepAlive cacheKey="movie" active={pageActive === "movie"}>
                  <Movie />
                </KeepAlive>
                <KeepAlive cacheKey="play" active={pageActive === "play"}>
                  <Play />
                </KeepAlive>
                <KeepAlive cacheKey="history" active={pageActive === "history"}>
                  <History />
                </KeepAlive>
                <KeepAlive cacheKey="star" active={pageActive === "star"}>
                  <Star />
                </KeepAlive>
                {osType === "desktop" && (
                  <KeepAlive
                    cacheKey="download"
                    active={pageActive === "download"}
                  >
                    <Download />
                  </KeepAlive>
                )}
                {pageActive === "settings" && <Settings />}
                <KeepAlive cacheKey="search" active={pageActive === "search"}>
                  <Search />
                </KeepAlive>
                {pageActive === "site" && <Site />}
                {pageActive === "detail" && <Detail />}
              </Navbar>
            </>
          )}
          {osType.toLowerCase().includes("mobile") && (
            <>
              <KeepAlive cacheKey="movie" active={pageActive === "movie"}>
                <Movie />
              </KeepAlive>
              <KeepAlive cacheKey="play" active={pageActive === "play"}>
                <Play />
              </KeepAlive>
              <KeepAlive cacheKey="history" active={pageActive === "history"}>
                <History />
              </KeepAlive>
              <KeepAlive cacheKey="star" active={pageActive === "star"}>
                <Star />
              </KeepAlive>
              {pageActive === "settings" && <Settings />}
              <KeepAlive cacheKey="search" active={pageActive === "search"}>
                <Search />
              </KeepAlive>
              {pageActive === "site" && <Site />}
              {pageActive === "detail" && <Detail />}
              <BottomNav value={pageActive} />
            </>
          )}
        </main>
      </div>
    </ConfigProvider>
  );
}

export default App;
