import { XMLParser } from "fast-xml-parser";

class HtmlParseStrategy {
    getPageParams(params) {
        // Implementation here
    }
    doParserClass(resolve, reject, data) {
        // Implementation here
    }
    doParserPage(resolve, reject, data) {
        // Implementation here
    }
    doParserVideo(resolve, reject, data) {
        // Implementation here
    }
    doParserVideoDetail(resolve, reject, data) {
        // Implementation here
    }

    doParserSearch(resolve, reject, data, wd) {
        // Implementation here
    }

    doParserDownload(resolve, reject, data) {
        // Implementation here
    }
}

class SiteClassXmlParser extends HtmlParseStrategy {
    constructor() {
        super(); // 修复：调用父类构造函数
        const parserConfig = {
            trimValues: true,
            textNodeName: "_t",
            ignoreAttributes: false,
            attributeNamePrefix: "_",
            parseAttributeValue: true,
        };
        this.parser = new XMLParser(parserConfig); // 修复：使用 this 关键字
    }

    getPageParams(params) {
        params["ac"] = "videolist";
    }

    doParserClass(resolve, reject, data) {
        try {
            const json = this.parser.parse(data); // 修复：使用 this 关键字
            const jsondata = json?.rss ?? json;
            if (!jsondata?.class || !jsondata?.list) reject("解析xml数据为空");
            const arr = jsondata.class.ty.map(i => ({
                class_id: i._id,
                class_name: i._t.replace(/\{.*\}/i, ""),
            }));
            const doc = {
                classList: arr,
                page: jsondata.list._page,
                pageCount: jsondata.list._pagecount,
                pageSize: jsondata.list._pagesize,
                recordCount: jsondata.list._recordcount,
            };
            resolve(doc);
        } catch (err) {
            reject(err);
        }
    }

    doParserPage(resolve, reject, data) {
        try {
            const data1 = data.match(/<list [^>]*>/)[0] + "</list>";
            const json = this.parser.parse(data1); // 修复：使用 this 关键字
            const jsondata = json.rss ?? json;
            const pg = {
                totalPageCount: jsondata.list._pagecount,
                pageCount: jsondata.list._pagecount,
                recordcount: jsondata.list._recordcount,
                movieList: [],
                movieFilteredList: [],
            };
            resolve(pg);
        } catch (err) {
            reject(err);
        }
    }

    doParserVideo(resolve, reject, data) {
        const json = this.parser.parse(data); // 修复：使用 this 关键字
        const jsondata = json.rss ?? json;
        let videoList = jsondata.list.video;
        let newVideoList = [];
        if (videoList) {
            const type = Object.prototype.toString.call(videoList);
            if (type === "[object Array]") {
                newVideoList = videoList.filter(
                    e => e.dl && e.dl.dd && (e.dl.dd._t || (Array.isArray(e.dl.dd) && e.dl.dd.some(i => i._t)))
                );
            } else if (type === "[object Object]") {
                if (videoList.dl.dd && (videoList.dl.dd._t || (Array.isArray(videoList.dl.dd) && videoList.dl.dd.some(e => e._t)))) {
                    newVideoList.push(videoList);
                }
            }
            resolve(newVideoList);
        } else {
            resolve([]);
        }
    }

    getDetailParams(params) {
        params["ac"] = "videolist";
    }

    doParserVideoDetail(resolve, reject, data) {
        const json = this.parser.parse(data); // 修复：使用 this 关键字
        const jsondata = json?.rss ?? json;
        const videoList = jsondata?.list?.video;
        if (!videoList) resolve();
        let fullList = [];
        let index = 0;
        const supportedFormats = ["m3u8", "mp4"];
        const dd = videoList.dl?.dd;
        const type = Object.prototype.toString.call(dd);
        if (type === "[object Array]") {
            for (const i of dd) {
                i._t = i._t.replace(/\$+/g, "$");
                const ext = Array.from(new Set(...i._t.split("#").map(e => e.includes("$") ? e.split("$")[1].match(/\.\w+?$/) : e.match(/\.\w+?$/)))).map(e => e.slice(1));
                if (ext.length && ext.length <= supportedFormats.length && ext.every(e => supportedFormats.includes(e))) {
                    i._flag = ext.length === 1 ? ext[0] + "-" + index : index ? "ZY支持-" + index : "ZY支持";
                    index++;
                }
                fullList.push({
                    flag: i._flag,
                    list: i._t.split("#").filter(e => e && (e.startsWith("http") || (e.split("$")[1] && e.split("$")[1].startsWith("http"))))
                });
            }
        } else {
            fullList.push({
                flag: dd._flag,
                list: dd._t.replace(/\$+/g, "$").split("#").filter(e => e && (e.startsWith("http") || (e.split("$")[1] && e.split("$")[1].startsWith("http")))),
            });
        }
        fullList.forEach(item => {
            if (item.list.every(e => e.includes("$") && /^\s*\d+\s*$/.test(e.split("$")[0]))) {
                item.list.sort((a, b) => a.split("$")[0] - b.split("$")[0]);
            }
        });
        if (fullList.length > 1) {
            index = fullList.findIndex(e => supportedFormats.includes(e.flag) || e.flag.startsWith("ZY支持"));
            if (index !== -1) {
                const first = fullList.splice(index, 1);
                fullList = first.concat(fullList);
            }
        }
        videoList.fullList = fullList;
        resolve(videoList);
    }

    doParserSearch(resolve, reject, data, wd) {
        const json = this.parser.parse(data); // 修复：使用 this 关键字
        const jsondata = json?.rss ?? json;
        if (jsondata?.list) {
            let videoList = jsondata.list.video;
            if (typeof videoList === "object") videoList = [].concat(videoList);
            videoList = videoList?.filter(e => e.name.toLowerCase().includes(wd.toLowerCase()));
            resolve(videoList?.length ? videoList : []);
        } else {
            resolve([]);
        }
    }

    doParserDownload(resolve, reject, data) {
        const json = this.parser.parse(data); // 修复：使用 this 关键字
        const jsondata = json.rss ?? json;
        const videoList = jsondata.list.video;
        const dd = videoList.dl.dd;
        const type = Object.prototype.toString.call(dd);
        const downloadUrls = (type === "[object Array]" ? dd : [dd])
            .map(i => i._t.replace(/\$+/g, "$").split("#").map(e => encodeURI(e.includes("$") ? e.split("$")[1] : e)).join("\n"))
            .join("\n");
        if (downloadUrls) {
            resolve({ downloadUrls, info: "加入下载队列成功!" });
        } else {
            reject({ info: "无法获取到下载链接，请通过播放页面点击\"调试\"按钮获取" });
        }
    }
}

class SiteClassJsonParser extends HtmlParseStrategy {

    getPageParams(params) {
        params["ac"] = "list";
    }

    doParserClass(resolve, reject, data) {
        const json = JSON.parse(data);
        const arr = json.class.map(i => ({
            class_id: i.type_id,
            class_name: i.type_name,
        }));
        const doc = {
            classList: arr,
            page: json.page,
            pageCount: json.pagecount,
            pageSize: json.limit,
            recordCount: json.total,
        };
        resolve(doc);
    }

    doParserPage(resolve, reject, data) {
        const json = JSON.parse(data);
        const pg = {
            totalPageCount: json.pagecount,
            pageCount: json.pagecount,
            recordcount: json.total,
            movieList: [],
            movieFilteredList: [],
        };
        resolve(pg);
    }

    doParserVideo(resolve, reject, data) {
        const json = JSON.parse(data.replace("\n", ""));
        const videoList = json.list;
        const newVideoList = videoList.map(v => {
            const newV = {};
            for (const key in v) {
                newV[key.startsWith("vod_") ? key.replace("vod_", "") : key] = v[key];
            }
            return newV;
        });
        resolve(newVideoList.length ? newVideoList : []);
    }

    getDetailParams(params) {
        params["ac"] = "detail";
    }

    doParserVideoDetail(resolve, reject, data) {
        const json = JSON.parse(data.replace("\n", ""));
        const videoList = json.list;
        if (!videoList.length) return resolve({});
        const v = videoList[0];
        const videoInfo = Object.keys(v).reduce((acc, key) => {
            acc[key.startsWith("vod_") ? key.replace("vod_", "") : key] = v[key];
            return acc;
        }, {});
        videoInfo["des"] = videoInfo.content;
        videoInfo["fullList"] = videoList.map((v1, i) => ({
            flag: "m3u8" + (i + 1),
            list: v1.vod_play_url.replace("\\", "").split("#"),
        }));
        resolve(videoInfo);
    }

    doParserSearch(resolve, reject, data, wd) {
        if (!data) return resolve([]);
        const json = JSON.parse(data.replace("\n", ""));
        const videoList = json.list;
        if (videoList.length) {
            resolve(videoList);
        } else {
            resolve([]);
        }
    }

    doParserDownload(resolve, reject, data) {
        const json = JSON.parse(data.replace("\n", ""));
        const downloadUrls = json.url;
        if (downloadUrls) {
            resolve({ downloadUrls, info: "加入下载队列成功!" });
        } else {
            reject({ info: "无法获取到下载链接，请通过播放页面点击\"调试\"按钮获取" });
        }
    }
}

const htmlParseStrategy = {
    xml: new SiteClassXmlParser(),
    json: new SiteClassJsonParser(),
};

export default htmlParseStrategy;

