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
import AppLock from "@/components/AppLock";

const windowMap = {
  main: <Main />,
  topSmallPlay: <SmallPlay />,
};

function App() {
  // 使用深拷贝初始化主题状态，确保后续更新能被正确识别
  const [antdTheme, setAntdTheme] = useState({ ...antdThemeConfig });
  const [darkMode] = useConfig("darkMode", false);
  const [appLockEnabled] = useConfig("appLockEnabled", false);
  const [passwordHash] = useConfig("appLockPasswordHash", "");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const initGlobal = useGlobalStore((s) => s.initGlobal)

  useEffect(() => {
    // 等待配置加载完成后再检查应用锁状态
    const checkLockStatus = async () => {
      try {
        // 直接从store同步获取最新配置，避免useConfig的延时问题
        const currentAppLockEnabled = await store.get("appLockEnabled") ?? false;
        const currentPasswordHash = await store.get("appLockPasswordHash") ?? "";
        
        setConfigLoaded(true);
        
        if (!currentAppLockEnabled) {
          setIsUnlocked(true);
        } else {
          // 如果启用了应用锁但没有设置密码，也应该解锁
          if (!currentPasswordHash) {
            setIsUnlocked(true);
          }
          // 如果启用了应用锁且设置了密码，保持锁定状态（isUnlocked = false）
        }
      } catch (error) {
        console.error("检查应用锁状态失败:", error);
        // 出错时为了安全起见，保持锁定状态
        setConfigLoaded(true);
      }
    };
    
    checkLockStatus();
  }, []);

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

  // 配置未加载完成时，显示空白页面避免闪烁
  if (!configLoaded) {
    return (
      <ConfigProvider theme={antdTheme}>
        <div style={{ 
           width: '100vw', 
           height: '100vh', 
           backgroundColor: 'var(--color-bg-container)', 
           display: 'flex', 
           flexDirection: 'column',
           alignItems: 'center', 
           justifyContent: 'center',
           gap: '20px'
         }}>
           {/* 旋转加载动画 */}
           <div style={{
             width: '48px',
             height: '48px',
             border: '4px solid var(--color-border)',
             borderTop: '4px solid var(--color-primary)',
             borderRadius: '50%',
             animation: 'spin 1s linear infinite'
           }} />
           <div style={{
             color: 'var(--color-text-secondary)',
             fontSize: '14px',
             fontWeight: '500'
           }}>
             正在加载应用...
           </div>
           <style>{`
             @keyframes spin {
               0% { transform: rotate(0deg); }
               100% { transform: rotate(360deg); }
             }
           `}</style>
         </div>
      </ConfigProvider>
    );
  }

  // 如果启用了应用锁且未解锁，显示锁屏界面
  if (appLockEnabled && passwordHash && !isUnlocked) {
    return (
      <ConfigProvider theme={antdTheme}>
        <AppLock
          visible={true}
          onUnlock={() => setIsUnlocked(true)}
        />
      </ConfigProvider>
    );
  }

  return (
    <BrowserRouter>
      <ConfigProvider theme={antdTheme}>
        {windowMap[getCurrentWindow().label]}
      </ConfigProvider>
    </BrowserRouter>
  );
}

export default App;
