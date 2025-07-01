import { useEffect, useState } from "react";
import { selectAllHistory, deleteHistory } from "@/api/history";
import MovieCard from "@/components/MovieCard";
import Waterfall from "@/components/Waterfall";
import "./Movie.scss";

const History = (props) => {
    const [historyList, setHistoryList] = useState([]);

    useEffect(() => {
        initHistoryList();
    }, []);

    const initHistoryList = async () => {
        const res = await selectAllHistory();
        setHistoryList(res);
    }

    const onDelete = async (item) => {
        await deleteHistory({id: item.id});
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
                    <Waterfall list={historyList} gutter={10} 
                        initYzb={10}>
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
        </div>
    );
};

export default History;
