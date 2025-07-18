import { useEffect, useRef } from "react";
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
import { useMovieStore } from "@/store/useMovieStore";

const downloadWebsocketNum = 2;
let downloadBusArr = [];

function Main() {
  const pageActive = useGlobalStore((state) => state.pageActive);
  const updateDownloadInfoProcess = useMovieStore((state) => state.updateDownloadInfoProcess);
  const osType = useGlobalStore((state) => state.osType);
  const main = useRef(null);

  const initDownloadWebsocket = () => {
    for (var i = 0; i < downloadWebsocketNum; i++) {
      const downloadBus = new DownloadBus();
      downloadBus.updateDownloadInfoEvent = (download) => {
        updateDownloadInfoProcess(download);
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
