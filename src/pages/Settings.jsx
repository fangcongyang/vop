import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
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
import { closeAppOptionSelectData } from "@/static/settingsData";
import { clearDB } from "@/db";
import { useConfig } from "@/hooks";
import { applyTheme } from "@/theme";
import { DownloadFileTask } from "@/business/DownloadFileTask";
import _ from "lodash";
import "./Settings.scss";

const Settings = (props) => {
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

    useEffect(() => {
        const fetchConfig = async (key, setter) => {
            const res = await getSystemConfByKey(key);
            setter(res.conf_value);
        };
        fetchConfig("clientUniqueId", setClientUniqueId);
        fetchConfig("dataUpload", setDataUpload);
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

    // FFmpeg 下载功能
    const downloadFfmpeg = async () => {
        let osDetailType = osDetailType();
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
            alert(`当前系统类型 "${osDetailType}" 暂不支持自动下载 FFmpeg，请手动下载安装。`);
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


    return (
        <div
            className={
                props.className
                    ? "settingsPage " + props.className
                    : "settingsPage"
            }
        >
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
        </div>
    );
};

export default Settings;
