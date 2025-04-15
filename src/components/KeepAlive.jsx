import { useRef, useEffect, useState } from "react";

/**
 * KeepAlive 组件用于缓存子组件的状态和 DOM，实现切换时不卸载。
 * @param {string|number} cacheKey - 缓存标识，切换时唯一。
 * @param {ReactNode} children - 需要缓存的内容。
 * @param {boolean} active - 当前是否激活显示。
 */
const KeepAlive = ({ cacheKey, children, active = true }) => {
    const cache = useRef(new Map());
    const [, forceUpdate] = useState({});

    useEffect(() => {
        // 组件卸载时清理缓存
        return () => {
            cache.current.clear();
        };
    }, []);

    // 缓存当前内容
    if (!cache.current.has(cacheKey)) {
        cache.current.set(cacheKey, children);
        // 触发一次更新，确保缓存生效
        forceUpdate({});
    } else {
        // 若已缓存，更新 children（如 props 变化）
        cache.current.set(cacheKey, children);
    }

    return (
        <>
            {[...cache.current.entries()].map(([key, node]) => (
                <div
                    key={key}
                    style={{ display: key === cacheKey && active ? "block" : "none", height: "100%"  }}
                >
                    {node}
                </div>
            ))}
        </>
    );
};

export default KeepAlive;