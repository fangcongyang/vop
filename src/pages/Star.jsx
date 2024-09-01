import { useEffect, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { pageActiveStore } from "@/store/coreSlice";
import { getAllStar, deleteStar } from "@/db";
import MovidCard from "@/components/MovidCard";
import Waterfall from "@/components/Waterfall";
import { identity } from "lodash";
import "./Movie.scss";

const Star = (props) => {
    const pageActive = useAppSelector(pageActiveStore);
    const [starList,setStarList] = useState([]);

    useEffect(() => {
        if (pageActive === "star") {
            initStarList();
        }
    }, [pageActive])

    const initStarList = async () => {
        const result = await getAllStar();
        setStarList(result);
    }

    const onDelete = async (item) => {
        await deleteStar(item.id)
        initStarList();
    }

    return (
        <div
            className={
                props.className ? "pageMain " + props.className : "pageMain"
            }
        >
            <div className="panelBody">
                <div className="showPicture">
                    <Waterfall list={starList} gutter={20} width={200} viewMode="star">
                        <MovidCard
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
        </div>
    );
};

export default Star;
