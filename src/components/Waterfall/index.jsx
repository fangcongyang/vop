import {
    memo,
    useMemo,
    useRef,
    useState,
    useEffect,
    Children,
    isValidElement,
    cloneElement,
    useCallback
} from "react";
import { prefixStyle, addClass, hasClass } from "@/utils/dom";
import _ from "lodash";
import { useContentBodySize } from "@/hooks/useContentBodySize";
import { calculateCols } from "./useCalculareCols";
import "./index.scss";

const transform = prefixStyle("transform");
const duration = prefixStyle("animation-duration");
const cssDelay = prefixStyle("animation-delay");
const transition = prefixStyle("transition");
const fillMode = prefixStyle("animation-fill-mode");

const Waterfall = memo(({
    list= [],
    domId="contentBody",
    rowKey= "id",
    width= 200,
    breakpoints= {
        1400: { rowPerView: 6 },
        1200: { rowPerView: 5 },
        1000: { rowPerView: 4 },
        800: { rowPerView: 3 },
        500: { rowPerView: 2 },
    },
    gutter= 10,
    hasAroundGutter= false,
    posDuration= 300,
    animationPrefix= "animate__animated",
    animationEffect= "fadeIn",
    animationDuration= 1000,
    animationDelay= 300,
    delay= 300,
    align="center",
    tipMessage= "暂无数据",
    children,
    initYzb= 0,
    afterRender
}) => {
    const waterfallWrapper = useRef(null);
    const contentBodySize = useContentBodySize(domId);
    const wrapperWidth = useRef(0);
    const [wrapperHeight, setWrapperHeight] = useState(0);
    const colWidth = useRef(0);
    const offsetX = useRef(0);
    const cols = useRef(0);
    const posY = useRef([]);

    const onCalculateCols = useCallback(_.debounce(() => {
        const cc = calculateCols(breakpoints, gutter, hasAroundGutter, width, align, wrapperWidth);
        colWidth.current = cc.colWidth;
        cols.current = cc.cols;
        offsetX.current = cc.offsetX;
        renderer();
    }, delay), [breakpoints, gutter, hasAroundGutter, width, align, delay]);

    useEffect(() => {
        if (contentBodySize.width === wrapperWidth.current) return;
        wrapperWidth.current = contentBodySize.width;
        onCalculateCols();
    }, [contentBodySize, onCalculateCols]);

    // 获取对应y下标的x的值
    const getX = useCallback((index) => {
        const count = hasAroundGutter ? index + 1 : index;
        return (
            gutter * count + colWidth.current * index + offsetX.current
        );
    }, [gutter, hasAroundGutter]);

    // 初始y
    const initY = useCallback(() => {
        posY.current = new Array(cols.current).fill(
            hasAroundGutter ? gutter : initYzb
        );
    }, [cols, gutter, hasAroundGutter, initYzb]);

    const addAnimation = useCallback((item, callback) => {
        const content = item?.firstChild;
        if (content && !hasClass(content, animationPrefix)) {
            const durationSec = `${animationDuration / 1000}s`;
            const delaySec = `${animationDelay / 1000}s`;
            const style = content.style;
            addClass(content, animationPrefix);
            addClass(content, animationEffect);

            if (duration) style[duration] = durationSec;
            if (cssDelay) style[cssDelay] = delaySec;
            if (fillMode) style[fillMode] = "both";

            if (callback) {
                setTimeout(() => {
                    callback();
                }, animationDuration + animationDelay);
            }
        }
    }, [animationPrefix, animationEffect, animationDuration, animationDelay]);

    // 排版
    const layoutHandle = useCallback(async () => {
        if (cols.current === 0 || cols.current === -1) return;
        return new Promise((resolve) => {
            // 初始化y集合
            initY();

            // 构造列表
            const items = [];
            if (waterfallWrapper.current) {
                waterfallWrapper.current.childNodes.forEach((el) => {
                    if (el?.className === "waterfallItem") items.push(el);
                });
            }

            // 获取节点
            if (items.length === 0) { 
                setWrapperHeight(Math.max(...posY.current));
                return resolve(false);
            }

            // 遍历节点
            for (let i = 0; i < items.length; i++) {
                const curItem = items[i];
                // 最小的y值
                const minY = Math.min(...posY.current);
                // 最小y的下标
                const minYIndex = posY.current.indexOf(minY);
                // 当前下标对应的x
                const curX = getX(minYIndex);

                // 设置x,y,width
                const style = curItem.style;

                // 设置偏移
                if (transform)
                    style[transform] = `translate3d(${curX}px,${minY}px, 0)`;
                style.width = `${colWidth.current}px`;
                style.visibility = "visible";

                // 更新当前index的y值
                const { height } = curItem.getBoundingClientRect();
                posY.current[minYIndex] += height + gutter;

                // 添加入场动画
                addAnimation(curItem, () => {
                    // 添加动画时间
                    const time = posDuration / 1000;
                    if (transition) style[transition] = `transform ${time}s`;
                });
            }
            setWrapperHeight(Math.max(...posY.current));
            
            resolve(true);
        });
    }, [initY, getX, gutter, posDuration, addAnimation]);

    const renderer = useCallback(_.debounce(() => {
        layoutHandle().then(() => {
            afterRender && afterRender();
        });
    }, delay), [layoutHandle, afterRender, delay]);

    useEffect(() => {
        renderer();
    }, [list]);

    // 获取唯一值
    const getKey = useCallback((item, index) => {
        let uqKey = _.isArray(rowKey) && rowKey.every(key => item.hasOwnProperty(key)) 
            ? _.castArray(rowKey).map((key) => item[key]).join("_") 
            : item[rowKey];
        return uqKey || index;
    }, [rowKey]);

    const waterfallListStyle = useMemo(() => ({
        height: list.length === 0 ? "100vh" : `${wrapperHeight}px`
    }), [wrapperHeight, list.length]);

    return (
        <div
            ref={waterfallWrapper}
            className="waterfallList"
            style={waterfallListStyle}
        >
            {list.map((item, index) => (
                <div
                    className="waterfallItem"
                    key={getKey(item, index)}
                >
                    <div className="waterfallCard">
                        {Children.map(children, (child) => {
                            if (!isValidElement(child)) {
                                return null;
                            }
                            const childProps = {
                                key: getKey(item, index),
                                ...child.props,
                                item,
                                index,
                                layoutHandle,
                            };
                            return cloneElement(child, childProps);
                        })}
                    </div>
                </div>
            ))}
            {list.length === 0 && <span>{tipMessage}</span>}
        </div>
    );
});

export default Waterfall;