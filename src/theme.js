// 主题管理工具
import { theme as antdTheme } from 'antd';

// 全局Ant Design主题配置对象
export let antdThemeConfig = {
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    colorPrimary: '#335eea',
  },
};

/**
 * 应用主题设置
 * @param {boolean} darkMode - 是否启用暗色模式
 * @param {string} themeColor - 主题色（十六进制颜色值）
 */
export const applyTheme = (darkMode, themeColor) => {
  // 应用暗色/亮色模式
  if (darkMode) {
    document.documentElement.classList.add('dark-mode');
    document.documentElement.style.setProperty('--color-body-bg', '#121212');
    document.documentElement.style.setProperty('--color-text', '#ffffff');
    document.documentElement.style.setProperty('--color-secondary-bg', '#2d2d2d');
    document.documentElement.style.setProperty('--color-navbar-bg', 'rgba(18, 18, 18, 0.86)');
  } else {
    document.documentElement.classList.remove('dark-mode');
    document.documentElement.style.setProperty('--color-body-bg', '#ffffff');
    document.documentElement.style.setProperty('--color-text', '#000');
    document.documentElement.style.setProperty('--color-secondary-bg', '#f5f5f7');
    document.documentElement.style.setProperty('--color-navbar-bg', 'rgba(255, 255, 255, 0.86)');
  }

  // 应用主题色
  if (themeColor) {
    document.documentElement.style.setProperty('--color-primary', themeColor);
    // 生成主题色的背景色（淡化版本）
    const r = parseInt(themeColor.slice(1, 3), 16);
    const g = parseInt(themeColor.slice(3, 5), 16);
    const b = parseInt(themeColor.slice(5, 7), 16);
    document.documentElement.style.setProperty('--color-primary-bg', `rgba(${r}, ${g}, ${b}, 0.1)`);
    document.documentElement.style.setProperty('--color-primary-bg-for-transparent', `rgba(${r}, ${g}, ${b}, 0.28)`);
  }

  // 更新Ant Design主题配置
  updateAntdTheme(darkMode, themeColor);
};

/**
 * 更新Ant Design主题配置
 * @param {boolean} darkMode - 是否启用暗色模式
 * @param {string} themeColor - 主题色（十六进制颜色值）
 */
const updateAntdTheme = (darkMode, themeColor) => {
  // 创建新的主题配置对象（深拷贝），确保引用变化
  const newThemeConfig = {
    algorithm: darkMode 
      ? antdTheme.darkAlgorithm 
      : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: themeColor || antdThemeConfig.token.colorPrimary,
    }
  };
  
  // 更新全局配置对象
  antdThemeConfig = newThemeConfig;

  // 触发主题更新事件，以便应用中的组件可以响应主题变化
  // 传递新对象的引用，确保React能检测到变化
  window.dispatchEvent(new CustomEvent('antd-theme-update', { detail: newThemeConfig }));
};