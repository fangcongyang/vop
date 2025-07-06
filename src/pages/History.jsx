import { useEffect, useState, useRef } from "react";
import { message } from "antd";
import { selectAllHistory, deleteHistory, importHistory } from "@/api/history";
import MovieCard from "@/components/MovieCard";
import Waterfall from "@/components/Waterfall";
import ContextMenu from "@/components/ContextMenu";
import { useMovieStore } from "@/store/useMovieStore";
import utils from "@/utils";

import "./Movie.scss";

const History = (props) => {
    const [messageApi, contextHolder] = message.useMessage();
    const toggleHistoryInfoList = useMovieStore(
        (state) => state.toggleHistoryInfoList
    );
    const [historyList, setHistoryList] = useState([]);
    const historyRef = useRef(null);
    const [contextMenuVisible, setContextMenuVisible] = useState(false);
    const menuItems = [
        {
            id: "import",
            label: "导入",
            icon: "⬇️",
            shortcut: "Ctrl+I",
        },
        {
            id: "export",
            label: "导出",
            icon: "⬆️",
            shortcut: "Ctrl+E",
        },
    ];
    useEffect(() => {
        initHistoryList();
    }, []);

    const initHistoryList = async () => {
        const res = await selectAllHistory();
        toggleHistoryInfoList(res);
        setHistoryList(res);
    };

    const onDelete = async (item) => {
        await deleteHistory({ id: item.id });
        initHistoryList();
    };

    const handleMenuToggle = (show) => {
        if (typeof show === "boolean") {
            setContextMenuVisible(show);
        } else {
            // 如果第一个参数不是布尔值，说明是关闭菜单
            setContextMenuVisible(false);
        }
    };

    // 处理菜单项点击
    const handleMenuItemClick = async (item) => {
        if (item.id === "export") {
            const { success } = await utils.exportJSON("history.json", historyList);
            if (success) {
                messageApi.success("导出成功");
            }
        } else if (item.id === "import") {
            const res = await utils.importJSON();
            if (res.success) {
                try {
                    await importHistory({ filePath: res.filePath });
                    initHistoryList();
                    messageApi.success("导入成功");
                } catch (error) {
                    messageApi.error("导入失败, " + error);
                }
            }
        }
    };

    return (
        <div
            ref={historyRef}
            className={
                props.className ? "pageMain " + props.className : "pageMain"
            }
        >
            {contextHolder}
            <div className="panelBody">
                <div className="showPicture">
                    <Waterfall list={historyList} gutter={10} initYzb={10}>
                        <MovieCard
                            viewMode="history"
                            onDelete={onDelete}
                            breakpoints={{
                                1400: {
                                    //当屏幕宽度小于等于1200
                                    rowPerView: 5,
                                },
                                1200: {
                                    //当屏幕宽度小于等于1200
                                    rowPerView: 4,
                                },
                                800: {
                                    //当屏幕宽度小于等于800
                                    rowPerView: 3,
                                },
                                500: {
                                    //当屏幕宽度小于等于500
                                    rowPerView: 2,
                                },
                            }}
                        />
                    </Waterfall>
                </div>
            </div>
            <ContextMenu
                visible={contextMenuVisible}
                items={menuItems}
                onClose={handleMenuToggle}
                onItemClick={handleMenuItemClick}
                minWidth={200}
                containerRef={historyRef}
                autoAttach={true}
            />
        </div>
    );
};

export default History;
