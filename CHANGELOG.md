## [0.2.2](https://github.com/fangcongyang/vop/compare/v0.2.1...v0.2.2) (2025-07-17)


### 🐛 Bug Fixes | Bug 修复

* 使用get方法从siteMap获取站点名称以避免undefined错误 ([](https://github.com/fangcongyang/vop/commit/d4599bb))
* 修复站点名称显示问题并更新版本号至0.2.2 ([](https://github.com/fangcongyang/vop/commit/f48c823))
* **db:** 修复获取站点分类列表时的错误处理 ([](https://github.com/fangcongyang/vop/commit/c5c4b66))



## [0.2.1](https://github.com/fangcongyang/vop/compare/0.2.1...v0.2.1) (2025-07-13)


### 🐛 Bug Fixes | Bug 修复

* 修复秒数输入限制并更新版本号至0.2.1 ([](https://github.com/fangcongyang/vop/commit/9e52075))



# [0.2.0](https://github.com/fangcongyang/vop/compare/0.2.0...v0.2.0) (2025-07-12)



## [0.1.9](https://github.com/fangcongyang/vop/compare/0.1.9...v0.1.9) (2025-07-12)


### 🐛 Bug Fixes | Bug 修复

* **htmlParseStrategy:** 优化URL列表过滤逻辑 ([](https://github.com/fangcongyang/vop/commit/8688480))



## [0.1.8](https://github.com/fangcongyang/vop/compare/0.1.7...0.1.8) (2025-07-12)


### 🐛 Bug Fixes | Bug 修复

* **htmlParseStrategy:** 修复文件扩展名提取逻辑中的错误 ([](https://github.com/fangcongyang/vop/commit/af345c0))



## [0.1.7](https://github.com/fangcongyang/vop/compare/v0.1.6...0.1.7) (2025-07-12)


### 🐛 Bug Fixes | Bug 修复

* **Download:** 修复重试按钮在下载失败时才显示的问题 ([](https://github.com/fangcongyang/vop/commit/452db0d))
* **m3u8下载:** 修复Windows下ffmpeg命令窗口显示问题 ([](https://github.com/fangcongyang/vop/commit/7821cd2))
* **play:** 修复播放器清理和锁定功能 ([](https://github.com/fangcongyang/vop/commit/e50fdc2))



## [0.1.6](https://github.com/fangcongyang/vop/compare/0.1.6...v0.1.6) (2025-07-07)


### ✨ Features | 新功能

* **hotkey:** 添加全局快捷键支持并优化代码结构 ([](https://github.com/fangcongyang/vop/commit/ccd9d27))
* **utils:** 添加秒数转分钟秒数的格式化函数 ([](https://github.com/fangcongyang/vop/commit/0e4bec9))
* **utils:** 添加清理定时器的公共方法 ([](https://github.com/fangcongyang/vop/commit/2fc9a13))



## [0.1.5](https://github.com/fangcongyang/vop/compare/0.1.5...v0.1.5) (2025-07-06)


### ✨ Features | 新功能

* **star:** 添加收藏导入导出功能 ([](https://github.com/fangcongyang/vop/commit/fb85dab))



## [0.1.4](https://github.com/fangcongyang/vop/compare/0.1.4...v0.1.4) (2025-07-06)


### ✨ Features | 新功能

* **安全:** 添加应用锁功能 ([](https://github.com/fangcongyang/vop/commit/a42215a))
* **播放器:** 优化剧集网格动态宽度计算和片头片尾设置 ([](https://github.com/fangcongyang/vop/commit/8bacc7a))


### 🐛 Bug Fixes | Bug 修复

* **播放历史:** 修复在线播放状态判断并同步历史记录到store ([](https://github.com/fangcongyang/vop/commit/0c696e0))
* 在关闭播放器时调用updateSelectAllHistory ([](https://github.com/fangcongyang/vop/commit/ee6b755))



## [0.1.3](https://github.com/fangcongyang/vop/compare/0.1.3...v0.1.3) (2025-07-04)


### ⚡ Performance Improvements | 性能优化

* 优化应用启动性能和资源加载策略 ([](https://github.com/fangcongyang/vop/commit/c837886))


### ✨ Features | 新功能

* 添加右键菜单组件及历史记录导入导出功能 ([](https://github.com/fangcongyang/vop/commit/d7a9ea0))



## [0.1.2](https://github.com/fangcongyang/vop/compare/0.1.2...v0.1.2) (2025-07-03)


### ✨ Features | 新功能

* 解决多窗口数据不一致问题，引入Diesel ([](https://github.com/fangcongyang/vop/commit/eb45cb3))
* 下载管理接口 ([](https://github.com/fangcongyang/vop/commit/20c1e7f))
* 新增后端接口请求公共处理和历史接口api ([](https://github.com/fangcongyang/vop/commit/da96752))
* 新增历史记录相关功能 ([](https://github.com/fangcongyang/vop/commit/5846589))
* 增加代码格式化配置 ([](https://github.com/fangcongyang/vop/commit/c800c68))
* **star:** 实现影片收藏功能的后端与前端集成 ([](https://github.com/fangcongyang/vop/commit/98ea182))


### 🐛 Bug Fixes | Bug 修复

* 修复websocket关闭报错处理 ([](https://github.com/fangcongyang/vop/commit/35c98bc))



## [0.1.1](https://github.com/fangcongyang/vop/compare/0.1.1...v0.1.1) (2025-06-29)


### ✨ Features | 新功能

* **播放器:** 添加短剧模式和小窗口播放功能 ([](https://github.com/fangcongyang/vop/commit/0321a8c))
* **play:** 新增小窗口播放功能并优化播放器体验 ([](https://github.com/fangcongyang/vop/commit/bf470ae))



# [0.1.0](https://github.com/fangcongyang/vop/compare/0.1.0...v0.1.0) (2025-06-27)


### ✨ Features | 新功能

* **播放页:** 重构播放逻辑并新增二维码组件 ([](https://github.com/fangcongyang/vop/commit/61fc8df))



## [0.0.9](https://github.com/fangcongyang/vop/compare/0.0.9...v0.0.9) (2025-06-24)


### 🐛 Bug Fixes | Bug 修复

* 将osType比较改为函数调用形式 ([](https://github.com/fangcongyang/vop/commit/24adb73))
* 将osType比较改为函数调用形式 ([](https://github.com/fangcongyang/vop/commit/4273e02))



## [0.0.8](https://github.com/fangcongyang/vop/compare/0.0.8...v0.0.8) (2025-06-22)


### ✨ Features | 新功能

* **下载:** 实现FFmpeg自动下载功能 ([](https://github.com/fangcongyang/vop/commit/de0b216))



## [0.0.7](https://github.com/fangcongyang/vop/compare/0.0.7...v0.0.7) (2025-06-21)


### ✨ Features | 新功能

* **播放页:** 添加片头片尾跳过功能并优化其他站点资源展示 ([](https://github.com/fangcongyang/vop/commit/e397544))


### 🐛 Bug Fixes | Bug 修复

* 修复更新模态框的Markdown解析和版本比较问题 ([](https://github.com/fangcongyang/vop/commit/f236fd5))



## [0.0.6](https://github.com/fangcongyang/vop/compare/0.0.6...v0.0.6) (2025-06-20)


### ✨ Features | 新功能

* 完善项目说明 ([](https://github.com/fangcongyang/vop/commit/6c7388b))


### 🐛 Bug Fixes | Bug 修复

* 修复质检问题 ([](https://github.com/fangcongyang/vop/commit/8be6737))



## [0.0.5](https://github.com/fangcongyang/vop/compare/0.0.5...v0.0.5) (2025-05-05)



## [0.0.4](https://github.com/fangcongyang/vop/compare/0.0.4...v0.0.4) (2025-05-04)


### 🐛 Bug Fixes | Bug 修复

* 更新Tauri配置文件中的公钥 ([](https://github.com/fangcongyang/vop/commit/650a477))
* bug修复 ([](https://github.com/fangcongyang/vop/commit/c373179))
* **utils:** 修复ping命令在不同操作系统下的参数问题 ([](https://github.com/fangcongyang/vop/commit/c00d332))



## [0.0.1](https://github.com/fangcongyang/vop/compare/0.0.1...v0.0.1) (2025-05-03)


### ✨ Features | 新功能

* 添加主题管理和二维码分享功能 ([](https://github.com/fangcongyang/vop/commit/3b41bc1))
* 新增可取消请求工具类 ([](https://github.com/fangcongyang/vop/commit/f1a3709))
* **updater:** 添加应用更新功能 ([](https://github.com/fangcongyang/vop/commit/d5e5e0e))


### 🐛 Bug Fixes | Bug 修复

* 搜索bug修复、明细页面 播放页面 剧集显示优化 ([](https://github.com/fangcongyang/vop/commit/c42f3d9))
* 修复搜索记录未写入数据库问题 ([](https://github.com/fangcongyang/vop/commit/d4c77ac))



