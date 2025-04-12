import memoizeOne from 'memoize-one';

const getItemWidth = (breakpoints, gutter, hasAroundGutter, width, wrapperWidth) => {
    // 获取升序尺寸集合
    const sizeList = Object.keys(breakpoints).map((key) => { return Number(key) }).sort((a, b) => a - b)

    // 获取当前的可用宽度
    let validSize = wrapperWidth;
    let breakpoint = false
    for (const size of sizeList) {
        if (wrapperWidth <= size) {
            validSize = size
            breakpoint = true
            break
        }
    }

    // 非断点，返回设置的宽度
    if (!breakpoint)
        return width

    // 断点模式，计算当前断点下的宽度
    const col = breakpoints[validSize]?.rowPerView
    if (hasAroundGutter)
        return (wrapperWidth - gutter) / col - gutter
    else
        return (wrapperWidth - (col - 1) * gutter) / col
}

const memoizedGetItemWidth = memoizeOne(getItemWidth);

export const calculateCols = (breakpoints, gutter, hasAroundGutter, width, align, wrapperWidth) => {
    if (localStorage.getItem(wrapperWidth.current + '_' + gutter)) {
        return JSON.parse(localStorage.getItem(wrapperWidth.current))
    }
    // 列实际宽度
    const colWidth = memoizedGetItemWidth(breakpoints, gutter, hasAroundGutter, width, wrapperWidth.current);

    // 列
    const colsFun = memoizeOne(() => {
        const offset = hasAroundGutter ? -gutter : gutter
        return Math.floor((wrapperWidth.current + offset) / (colWidth + gutter))
    })

    const cols = colsFun();

    // 偏移
    const offsetXFun = memoizeOne(() => {
        // 左对齐
        if (align === 'left') {
            return 0
        }
        else if (align === 'center') {
            // 居中
            const offset = hasAroundGutter ? gutter : -gutter
            const contextWidth = cols * (colWidth + gutter) + offset
            return (wrapperWidth.current - contextWidth) / 2
        }
        else {
            const offset = hasAroundGutter ? gutter : -gutter
            const contextWidth = cols * (colWidth + gutter) + offset
            return (wrapperWidth.current - contextWidth)
        }
    })

    const offsetX = offsetXFun();

    localStorage.setItem(wrapperWidth.current + '_' + gutter, JSON.stringify({ colWidth, cols, offsetX }))
    return { colWidth, cols, offsetX }
}