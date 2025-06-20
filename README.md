# VOP - 在线视频播放器

一个基于 Tauri + React 开发的跨平台在线视频播放应用，支持多个视频源站点的内容聚合和播放。

## 🚀 项目特性

- **跨平台支持**: 基于 Tauri 框架，支持 Windows、macOS、Linux
- **多源聚合**: 集成多个视频资源站点，提供丰富的影视内容
- **智能播放**: 支持多种视频格式和播放协议（HLS、FLV等）
- **下载管理**: 内置下载功能，支持离线观看
- **观看历史**: 自动记录观看进度和历史记录
- **收藏功能**: 支持收藏喜爱的影视内容
- **搜索功能**: 全站搜索，快速找到想看的内容
- **主题定制**: 支持自定义主题颜色
- **自动更新**: 内置应用更新机制

## 📦 技术栈

### 前端
- **React 18**: 现代化的用户界面框架
- **Vite**: 快速的构建工具
- **Ant Design**: 企业级UI组件库
- **Redux Toolkit**: 状态管理
- **Axios**: HTTP客户端
- **DPlayer**: 视频播放器
- **HLS.js & FLV.js**: 视频流播放支持

### 后端 (Rust)
- **Tauri**: 跨平台应用框架
- **Tokio**: 异步运行时
- **Serde**: 序列化/反序列化
- **Moka**: 内存缓存
- **M3U8-rs**: M3U8解析
- **AES & CBC**: 加密解密支持

### 数据存储
- **Dexie**: IndexedDB封装，本地数据存储
- **Tauri Store**: 配置数据持久化

## 🛠️ 开发环境设置

### 前置要求
- Node.js (推荐 18+)
- Rust (最新稳定版)
- pnpm 包管理器

### IDE 推荐
- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

### 安装依赖
```bash
# 安装前端依赖
pnpm install

# 安装 Tauri CLI
cargo install tauri-cli
```

### 开发模式
```bash
# 启动开发服务器
pnpm tauri dev
```

### 构建应用
```bash
# 构建生产版本
pnpm tauri build
```

## 📱 主要功能模块

### 1. 影视浏览 (Movie)
- 多站点资源聚合显示
- 分类筛选和排序
- 瀑布流布局展示
- 实时加载更多内容

### 2. 视频播放 (Play)
- 支持多种视频格式
- 自动记录播放进度
- 全屏播放支持
- 播放列表管理
- 二维码分享功能

### 3. 搜索功能 (Search)
- 全站内容搜索
- 搜索历史记录
- 智能搜索建议

### 4. 下载管理 (Download)
- 视频下载功能
- 下载进度监控
- 下载队列管理
- WebSocket实时通信

### 5. 观看历史 (History)
- 自动记录观看记录
- 继续观看功能
- 历史记录管理

### 6. 收藏管理 (Star)
- 收藏喜爱内容
- 收藏列表管理

### 7. 站点管理 (Site)
- 多视频源站点配置
- 站点状态监控
- 自定义站点添加

### 8. 设置中心 (Settings)
- 应用主题设置
- 播放器配置
- 内容过滤设置
- 系统参数配置
- 数据导入导出

## 🔧 配置说明

### 环境变量
- `.env.development`: 开发环境配置
- `.env.production`: 生产环境配置

### 主要配置项
- `excludeR18Site`: 是否排除成人内容站点
- `rootClassFilter`: 根分类过滤器
- `closeAppOption`: 应用关闭选项
- 主题颜色自定义
- 播放器参数配置

## 📄 项目结构

```
vop/
├── src/                    # 前端源码
│   ├── pages/             # 页面组件
│   ├── components/        # 通用组件
│   ├── api/              # API接口
│   ├── business/         # 业务逻辑
│   ├── store/            # 状态管理
│   ├── hooks/            # 自定义Hooks
│   ├── utils/            # 工具函数
│   └── static/           # 静态配置
├── src-tauri/             # Tauri后端
│   ├── src/              # Rust源码
│   ├── capabilities/     # 权限配置
│   └── icons/            # 应用图标
├── tauri-plugin-vop/      # 自定义Tauri插件
└── public/               # 静态资源
```

## 🔄 更新日志

查看 [CHANGELOG.md](./CHANGELOG.md) 了解版本更新详情。

## 📝 开发说明

### 添加新的视频源
1. 在 `src/static/sites.js` 中添加站点配置
2. 根据站点API格式调整解析逻辑
3. 测试站点可用性

### 自定义主题
1. 修改 `src/theme.js` 中的主题配置
2. 在设置页面中添加对应的配置项

### 扩展播放器功能
1. 在 `src/business/play.js` 中添加播放逻辑
2. 支持新的视频格式或协议

## ⚠️ 注意事项

- 本应用仅供学习和研究使用
- 请遵守相关法律法规和版权规定
- 视频内容来源于第三方站点，本应用不承担内容责任
- 建议在合法合规的前提下使用

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request 来改进项目。

## 📄 许可证

本项目采用开源许可证，具体请查看项目根目录下的许可证文件。
