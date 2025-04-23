export default {
    trimAll(ele) {
        if (typeof ele === "string") {
            ele = this.removeWhitespace(ele);
            return ele.replace(/[\t\r\f\n\s.]+/g, '');
        } else {
            console.error("`${type of ele}` is not a string");
        }
    },

    removeWhitespace(str) {
        if (typeof str === "string") {
            return str.replace(/\s+/g, '');
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
                .replace(/\\["\\\/bfnrtu]/g, "@")
                .replace(
                    /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,
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
};
