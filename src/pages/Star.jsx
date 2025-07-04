import { useEffect, useState } from "react";
import { selectAllStar, deleteStar } from "@/api/star";
import MovieCard from "@/components/MovieCard";
import Waterfall from "@/components/Waterfall";
import "./Movie.scss";

const Star = (props) => {
    const [starList,setStarList] = useState([]);

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

    return (
        <div
            className={
                props.className ? "pageMain " + props.className : "pageMain"
            }
        >
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
        </div>
    );
};

export default Star;
