export function fmtMSS(s) {
    return (s - (s %= 60)) / 60 + (s > 9 ? ":" : ":0") + s;
};

export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * 清理定时器的公共方法
 * @param {React.MutableRefObject} timerRef - 定时器的ref对象
 * @description 安全地清理定时器，避免内存泄漏
 */
export function clearTimer(timerRef) {
    if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
    }
}