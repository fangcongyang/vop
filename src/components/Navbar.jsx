import { memo } from "react";
import { useGlobalStore } from "@/store/useGlobalStore";
import SearchAutoComplete from "./SearchAutoComplete";
import "./Navbar.scss";

const Navbar = memo(({ children }) => {
  const osType = useGlobalStore((state) => state.osType);
  const pageActive = useGlobalStore((state) => state.pageActive);
  const togglePageActive = useGlobalStore((state) => state.togglePageActive);

  return (
    <div id="contentBody" className="navBar">
      <nav className="nav">
        <div className="navigationButtons">
        </div>
        <div className="navigationLinks">
          <a
            className={pageActive == "movie" ? "active" : ""}
            onClick={() => togglePageActive("movie")}
          >
            影视
          </a>
          <a
            className={pageActive == "play" ? "active" : ""}
            onClick={() => togglePageActive("play")}
          >
            播放
          </a>
          <a
            className={pageActive == "history" ? "active" : ""}
            onClick={() => togglePageActive("history")}
          >
            历史
          </a>
          <a
            className={pageActive == "star" ? "active" : ""}
            onClick={() => togglePageActive("star")}
          >
            收藏
          </a>
          {osType === "desktop" && (
            <a
              className={pageActive == "download" ? "active" : ""}
              onClick={() => togglePageActive("download")}
            >
              下载
            </a>
          )}
          <a
            className={pageActive == "settings" ? "active" : ""}
            onClick={() => togglePageActive("settings")}
          >
            设置
          </a>
        </div>

        <div className="rightPart">
          <SearchAutoComplete width={200} />
        </div>
      </nav>
      {children}
    </div>
  );
});

export default Navbar;
