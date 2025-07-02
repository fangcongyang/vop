import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window"
import { applyTheme, antdThemeConfig } from "./theme";
import { store } from "@/utils/store";
import { ConfigProvider } from "antd";
import { BrowserRouter } from "react-router-dom";
import { useGlobalStore } from "@/store/useGlobalStore";
import { useConfig } from "@/hooks/useConfig";
import Main from "@/windows/main";
import SmallPlay from "@/windows/small_play";

const windowMap = {
  main: <Main />,
  topSmallPlay: <SmallPlay />,
};

function App() {
  // 使用深拷贝初始化主题状态，确保后续更新能被正确识别
  const [antdTheme, setAntdTheme] = useState({ ...antdThemeConfig });
  const [darkMode] = useConfig("darkMode", false);
  const initGlobal = useGlobalStore((s) => s.initGlobal)

  useEffect(() => {
    initGlobal();
  }, []);

  useEffect(() => {
    // 初始化主题设置
    const initTheme = async () => {
      const localDarkMode = darkMode || false;
      const themeColor = (await store.get("themeColor")) || "#335eea";
      applyTheme(localDarkMode, themeColor);
    };

    initTheme();
    // 监听Ant Design主题更新事件
    const handleAntdThemeUpdate = (event) => {
      // 使用深拷贝确保React能检测到状态变化
      setAntdTheme({ ...event.detail });
    };
    window.addEventListener("antd-theme-update", handleAntdThemeUpdate);
    return () => {
      window.removeEventListener("antd-theme-update", handleAntdThemeUpdate);
    };
  }, [darkMode]);

  return (
    <BrowserRouter>
      <ConfigProvider theme={antdTheme}>
        {windowMap[getCurrentWindow().label]}
      </ConfigProvider>
    </BrowserRouter>
  );
}

export default App;
