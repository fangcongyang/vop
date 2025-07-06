import { useEffect, useState, useRef } from "react";
import { message } from "antd";
import { selectAllStar, deleteStar, importStar } from "@/api/star";
import MovieCard from "@/components/MovieCard";
import Waterfall from "@/components/Waterfall";
import ContextMenu from "@/components/ContextMenu";
import utils from "@/utils";
import "./Movie.scss";

const Star = (props) => {
    const [messageApi, contextHolder] = message.useMessage();
    const [starList,setStarList] = useState([]);
    const starRef = useRef(null);
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
        initStarList();
    }, [])

    const initStarList = async () => {
        const result = await selectAllStar();
        setStarList(result);
    }

    const onDelete = async (item) => {
        await deleteStar({id: item.id});
        initStarList();
    }

    const handleMenuToggle = (show) => {
        if (typeof show === "boolean") {
            setContextMenuVisible(show);
        } else {
            // 如果第一个参数不是布尔值，说明是关闭菜单
            setContextMenuVisible(false);
        }
    };

    const handleMenuItemClick = async (item) => {
        if (item.id === "export") {
            const { success } = await utils.exportJSON("star.json", starList);
            if (success) {
                messageApi.success("导出成功");
            }
        } else if (item.id === "import") {
            const res = await utils.importJSON();
            if (res.success) {
                try {
                    await importStar({ filePath: res.filePath });
                    initStarList();
                    messageApi.success("导入成功");
                } catch (error) {
                    messageApi.error("导入失败, " + error);
                }
            }
        }
    };

    return (
        <div
            ref={starRef}
            className={
                props.className ? "pageMain " + props.className : "pageMain"
            }
        >
            {contextHolder}
            <div className="panelBody">
                <div className="showPicture">
                    <Waterfall list={starList} gutter={20} width={200} viewMode="star" initYzb={10}>
                        <MovieCard
                            viewMode="star"
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
                containerRef={starRef}
                autoAttach={true}
            />
        </div>
    );
};

export default Star;
