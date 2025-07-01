import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { updateDownloadProcess } from "@/store/movieSlice";
import { ask } from "@tauri-apps/plugin-dialog";
import { exit } from "@tauri-apps/plugin-process";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { pageActiveStore } from "@/store/coreSlice";
import { useConfig } from "@/hooks";
import { useGlobalStore } from "@/store/useGlobalStore";
import WinTool from "@/components/WinTool";
import Navbar from "@/components/Navbar";
import KeepAlive from "@/components/KeepAlive";
import BottomNav from "@/components/BottomNav";
import Movie from "@/pages/Movie";
import Play from "@/pages/Play";
import History from "@/pages/History";
import Download from "@/pages/Download";
import Star from "@/pages/Star";
import Settings from "@/pages/Settings";
import { DownloadBus } from "@/business/download";
import "./index.scss";
import Search from "@/pages/Search";
import Site from "@/pages/Site";
import Detail from "@/pages/Detail";

const downloadWebsocketNum = 2;
let downloadBusArr = [];

function Main() {
  const dispatch = useAppDispatch();
  const pageActive = useAppSelector(pageActiveStore);
  const osType = useGlobalStore((state) => state.osType);
  const main = useRef(null);
  const exitUnlistenFn = useRef(null);
  const [closeAppOption] = useConfig("closeAppOption", "ask"); // 添加状态

  const initDownloadWebsocket = () => {
    for (var i = 0; i < downloadWebsocketNum; i++) {
      const downloadBus = new DownloadBus();
      downloadBus.updateDownloadInfoEvent = (download) => {
        dispatch(updateDownloadProcess(download));
      };
      downloadBusArr.push(downloadBus);
    }
  };

  useEffect(() => {
    if (osType === "desktop") {
      initDownloadWebsocket();
    }

    return () => {
      if (osType === "desktop") {
        downloadBusArr.forEach((item) => {
          item.compulsionClose();
        });
        downloadBusArr = [];
      }
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

  return (
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
              {pageActive === "history" && <History />}
              {pageActive === "star" && <Star />}
              {osType === "desktop" && (
                pageActive === "download" && <Download />
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
            {pageActive === "history" && <History />}
            {pageActive === "star" && <Star />}
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
  );
}

export default Main;
