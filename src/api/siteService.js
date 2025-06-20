import htmlParseStrategy from "@/business/htmlParseStrategy";
import fetch from "./fetch";

class SiteService {
    getSiteClass(site) {
        return new Promise((resolve, reject) => {
            fetch.proxyGet(site.api, null).then(
                (data) => {
                    const dataParser = htmlParseStrategy[site.parse_mode];
                    dataParser.doParserClass(resolve, reject, data);
                },
                (err) => reject(err)
            );
        });
    }

    pageMovies(site, params) {
        return new Promise((resolve, reject) => {
            const dataParser = htmlParseStrategy[site.parse_mode];
            dataParser.getPageParams(params);
            fetch.proxyGet(site.api, params).then(
                (data) => dataParser.doParserPage(resolve, reject, data),
                (err) => reject(err)
            );
        });
    }

    listMovies(site, params) {
        return new Promise((resolve, reject) => {
            const dataParser = htmlParseStrategy[site.parse_mode];
            dataParser.getPageParams(params);
            fetch.proxyGet(site.api, params).then(
                (data) => {
                    dataParser.doParserVideo(resolve, reject, data);
                },
                (err) => reject(err)
            );
        });
    }

    detail(site, id) {
        return new Promise((resolve, reject) => {
            const params = { ids: id };
            const dataParser = htmlParseStrategy[site.parse_mode];
            dataParser.getDetailParams(params);
            fetch.proxyGet(site.api, params).then(
                (data) => dataParser.doParserVideoDetail(resolve, reject, data),
                (err) => reject(err)
            );
        });
    }

    search(site, wd) {
        return new Promise((resolve, reject) => {
            const params = { wd };
            fetch.proxyGet(site.api, params, false, 3000).then(
                (data) => {
                    const dataParser = htmlParseStrategy[site.parse_mode];
                    dataParser.doParserSearch(resolve, reject, data, wd);
                },
                (_err) => reject("搜索资源失败")
            );
        });
    }

    searchFirstDetail(site, wd) {
        return new Promise((resolve, reject) => {
            const params = { wd: encodeURI(wd) };
            fetch.proxyGet(site.api, params, false, 3).then(
                (data) => {
                    const dataParser = htmlParseStrategy[site.parse_mode];
                    dataParser.doParserSearch(resolve, reject, data);
                },
                (err) => reject(err)
            );
        });
    }

    siteDownload(site) {
        const params = { ac: "videolist", ids: id, ct: 1 };
        return fetch.proxyGet(site.download, params);
    }
}

const siteService = new SiteService();

export { siteService };
