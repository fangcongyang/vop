import { useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { settingsStore } from "@/store/coreSlice";
import SvgIcon from "./SvgIcon";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./WinTool.scss";

const WinTool = () => {
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const settings = useAppSelector(settingsStore);

  const svgStyle = {
    width: "8Px",
    height: "14Px",
  };

  async function handleAlwaysTop() {
    setIsAlwaysOnTop(!isAlwaysOnTop);
    await getCurrentWindow().setAlwaysOnTop(isAlwaysOnTop);
  }

  // 最小化
  const handleWinMin = async () => {
    await getCurrentWindow().minimize();
  };

  // 最小化
  const handleWinMax2Min = async () => {
    const resizable = await getCurrentWindow().isResizable();
    if (!resizable) return;
    await getCurrentWindow().setFullscreen(!fullscreen);
    setFullscreen(!fullscreen);
  };

  // 关闭
  const handleWinClose = async () => {
    await getCurrentWindow().close();
  };

  return (
    <div className="frame">
      <div className="content">
        <span className="title">{settings.title}</span>
        <div data-tauri-drag-region>
          <span className="top" onClick={handleAlwaysTop}>
            <SvgIcon
              name="wintool-ontop"
              title="data.isAlwaysOnTop ? '取消置顶' : '置顶'"
              style={svgStyle}
              color={isAlwaysOnTop ? "#555555" : "#ffffff"}
            ></SvgIcon>
          </span>
          <span className="min" onClick={handleWinMin}>
            <SvgIcon
              name="wintool-min"
              title="最小化"
              style={svgStyle}
              color="#ffffff"
            ></SvgIcon>
          </span>
          <span className="max" onClick={handleWinMax2Min}>
            <SvgIcon
              name="wintool-max"
              title={fullscreen ? "还原" : "最大化"}
              style={svgStyle}
              color="#ffffff"
            ></SvgIcon>
          </span>
          <span v-if="closable" className="close" onClick={handleWinClose}>
            <SvgIcon
              title="关闭"
              name="wintool-close"
              style={svgStyle}
              color="#ffffff"
            ></SvgIcon>
          </span>
        </div>
      </div>
    </div>
  );
};

export default WinTool;
