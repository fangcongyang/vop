import memoizeOne from 'memoize-one';

// 使用 sessionStorage 实现本次对话缓存
const sessionCache = {
    get: (key) => {
        try {
            const data = sessionStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.warn('Failed to get data from sessionStorage:', e);
            return null;
        }
    },
    set: (key, value) => {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn('Failed to set data to sessionStorage:', e);
        }
    }
};

// 优化getItemWidth函数，使用纯函数模式避免副作用
const getItemWidth = (breakpoints, gutter, hasAroundGutter, width, wrapperWidth) => {
    // 参数验证
    if (!wrapperWidth || wrapperWidth <= 0) return width;
    if (!breakpoints || Object.keys(breakpoints).length === 0) return width;
    
    // 获取升序尺寸集合
    const sizeList = Object.keys(breakpoints)
        .map(key => Number(key))
        .sort((a, b) => a - b);

    // 获取当前的可用宽度
    let validSize = wrapperWidth;
    let breakpoint = false;
    for (const size of sizeList) {
        if (wrapperWidth <= size) {
            validSize = size;
            breakpoint = true;
            break;
        }
    }

    // 非断点，返回设置的宽度
    if (!breakpoint)
        return width;

    // 断点模式，计算当前断点下的宽度
    const col = breakpoints[validSize]?.rowPerView || 1; // 添加默认值防止除零错误
    if (hasAroundGutter)
        return (wrapperWidth - gutter) / col - gutter;
    else
        return (wrapperWidth - (col - 1) * gutter) / col;
}

const memoizedGetItemWidth = memoizeOne(getItemWidth);

export const calculateCols = (breakpoints, gutter, hasAroundGutter, width, align, wrapperWidth) => {
    // 参数验证
    if (!wrapperWidth || !wrapperWidth.current) {
        return { colWidth: width, cols: 1, offsetX: 0 };
    }
    
    // 创建缓存键
    const cacheKey = `waterfall_${wrapperWidth.current}_${gutter}_${width}_${align}`;
    
    // 尝试从本次对话缓存获取
    const cachedData = sessionCache.get(cacheKey);
    if (cachedData && cachedData.colWidth && cachedData.cols && cachedData.offsetX !== undefined) {
        return cachedData;
    }
    
    // 列实际宽度
    const colWidth = memoizedGetItemWidth(breakpoints, gutter, hasAroundGutter, width, wrapperWidth.current);

    // 列数计算
    const offset = hasAroundGutter ? -gutter : gutter;
    const cols = Math.max(1, Math.floor((wrapperWidth.current + offset) / (colWidth + gutter)));

    // 偏移计算
    let offsetX = 0;
    
    if (align === 'left') {
        // 左对齐
        offsetX = 0;
    } else {
        // 居中或右对齐
        const offset = hasAroundGutter ? gutter : -gutter;
        const contextWidth = cols * (colWidth + gutter) + offset;
        
        if (align === 'center') {
            // 居中
            offsetX = (wrapperWidth.current - contextWidth) / 2;
        } else {
            // 右对齐
            offsetX = (wrapperWidth.current - contextWidth);
        }
    }

    // 结果对象
    const result = { colWidth, cols, offsetX };
    
    // 缓存结果到本次对话缓存
    sessionCache.set(cacheKey, result);
    
    return result;

}