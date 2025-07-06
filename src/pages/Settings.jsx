import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { ask } from '@tauri-apps/plugin-dialog';
import { message } from "antd";
import { useGlobalStore } from "@/store/useGlobalStore";
import { getSystemConfByKey, initDB, uploadData } from "@/db";
import logo from "@/assets/logo.png";
import SettingsSwitch from "@/components/SettingsSwitch";
import SettingsInputArray from "@/components/SettingsInputArray";
import SettingButton from "@/components/SettingButton";
import SettingsSelect from "@/components/SettingsSelect";
import SettingsColorPicker from "@/components/SettingsColorPicker";
import UpdateModal from "@/components/UpdateModal";
import AppLockSettings from "@/components/AppLockSettings";
import QRCodeModal from "@/components/QRCodeModal";
import { closeAppOptionSelectData } from "@/static/settingsData";
import { clearDB } from "@/db";
import { useConfig } from "@/hooks";
import { applyTheme } from "@/theme";
import { DownloadFileTask } from "@/business/DownloadFileTask";
import { DownloadMiniserveTask } from "@/business/DownloadMiniserveTask";
import _ from "lodash";
import "./Settings.scss";

const Settings = (props) => {
    const [messageApi, contextHolder] = message.useMessage();
    const osType = useGlobalStore((state) => state.osType);
    const appVersion = useGlobalStore((state) => state.appVersion);
    const togglePageActive = useGlobalStore((state) => state.togglePageActive);
    const toggleSiteList = useGlobalStore((state) => state.toggleSiteList);
    const [excludeR18Site, setExcludeR18Site] = useConfig(
        "excludeR18Site",
        true
    );
    const [excludeRootClasses, setExcludeRootClasses] = useConfig(
        "excludeRootClasses",
        false
    );
    const [rootClassFilter, setRootClassFilter] = useConfig(
        "rootClassFilter",
        ["电影", "电影片", "电视剧", "连续剧", "综艺", "动漫"]
    );
    const [excludeR18Classes, setExcludeR18Classes] = useConfig(
        "excludeR18Classes",
        false
    );
    const [r18ClassFilter, setR18ClassFilter] = useConfig(
        "r18ClassFilter",
        [
            "伦理",
            "论理",
            "倫理",
            "福利",
            "激情",
            "理论",
            "写真",
            "情色",
            "美女",
            "街拍",
            "赤足",
            "性感",
            "里番",
            "VIP",
        ]
    );
    const [downloadSavePath, setDownloadSavePath] = useConfig(
        "downloadSavePath",
        ""
    );
    const [proxyProtocol, setProxyProtocol] = useConfig("proxyProtocol", "");
    const [proxyServer, setProxyServer] = useConfig("proxyServer", "");
    const [proxyPort, setProxyPort] = useConfig("proxyPort", "");
    const [darkMode, setDarkMode] = useConfig("darkMode", false);
    const [themeColor, setThemeColor] = useConfig("themeColor", "#335eea");
    const [clientUniqueId, setClientUniqueId] = useState("");
    const [dataUpload, setDataUpload] = useState(false);
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false); // 添加状态
    const [closeAppOption, setCloseAppOption] = useConfig("closeAppOption", "ask"); // 添加状态
    const [appLockEnabled, setAppLockEnabled] = useConfig("appLockEnabled", false);
    const [passwordHash] = useConfig("appLockPasswordHash", "");
    const [appLockSettingsVisible, setAppLockSettingsVisible] = useState(false);

    // FFmpeg 下载相关状态
    const [ffmpegDownloadStatus, setFfmpegDownloadStatus] = useState("idle"); // idle, begin, progress, end, error
    const [ffmpegDownloadProgress, setFfmpegDownloadProgress] = useState(0);
    const [ffmpegDownloadSpeed, setFfmpegDownloadSpeed] = useState(0);
    const [ffmpegVersion, setFfmpegVersion] = useConfig("ffmpegVersion", "");

    // Miniserve 下载相关状态
    const [miniserveDownloadStatus, setMiniserveDownloadStatus] = useState("idle"); // idle, begin, progress, end, error
    const [miniserveDownloadProgress, setMiniserveDownloadProgress] = useState(0);
    const [miniserveDownloadSpeed, setMiniserveDownloadSpeed] = useState(0);
    const [miniserveVersion, setMiniserveVersion] = useConfig("miniserveVersion", "");

    // Miniserve 服务相关状态
    const [miniservePort, setMiniservePort] = useConfig("miniservePort", "8080");
    const [miniserveServiceStatus, setMiniserveServiceStatus] = useState("stopped"); // stopped, starting, running, error
    const [miniserveCommandId, setMiniserveCommandId] = useState(null);
    const [qrCodeVisible, setQrCodeVisible] = useState(false);
    const [localIp, setLocalIp] = useState("localhost");

    // 获取本机IP地址
    const getLocalIpAddress = async () => {
        try {
            const ip = await invoke('get_local_ip');
            setLocalIp(ip);
        } catch (error) {
            console.error("获取本机IP失败:", error);
            setLocalIp("localhost"); // fallback to localhost
        }
    };

    // 检查是否有残留的 miniserve 进程
    const checkExistingMiniserveProcess = async () => {
        try {
            const portNum = parseInt(miniservePort || "8080");
            const result = await invoke('check_miniserve_service_status', {
                port: portNum
            });

            if (result.success) {
                const shouldKill = await ask("检测到端口 8080 被占用，可能有残留的 miniserve 进程。\n是否要清理这些进程？");

                if (shouldKill) {
                    const killResult = await invoke('stop_miniserve_service', {
                        port: portNum
                    });
                    if (killResult.success) {
                        messageApi.success("已清理残留的 miniserve 进程");
                    } else {
                        messageApi.error("清理进程失败: " + killResult.message);
                    }
                }
            }
        } catch (error) {
            console.error("检查残留进程失败:", error);
        }
    };

    useEffect(() => {
        const fetchConfig = async (key, setter) => {
            const res = await getSystemConfByKey(key);
            setter(res.conf_value);
        };
        fetchConfig("clientUniqueId", setClientUniqueId);
        fetchConfig("dataUpload", setDataUpload);

        // 获取本机IP地址
        getLocalIpAddress();

        // 组件卸载时清理miniserve服务
        return () => {
            if (miniserveCommandId && miniserveServiceStatus === "running") {
                stopMiniserveService();
            }
        };
    }, []);

    const linkOpen = (url) => {
        open(url);
    };

    const openSite = () => {
        togglePageActive("site");
    };

    const resetApp = () => {
        clearDB().then(() => {
            if (osType.startsWith("web")) return;
            relaunch();
        })
    };

    const syncSite = () => {
        initDB(true).then((res) => {
            toggleSiteList({ siteList: res, forceRefresh: true });
        });
    };

    const excludeR18SiteCallback = (excludeR18Site) => {
        setExcludeR18Site(excludeR18Site);
    };

    const excludeRootClassesCallback = (excludeRootClasses) => {
        setExcludeRootClasses(excludeRootClasses);
    };

    const rootClassFilterCallback = (rootClassFilter) => {
        setRootClassFilter(rootClassFilter);
    };

    const excludeR18ClassesCallback = (excludeR18Classes) => {
        setExcludeR18Classes(excludeR18Classes);
    };

    const r18ClassFilterCallback = (r18ClassFilter) => {
        setR18ClassFilter(r18ClassFilter);
    };

    const downloadSavePathCallback = (downloadSavePath) => {
        setDownloadSavePath(downloadSavePath);
    };

    const proxyProtocolSelectData = () => {
        return [
            {
                name: "无代理",
                value: "noProxy",
            },
            {
                name: "HTTP",
                value: "HTTP",
            },
            {
                name: "SOCKS",
                value: "SOCKS",
            },
        ];
    };

    const sendProxyConfig = () => {
        relaunch();
    };

    const dataUploadCallback = (dataUpload) => {
        setDataUpload(dataUpload);
        uploadData(dataUpload)
    };

    const darkModeCallback = (darkMode) => {
        setDarkMode(darkMode);
        // 应用主题设置
        applyTheme(darkMode, themeColor);
    };

    const themeColorCallback = (color) => {
        setThemeColor(color);
        // 应用主题设置
        applyTheme(darkMode, color);
    };
    const openDevTools = () => {
      invoke("open_devtools");
    };

    // FFmpeg 下载配置
    const FFMPEG = {
        downloadInfo: {
            "windows": {
                url: "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip",
                path: "ffmpeg.exe"
            },
            "linux": {
                url: "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz",
                path: "ffmpeg"
            },
            "macos": {
                url: "https://evermeet.cx/ffmpeg/getrelease/zip",
                path: "ffmpeg"
            }
        }
    };

    // 动态获取 Miniserve 最新版本下载URL
    const getMiniserveDownloadUrl = async (osDetailType) => {
        try {
            // 获取最新版本信息
            const response = await fetch('https://api.github.com/repos/svenstaro/miniserve/releases/latest');
            const releaseData = await response.json();

            // 根据操作系统匹配文件名模式
            const filePatterns = {
                "windows": /miniserve.*x86_64.*pc-windows-msvc\.exe$/,
                "linux": /miniserve.*x86_64.*unknown-linux-gnu$/,
                "macos": /miniserve.*x86_64.*apple-darwin$/
            };

            const pattern = filePatterns[osDetailType];
            if (!pattern) {
                throw new Error(`不支持的操作系统类型: ${osDetailType}`);
            }

            // 在assets中查找匹配的文件
            const asset = releaseData.assets.find(asset => pattern.test(asset.name));
            if (!asset) {
                throw new Error(`未找到适合 ${osDetailType} 的下载文件`);
            }

            console.log(`找到匹配文件: ${asset.name}, 下载URL: ${asset.browser_download_url}`);
            return asset.browser_download_url;
        } catch (error) {
            console.error('获取miniserve最新版本失败:', error);
            // 降级到固定版本
            const fallbackUrls = {
                "windows": "https://github.com/svenstaro/miniserve/releases/download/v0.31.0/miniserve-0.31.0-x86_64-pc-windows-msvc.exe",
                "linux": "https://github.com/svenstaro/miniserve/releases/download/v0.31.0/miniserve-0.31.0-x86_64-unknown-linux-gnu",
                "macos": "https://github.com/svenstaro/miniserve/releases/download/v0.31.0/miniserve-0.31.0-x86_64-apple-darwin"
            };
            return fallbackUrls[osDetailType];
        }
    };

    // Miniserve 下载配置
    const MINISERVE = {
        downloadInfo: {
            "windows": {
                path: "miniserve.exe"
            },
            "linux": {
                path: "miniserve"
            },
            "macos": {
                path: "miniserve"
            }
        }
    };

    // FFmpeg 下载功能
    const downloadFfmpeg = async () => {
        const osDetailType = useGlobalStore.getState().osDetailType;
        if (osDetailType in FFMPEG.downloadInfo) {
            const ffmpegInfo = FFMPEG.downloadInfo[osDetailType];
            const ffmpegDownloadTask = new DownloadFileTask({
                event_id: "ffmpeg",
                download_url: ffmpegInfo.url,
                file_path: osDetailType + "/" + ffmpegInfo.path,
            });

            ffmpegDownloadTask.on("begin", async (_data) => {
                setFfmpegDownloadStatus("begin");
            });

            ffmpegDownloadTask.on("progress", async (data) => {
                setFfmpegDownloadStatus("progress");
                setFfmpegDownloadProgress(data.progress || 0);
                setFfmpegDownloadSpeed(data.speed || 0);
            });

            ffmpegDownloadTask.on("end", async (_data) => {
                setFfmpegDownloadStatus("end");
                setFfmpegVersion("latest");
            });

            ffmpegDownloadTask.on("error", async (_data) => {
                setFfmpegDownloadStatus("error");
            });

            ffmpegDownloadTask.startDownload();
        } else {
            console.error("不支持的操作系统类型:", osDetailType);
            setFfmpegDownloadStatus("error");
            // 可以考虑显示更详细的错误信息给用户
            messageApi.warning(`当前系统类型 "${osDetailType}" 暂不支持自动下载 FFmpeg，请手动下载安装。`);
        }
    };

    // 获取 FFmpeg 下载按钮文本
    const getFfmpegButtonText = () => {
        switch (ffmpegDownloadStatus) {
            case "begin":
                return "准备下载...";
            case "progress":
                return `下载中 ${ffmpegDownloadProgress.toFixed(1)}% (${ffmpegDownloadSpeed.toFixed(1)} MB/s)`;
            case "end":
                return "下载完成";
            case "error":
                return "下载失败，点击重试";
            default:
                return ffmpegVersion ? "重新下载 FFmpeg" : "下载 FFmpeg";
        }
    };

    // Miniserve 下载功能
    const downloadMiniserve = async () => {
        const osDetailType = useGlobalStore.getState().osDetailType;
        if (osDetailType in MINISERVE.downloadInfo) {
            try {
                // 动态获取最新版本的下载URL
                const downloadUrl = await getMiniserveDownloadUrl(osDetailType);
                const miniserveInfo = MINISERVE.downloadInfo[osDetailType];

                const miniserveDownloadTask = new DownloadMiniserveTask({
                    event_id: "miniserve",
                    download_url: downloadUrl,
                    file_path: osDetailType + "/" + miniserveInfo.path,
                });

                miniserveDownloadTask.on("begin", async (_data) => {
                    setMiniserveDownloadStatus("begin");
                });

                miniserveDownloadTask.on("progress", async (data) => {
                    setMiniserveDownloadStatus("progress");
                    setMiniserveDownloadProgress(data.progress || 0);
                    setMiniserveDownloadSpeed(data.speed || 0);
                });

                miniserveDownloadTask.on("end", async (_data) => {
                    setMiniserveDownloadStatus("end");
                    setMiniserveVersion("latest");
                    // 下载完成后提示用户可以启动服务
                    setTimeout(async () => {
                        const shouldStart = await ask("Miniserve 下载完成！是否立即启动文件服务？");
                        if (shouldStart) {
                            startMiniserveService();
                        }
                    }, 1000);
                });

                miniserveDownloadTask.on("error", async (_data) => {
                    setMiniserveDownloadStatus("error");
                });

                miniserveDownloadTask.startDownload();
            } catch (error) {
                console.error("获取Miniserve下载URL失败:", error);
                setMiniserveDownloadStatus("error");
                messageApi.error("获取最新版本信息失败，请检查网络连接后重试。");
            }
        } else {
            console.error("不支持的操作系统类型:", osDetailType);
            setMiniserveDownloadStatus("error");
            messageApi.warning(`当前系统类型 "${osDetailType}" 暂不支持自动下载 Miniserve，请手动下载安装。`);
        }
    };

    // 获取 Miniserve 下载按钮文本
    const getMiniserveButtonText = () => {
        switch (miniserveDownloadStatus) {
            case "begin":
                return "准备下载...";
            case "progress":
                return `下载中 ${miniserveDownloadProgress.toFixed(1)}% (${miniserveDownloadSpeed.toFixed(1)} MB/s)`;
            case "end":
                return "下载完成";
            case "error":
                return "下载失败，点击重试";
            default:
                return miniserveVersion ? "重新下载 Miniserve" : "下载 Miniserve";
        }
    };

    // 启动 Miniserve 服务
    const startMiniserveService = async () => {
        if (!miniserveVersion) {
            messageApi.warning("请先下载 Miniserve 工具");
            return;
        }

        if (!downloadSavePath) {
            messageApi.warning("请先设置视频下载路径");
            return;
        }

        // 验证端口号
        const portValue = miniservePort || "8080";
        const portNum = parseInt(portValue);
        if (isNaN(portNum) || portNum < 1024 || portNum > 65535) {
            messageApi.error("请输入有效的端口号 (1024-65535)");
            return;
        }

        // 如果端口为空，设置为默认值
        if (!miniservePort) {
            setMiniservePort("8080");
        }

        try {
            await checkExistingMiniserveProcess();
            setMiniserveServiceStatus("starting");

            const result = await invoke('start_miniserve_service', {
                port: portNum,
                directory: downloadSavePath
            });

            if (result.success) {
                setMiniserveServiceStatus("running");
                setMiniserveCommandId(portNum); // 使用端口号作为标识
                messageApi.success(`Miniserve 服务已启动！访问地址: http://localhost:${portValue}`);
            } else {
                setMiniserveServiceStatus("error");
                messageApi.error("启动 Miniserve 服务失败: " + result.message);
            }

        } catch (error) {
            console.error("启动 Miniserve 服务失败:", error);
            setMiniserveServiceStatus("error");
            messageApi.error("启动 Miniserve 服务失败: " + error.message);
        }
    };

    // 停止 Miniserve 服务
    const stopMiniserveService = async () => {
        try {
            setMiniserveServiceStatus("stopping");

            const portValue = miniservePort || "8080";
            const port = parseInt(portValue, 10);

            const result = await invoke('stop_miniserve_service', {
                port: port
            });

            if (result.success) {
                setMiniserveServiceStatus("stopped");
                setMiniserveCommandId(null);
                messageApi.success("Miniserve 服务已停止");
            } else {
                setMiniserveServiceStatus("error");
                messageApi.error("停止 Miniserve 服务失败: " + result.message);
            }

        } catch (error) {
            console.error("停止 Miniserve 服务失败:", error);
            // 即使停止失败，也重置状态
            setMiniserveServiceStatus("stopped");
            setMiniserveCommandId(null);
            messageApi.warning("停止 Miniserve 服务失败，但已重置状态: " + error.message);
        }
    };

    // 获取 Miniserve 服务按钮文本
    const getMiniserveServiceButtonText = () => {
        switch (miniserveServiceStatus) {
            case "starting":
                return "启动中...";
            case "running":
                return "停止服务";
            case "stopping":
                return "停止中...";
            case "error":
                return "重新启动";
            default:
                return "启动服务";
        }
    };


    return (
        <div
            className={
                props.className
                    ? "settingsPage " + props.className
                    : "settingsPage"
            }
        >
            {contextHolder}
            <div className="container">
                <div className="logo">
                    <div className="left">
                        <img className="avatar" src={logo} loading="lazy" />
                        <div className="info">
                            <div className="nickname">检查更新</div>
                            <div className="extra-info">
                                软件完全免费，如遇收费，请立即给差评并退费！
                            </div>
                        </div>
                    </div>
                    <div className="right">
                        <a
                            onClick={() =>
                                linkOpen(
                                    "https://github.com/fangcongyang/video"
                                )
                            }
                        >
                            Github
                        </a>
                    </div>
                </div>
                <h3>站点</h3>
                <SettingsSwitch
                    title="排除18禁站点"
                    initValue={excludeR18Site}
                    fieldKey="excludeR18Site"
                    callback={(switchValue) =>
                        excludeR18SiteCallback(switchValue)
                    }
                />
                <SettingsSwitch
                    title="排除主分类"
                    initValue={excludeRootClasses}
                    fieldKey="excludeRootClasses"
                    callback={(switchValue) =>
                        excludeRootClassesCallback(switchValue)
                    }
                />
                {excludeRootClasses ? (
                    <SettingsInputArray
                        title="主分类"
                        initValue={rootClassFilter}
                        fieldKey="rootClassFilter"
                        inputPlaceholder="请输入排除的主分类"
                        callback={(rootClassFilter) =>
                            rootClassFilterCallback(rootClassFilter)
                        }
                    />
                ) : (
                    ""
                )}
                <SettingsSwitch
                    title="排除18禁分类"
                    initValue={excludeR18Classes}
                    fieldKey="excludeR18Classes"
                    callback={(switchValue) =>
                        excludeR18ClassesCallback(switchValue)
                    }
                />
                {excludeR18Classes ? (
                    <SettingsInputArray
                        title="18禁分类"
                        initValue={r18ClassFilter}
                        fieldKey="r18ClassFilter"
                        inputPlaceholder="请输入排除的18禁分类"
                        callback={(r18ClassFilter) =>
                            r18ClassFilterCallback(r18ClassFilter)
                        }
                    />
                ) : (
                    ""
                )}

                {osType == "desktop" && (
                    <>
                        <h3>下载</h3>
                        <SettingButton
                            title="视频下载路径"
                            type="selectDir"
                            description={downloadSavePath}
                            fieldKey="downloadSavePath"
                            placeholder="选择文件夹"
                            callback={(downloadSavePath) =>
                                downloadSavePathCallback(downloadSavePath)
                            }
                        />
                        <div className="item">
                            <div className="left">
                                <div className="title">FFmpeg 工具</div>
                                <div className="description">
                                    {ffmpegVersion ? `已安装版本: ${ffmpegVersion}` : "用于视频处理的必要工具"}
                                </div>
                            </div>
                            <div className="right">
                                <button
                                    className="button"
                                    onClick={downloadFfmpeg}
                                    disabled={ffmpegDownloadStatus === "begin" || ffmpegDownloadStatus === "progress"}
                                >
                                    {getFfmpegButtonText()}
                                </button>
                            </div>
                        </div>
                        <div className="item">
                            <div className="left">
                                <div className="title">Miniserve 工具</div>
                                <div className="description">
                                    {miniserveVersion ? `已安装版本: ${miniserveVersion}` : "用于本地文件服务的轻量级工具"}
                                </div>
                            </div>
                            <div className="right">
                                <button
                                    className="button"
                                    onClick={downloadMiniserve}
                                    disabled={miniserveDownloadStatus === "begin" || miniserveDownloadStatus === "progress"}
                                >
                                    {getMiniserveButtonText()}
                                </button>
                            </div>
                        </div>
                        {miniserveVersion && (
                            <>
                                <div className="item">
                                    <div className="left">
                                        <div className="title">服务端口</div>
                                        <div className="description">
                                            设置 Miniserve 服务的监听端口
                                        </div>
                                    </div>
                                    <div className="right">
                                        <input
                                            value={miniservePort || "8080"}
                                            className="text-input"
                                            placeholder="8080"
                                            type="number"
                                            min={1024}
                                            max={65535}
                                            onChange={(e) => setMiniservePort(e.target.value)}
                                            disabled={miniserveServiceStatus === "running"}
                                        />
                                    </div>
                                </div>
                                <div className="item">
                                    <div className="left">
                                        <div className="title">文件服务</div>
                                        <div className="description">
                                            {miniserveServiceStatus === "running"
                                                ? `服务运行中 - http://${localIp}:${miniservePort}`
                                                : "启动本地文件服务器"}
                                        </div>
                                    </div>
                                    <div className="right">
                                        {miniserveServiceStatus === "running" && (
                                            <>
                                                <button
                                                    className="button"
                                                    onClick={() => window.open(`http://${localIp}:${miniservePort}`, '_blank')}
                                                    style={{ marginRight: '8px' }}
                                                >
                                                    打开浏览器
                                                </button>
                                                <button
                                                    className="button"
                                                    onClick={() => setQrCodeVisible(true)}
                                                    style={{ marginRight: '8px' }}
                                                >
                                                    生成二维码
                                                </button>
                                            </>
                                        )}
                                        <button
                                            className="button"
                                            onClick={miniserveServiceStatus === "running" ? stopMiniserveService : startMiniserveService}
                                            disabled={miniserveServiceStatus === "starting" || miniserveServiceStatus === "stopping"}
                                        >
                                            {getMiniserveServiceButtonText()}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
                {!osType.startsWith("web") && (
                    <>
                        <h3>代理配置</h3>
                        <SettingsSelect
                            title="代理协议"
                            initValue={proxyProtocol}
                            selectData={proxyProtocolSelectData()}
                            callback={(proxyProtocol) =>
                                setProxyProtocol(proxyProtocol)
                            }
                        />
                    </>
                )}
                <div
                    id="proxy-form"
                    className={proxyProtocol === "noProxy" ? "disabled" : ""}
                >
                    <input
                        value={proxyServer}
                        className="text-input"
                        placeholder="代理服务器"
                        disabled={proxyProtocol === "noProxy"}
                        onChange={(e) => setProxyServer(e.target.value)}
                        // onBlur={proxyServerBlur}
                    />
                    <input
                        value={proxyPort}
                        className="text-input"
                        placeholder="代理端口"
                        type="number"
                        min={0}
                        max={65535}
                        disabled={proxyProtocol === "noProxy"}
                        onChange={(e) =>
                            setProxyPort(
                                e.target.valueAsNumber
                            )
                        }
                    />
                    <button className="button" onClick={sendProxyConfig}>
                        更新代理
                    </button>
                </div>
                {/* 主题设置 */}
                <h3>主题设置</h3>
                <SettingsSwitch
                    title="暗色模式"
                    initValue={darkMode}
                    fieldKey="darkMode"
                    callback={(switchValue) =>
                        darkModeCallback(switchValue)
                    }
                />
                <SettingsColorPicker
                    title="主题色"
                    initValue={themeColor}
                    fieldKey="themeColor"
                    description="自定义应用的主题颜色"
                    callback={(color) => themeColorCallback(color)}
                />

                {/* 安全设置 */}
                <h3>安全设置</h3>
                <SettingsSwitch
                    title="应用锁"
                    initValue={appLockEnabled}
                    fieldKey="appLockEnabled"
                    description="启用后需要输入密码才能使用应用"
                    callback={(switchValue) => {
                        if (switchValue && !passwordHash) {
                            setAppLockSettingsVisible(true);
                        } else {
                            setAppLockEnabled(switchValue);
                        }
                    }}
                />
                {appLockEnabled && (
                    <SettingButton
                        title="修改密码"
                        description="修改应用锁密码和安全问题"
                        placeholder="修改密码"
                        callback={() => setAppLockSettingsVisible(true)}
                    />
                )}

                {/* 其他 */}
                <h3>其他</h3>
                <SettingsSwitch
                    title="数据上传"
                    initValue={dataUpload}
                    fieldKey="dataUpload"
                    callback={(switchValue) =>
                        dataUploadCallback(switchValue)
                    }
                />
                <SettingButton
                    title="唯一标识符"
                    description={clientUniqueId}
                    placeholder="复制"
                    callback={() => syncSite()}
                />
                <SettingButton
                    title="站点管理"
                    description="站点管理，进行增删改查操作"
                    placeholder="站点管理"
                    callback={() => openSite()}
                />
                <SettingButton
                    title="同步站点"
                    description="同步最新站点信息. "
                    placeholder="同步站点"
                    callback={() => syncSite()}
                />
                <div className="item">
                  <div className="left">
                    <div className="title">打开开发者工具</div>
                  </div>
                  <div className="right">
                    <button className="button" onClick={openDevTools}>开发者工具</button>
                  </div>
                </div>
                {osType == "desktop" && (
                    <>
                        <SettingsSelect
                            title="关闭主面板时..."
                            initValue={closeAppOption}
                            selectData={closeAppOptionSelectData()}
                            callback={(value) => setCloseAppOption(value)}
                        />
                        <div className="item">
                          <div className="left">
                            <div className="title">检测更新</div>
                          </div>
                          <div className="right">
                            <button className="button" onClick={() => setIsCheckingUpdate(true)}>
                              更新
                            </button>
                          </div>
                        </div>
                    </>
                )}
                <SettingButton
                    title="软件重置"
                    description="如果新安装用户, 无法显示资源, 请点击软件重置. 如非必要, 切勿点击. 会清空用户数据, 恢复默认设置. "
                    placeholder="软件重置"
                    callback={() => resetApp()}
                />

                <div className="footer">
                    <p className="author">
                        MADE BY{" "}
                        <a
                            href="http://github.com/fangcongyang"
                            target="_blank"
                        >
                            fangcongyang
                        </a>
                    </p>
                    <p className="version">v {appVersion}</p>
                </div>
            </div>
            {isCheckingUpdate ? (
                <UpdateModal
                    show={isCheckingUpdate}
                    currentVersion={appVersion}
                    onClose={() => setIsCheckingUpdate(false)}
                />
            ) : null}
            <AppLockSettings
                visible={appLockSettingsVisible}
                onClose={() => setAppLockSettingsVisible(false)}
                onSuccess={() => {
                    setAppLockSettingsVisible(false);
                    setAppLockEnabled(true);
                }}
            />
            <QRCodeModal
                visible={qrCodeVisible}
                url={`http://${localIp}:${miniservePort}`}
                onClose={() => setQrCodeVisible(false)}
                title="本地文件服务器二维码"
                description="扫描二维码在移动设备上访问本地文件服务器"
                tip={`服务器地址: ${localIp}:${miniservePort} - 请确保移动设备与电脑在同一网络环境下`}
            />
        </div>
    );
};

export default Settings;
