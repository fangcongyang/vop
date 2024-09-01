import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { pageActiveStore } from "@/store/coreSlice";
import {
    historyListStore,
    storeHistoryList
} from "@/store/movieSlice";
import { getAllHistory, deleteHistory } from "@/db";
import MovidCard from "@/components/MovidCard";
import Waterfall from "@/components/Waterfall";
import { identity } from "lodash";
import "./Movie.scss";

const History = (props) => {
    const dispatch = useAppDispatch();
    const pageActive = useAppSelector(pageActiveStore);
    const historyList = useAppSelector(historyListStore);

    useEffect(() => {
        if (pageActive === "history") {
            initHistoryList();
        }
    }, [pageActive])

    const initHistoryList = async () => {
        const res = await getAllHistory();
        dispatch(storeHistoryList({historyList: res, forceRefresh: true}));
    }

    const onDelete = async (item) => {
        await deleteHistory(item.id)
        initHistoryList();
    }

    return (
        <div
            className={
                props.className ? "pageMain " + props.className : "pageMain"
            }
        >
            <div className="panelBody">
                <div className="showPicture">
                    <Waterfall list={historyList} gutter={20} width={200} viewMode="history">
                        <MovidCard
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
        </div>
    );
};

export default History;
