import { open, save } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";

export default {
    trimAll(ele) {
        if (typeof ele === "string") {
            ele = this.removeWhitespace(ele);
            return ele.replace(/[\t\r\f\n\s.]+/g, "");
        } else {
            console.error("`${type of ele}` is not a string");
        }
    },

    removeWhitespace(str) {
        if (typeof str === "string") {
            return str.replace(/\s+/g, "");
        } else {
            console.error("`${typeof str}` is not a string");
            return str; // Or return an empty string, depending on desired behavior for non-strings
        }
    },

    isJSON(str) {
        if (typeof str !== "string") {
            return false;
        }
        var regex = /^[\],:{}\s]*$/;
        return regex.test(
            str
                .replace(/\\["\\/bfnrtu]/g, "@")
                .replace(
                    /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?/g,
                    "]"
                )
                .replace(/(?:^|:|,)(?:\s*\[)+/g, "")
        );
    },

    createCancelableRequest(requestFn) {
        const controller = new AbortController();
        const signal = controller.signal;

        const cancelableRequest = async (config) => {
            return requestFn({ ...config, signal });
        };

        const cancel = () => {
            controller.abort();
            console.log("Request canceled");
        };

        return { cancelableRequest, cancel };
    },

    /**
     * 检测是否为移动设备（Web环境）
     * @returns {boolean}
     */
    detectMobileDevice() {
        const portraitMobile = window.matchMedia(
            "screen and (max-width: 760px) and (orientation: portrait)"
        ).matches;

        const landscapeMobile = window.matchMedia(
            "screen and (max-width: 1000px) and (orientation: landscape)"
        ).matches;

        return portraitMobile || landscapeMobile;
    },

    async exportJSON(fileName, data) {
        const jsonString = JSON.stringify(data, null, 2);
        let filePath = await save({
            filters: [{ name: "JSON file", extensions: ["json"] }],
            defaultPath: fileName,
        });
        if (filePath !== null) {
            if (!filePath.endsWith(".json")) filePath += ".json";
            await writeTextFile(filePath, jsonString);
            return { success: true, filePath };
        }
        return { success: false };
    },

    async importJSON() {
        const filePath = await open({
            filters: [{ name: "JSON file", extensions: ["text", "json"] }],
        });
        if (filePath !== null) {
            const fileContent = await readTextFile(filePath);
            if (this.isJSON(fileContent)) {
                return { success: true, filePath };
            } else {
                return { success: false, error: "文件内容不是JSON格式" };
            }
        }
        return { success: false, error: "未选择文件" };
    },
};
