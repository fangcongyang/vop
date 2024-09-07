import {
    memo,
    useMemo,
    useRef,
    useState,
    useEffect,
    Children,
    isValidElement,
    cloneElement,
} from "react";
import { prefixStyle, addClass, hasClass } from "@/utils/dom";
import _ from "lodash";
import memoizeOne from "memoize-one";
import { calculateCols } from "./useCalculareCols";
import "./index.scss";

const transform = prefixStyle("transform");
const duration = prefixStyle("animation-duration");
const cssDelay = prefixStyle("animation-delay");
const transition = prefixStyle("transition");
const fillMode = prefixStyle("animation-fill-mode");

let posY = [];
const Waterfall = memo(({
    list= [],
    rowKey= "id",
    width= 200,
    breakpoints= {
        1200: {
            //当屏幕宽度小于等于1200
            rowPerView: 5,
        },
        1000: {
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
    },
    gutter= 10,
    hasAroundGutter= false,
    posDuration= 300,
    animationPrefix= "animate__animated",
    animationEffect= "fadeIn",
    animationDuration= 1000,
    animationDelay= 300,
    backgroundColor= "#fff",
    //图片懒加载
    lazyload= true,
    //图片加载是否开启跨域
    crossOrigin= true,
    //布局刷新的防抖时间，默认 300ms 内没有再次触发才刷新布局。（图片加载完成；容器大小、list、width、gutter、hasAroundGutter变化时均会触发刷新）
    delay= 300,
    //卡片的对齐方式，可选值为：left,center,right
    align="center",
    tipMessage= "暂无数据",
    children,
    initYzb= 0,
    afterRender
}) => {
    const waterfallWrapper = useRef(null);
    const wrapperWidth = useRef(0);
    const [wrapperHeight, setWrapperHeight] = useState(0);
    const colWidth = useRef(0);
    const offsetX = useRef(0);
    const cols = useRef(0);

    const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            if (entry.target === waterfallWrapper.current) {
                const { width } = entry.contentRect;
                wrapperWidth.current = width;
                onCalculateCols();
            }
        }
    });

    useEffect(() => {
        let waterfallWrapperDiv = waterfallWrapper.current;
        resizeObserver.observe(waterfallWrapperDiv);

        return () => {
            resizeObserver.unobserve(waterfallWrapperDiv);
        };
    }, [hasAroundGutter, initYzb]);

    const onCalculateCols = _.debounce(() => {
        const cc = calculateCols(breakpoints, gutter, hasAroundGutter, width, align, wrapperWidth);
        colWidth.current = cc.colWidth;
        cols.current = cc.cols;
        offsetX.current = cc.offsetX;
        renderer();
    }, delay);

    // 获取对应y下标的x的值
    const getX = (index) => {
        const count = hasAroundGutter ? index + 1 : index;
        return (
            gutter * count + colWidth.current * index + offsetX.current
        );
    };

    // 初始y
    const initY = () => {
        posY = new Array(cols.current).fill(
            hasAroundGutter ? gutter : initYzb
        );
    };

    const addAnimation = (item, callback) => {
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
    };

    // 排版
    const layoutHandle = async () => {
        if (cols.current == 0 || cols.current == -1) return;
        return new Promise((resolve) => {
            // 初始化y集合
            initY();

            // 构造列表
            const items = [];
            if (waterfallWrapper && waterfallWrapper.current) {
                waterfallWrapper.current.childNodes.forEach((el) => {
                    if (el?.className === "waterfallItem") items.push(el);
                });
            }

            // 获取节点
            if (items.length === 0) { 
                setWrapperHeight(Math.max.apply(null, posY));
                return false;
            }

            // 遍历节点
            for (let i = 0; i < items.length; i++) {
                const curItem = items[i];
                // 最小的y值
                const minY = Math.min.apply(null, posY);
                // 最小y的下标
                const minYIndex = posY.indexOf(minY);
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
                posY[minYIndex] += height + gutter;

                // 添加入场动画
                addAnimation(curItem, () => {
                    // 添加动画时间
                    const time = posDuration / 1000;
                    if (transition) style[transition] = `transform ${time}s`;
                });
            }
            setWrapperHeight(Math.max.apply(null, posY));
            
            resolve(true);
        });
    };

    useEffect(() => {
        renderer();
    }, [list]);

    const renderer = _.debounce(() => {
        layoutHandle().then(() => {
            afterRender ? afterRender() : "";
        });
    }, delay);

    // 获取唯一值
    const getKey = (item, index) => {
        return item[rowKey] || index;
    };

    const waterfallListStyle = useMemo(() => {
        let style = {
            height: `${wrapperHeight}px`
        };
        if (list.length == 0) style.height = "100vh";
        return style;
    }, [wrapperHeight])

    return (
        <>
            <div
                ref={waterfallWrapper}
                className="waterfallList"
                style={waterfallListStyle}
            >
                {list.map((item, index) => {
                    return (
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
                    );
                })}
                {list.length === 0 && (
                        <span>{tipMessage}</span>
                )}
            </div>
        </>
    );
});

export default Waterfall;
