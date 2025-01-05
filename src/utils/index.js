export default {
    trimAll(ele) {
        if (typeof ele === "string") {
            return ele.split(/[\t\r\f\n\s]*/g).join("");
        } else {
            console.error("`${type of ele}` is not a string");
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
