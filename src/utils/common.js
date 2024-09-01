export function fmtMSS(s) {
    return (s - (s %= 60)) / 60 + (s > 9 ? ":" : ":0") + s;
};