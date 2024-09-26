import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { settingsStore, togglePageActive } from "@/store/coreSlice";
import { storeSiteList } from "@/store/movieSlice";
import { relaunch } from "@tauri-apps/plugin-process";
import { osType, appVersion } from "@/utils/env";
import { getSiteList, getSystemConfByKey, initDB, uploadData } from "@/db";
import logo from "@/assets/logo.png";
import SettingsSwitch from "@/components/SettingsSwitch";
import SettingsInputArray from "@/components/SettingsInputArray";
import SettingButton from "@/components/SettingButton";
import SettingsSelect from "@/components/SettingsSelect";
import { closeAppOptionSelectData } from "@/static/settingsData";
import { clearDB } from "@/db";
import { useConfig } from "@/hooks";
import { store } from "@/utils/store";
import _ from "lodash";
import "./Settings.scss";

const Settings = (props) => {
    const dispatch = useAppDispatch();
    const settings = useAppSelector(settingsStore);
    const [excludeR18Site, setExcludeR18Site] = useConfig(
        "excludeR18Site",
        true,
        { page: "settings" }
    );
    const [excludeRootClasses, setExcludeRootClasses] = useConfig(
        "excludeRootClasses",
        false,
        { page: "settings" }
    );
    const [rootClassFilter, setRootClassFilter] = useConfig(
        "rootClassFilter",
        ["电影", "电影片", "电视剧", "连续剧", "综艺", "动漫"],
        { page: "settings" }
    );
    const [excludeR18Classes, setExcludeR18Classes] = useConfig(
        "excludeR18Classes",
        false,
        { page: "settings" }
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
        ],
        { page: "settings" }
    );
    const [downloadSavePath, setDownloadSavePath] = useConfig(
        "downloadSavePath",
        "",
        { page: "settings" }
    );
    const [proxyProtocol, setProxyProtocol] = useConfig("proxyProtocol", "", {
        page: "settings",
    });
    const [proxyServer, setProxyServer] = useConfig("proxyServer", "", {
        page: "settings",
    });
    const [proxyPort, setProxyPort] = useConfig("proxyPort", "", {
        page: "settings",
    });

    const [clientUniqueId, setClientUniqueId] = useState("");
    const [dataUpload, setDataUpload] = useState(false);

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
        dispatch(togglePageActive("site"));
    };

    const resetApp = () => {
        clearDB().then(() => {
            if (osType.startsWith("web")) return;
            relaunch();
        });
    };

    const syncSite = () => {
        initDB(true).then((res) => {
            dispatch(storeSiteList({ siteList: res, forceRefresh: true }));
        });
    };

    const excludeR18SiteCallback = (excludeR18Site) => {
        setExcludeR18Site(excludeR18Site);
        store.notifyObservers("excludeR18Site", excludeR18Site);
    };

    const excludeRootClassesCallback = (excludeRootClasses) => {
        setExcludeRootClasses(excludeRootClasses);
        store.notifyObservers("excludeRootClasses", excludeRootClasses);
    };

    const rootClassFilterCallback = (rootClassFilter) => {
        setRootClassFilter(rootClassFilter);
        store.notifyObservers("rootClassFilter", rootClassFilter);
    };

    const excludeR18ClassesCallback = (excludeR18Classes) => {
        setExcludeR18Classes(excludeR18Classes);
        store.notifyObservers("excludeR18Classes", excludeR18Classes);
    };

    const r18ClassFilterCallback = (r18ClassFilter) => {
        setR18ClassFilter(r18ClassFilter);
        store.notifyObservers("r18ClassFilter", r18ClassFilter);
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
                    </>
                )}
                {!osType.startsWith("web") && (
                    <>
                        <h3>代理配置</h3>
                        <SettingsSelect
                            title="代理协议"
                            initValue={proxyProtocol}
                            fieldKey="proxyProtocol"
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
                        min={1}
                        max={65535}
                        disabled={proxyProtocol === "noProxy"}
                        onChange={(e) =>
                            setProxyPort(
                                e.target.valueAsNumber
                                    ? e.target.valueAsNumber
                                    : 1
                            )
                        }
                    />
                    <button className="button" onClick={sendProxyConfig}>
                        更新代理
                    </button>
                </div>
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
                {osType == "desktop" && (
                    <SettingsSelect
                        title="关闭主面板时..."
                        initValue={settings.closeAppOption}
                        fieldKey="closeAppOption"
                        selectData={closeAppOptionSelectData()}
                    />
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
        </div>
    );
};

export default Settings;
