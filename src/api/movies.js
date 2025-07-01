import { getCacheData, cacheData } from "@/business/cache";
import htmlParseStrategy from "@/business/htmlParseStrategy";
import { siteService } from "./siteService";

export default {
    async siteCheck(site) {
        try {
            const cls = await this.getSiteClass(site);
            return !!cls;
        } catch {
            return false;
        }
    },

    getSiteClass(site) {
        return siteService.getSiteClass(site);
    },

    pageMovies(site, params) {
        return siteService.getSiteClass(site, params);
    },

    listMovies(site, params) {
        return siteService.listMovies(site, params);
    },

    detail(site, id) {
        const cacheKey = site.site_key + "@" + id;
        const videoInfo = getCacheData(cacheKey);
        if (videoInfo?.fullList?.length) {
            return Promise.resolve(videoInfo);
        }
        return siteService.detail(site, id);
    },

    search(site, wd) {
        return siteService.search(site, wd);
    },

    searchFirstDetail(site, wd) {
        return siteService.searchFirstDetail(site, wd);
    },

    fetchPlaylist(site, cacheKey, ids) {
        return new Promise((resolve, reject) => {
            getCacheData(cacheKey).then(videoInfo => {
                if (videoInfo?.fullList?.length) {
                    resolve(videoInfo.fullList);
                } else {
                    this.detail(site, ids).then(
                        res => {
                            cacheData(cacheKey, res);
                            resolve(res.fullList);
                        },
                        _err => reject()
                    );
                }
            });
        });
    },

    download(site, id, videoFlag) {
        return new Promise((resolve, reject) => {
            if (site.download) {
                siteService.siteDownload(site).then(
                    data => {
                        const dataParser = htmlParseStrategy[site.parse_mode];
                        dataParser.doParserDownload(resolve, reject, data);
                    },
                    _err => reject({ info: "无法获取到下载链接，请通过播放页面点击\"调试\"按钮获取" })
                );
            } else {
                this.detail(site, id).then(
                    res => {
                        const dl = res.fullList.find((e, index) => e.flag + "-" + index === videoFlag) || res.fullList[0];
                        const downloadUrls = dl.list.map(i => {
                            const url = encodeURI(i.includes("$") ? i.split("$")[1] : i);
                            return {
                                name: res.name,
                                subTitleName: i.split("$")[0],
                                url,
                            }
                        })

                        if (downloadUrls.length) {
                            resolve({ downloadUrls, info: "视频源链接已复制, 快去下载吧!" });
                        } else {
                            reject({ info: "下载链接不存在" });
                        }
                    },
                    _err => reject({ info: "无法获取到下载链接，请通过播放页面点击\"调试\"按钮获取" })
                );
            }
        });
    },

};
