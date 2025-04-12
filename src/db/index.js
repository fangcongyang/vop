import Dexie from "dexie";
import { systemConf } from "@/static/systemConf";
import { invoke } from "@tauri-apps/api/core";
import { AxiosHttpStrategy } from "@/utils/httpStrategy";
import { unionWith, isEqual } from "lodash";
import { generateUUID } from "@/utils/common";
import { message } from "@tauri-apps/plugin-dialog";
class MopDatabase extends Dexie {
    site;
    siteClassList;
    history;
    downloadInfo;
    systemConf;
    star;
    searchRecord;

    constructor() {
        super("VopDatabase");
        this.version(1).stores({
            site: "++id,site_key,site_name,api,site_group,is_active,status,position,is_reverse_order,parse_mode",
            siteClassList: "++id,class_id,site_key,class_name",
            history:
                "++id,history_name,ids,index,start_position,end_position,play_time,site_key,online_play,detail,video_flag,duration,has_update,update_time",
            downloadInfo:
                "++id,movie_name,url,sub_title_name,status,download_count,count,download_status",
            systemConf:
                "++id,conf_code,conf_name,conf_value,parent_id,search_path",
            star: "++id,star_name,ids,site_key,movie_type,year,note,douban_rate,has_update,last_update_time,position,pic,area",
            searchRecord: "++id,keyword,search_time",
        });
    }
}

const db = new MopDatabase();
const axiosHttpStrategy = new AxiosHttpStrategy();

export async function initDB(forceUpdate = false) {
    if (forceUpdate) {
        const res = await axiosHttpStrategy.get("", {
            apiUrl: "/api/site/getSites",
            token: "123456",
        }).catch(async(e) => {
            await message(e, { title: '同步site错误', kind: 'error' });
        });
        let siteList = res.data;
        const oldSiteList = await db.site.toArray();
        if (oldSiteList && oldSiteList.length > 0) {
            siteList = unionWith(siteList, oldSiteList, isEqual);
        }
        await db.site.bulkPut(siteList);
        // db.downloadInfo.bulkPut(downloadInfo);
        // db.systemConf.bulkPut(systemConf);
    }
    const clientUniqueId = await getSystemConfByKey("clientUniqueId");
    if (!clientUniqueId) {
        const id = await db.systemConf.add({
            conf_code: "clientUniqueId",
            conf_name: "客户端唯一标识",
            conf_value: generateUUID(),
            parent_id: 0,
        });
        await db.systemConf.update(id, { search_path: `X0X${id}X` });
    }
    const dataUpload = await getSystemConfByKey("dataUpload");
    if (!dataUpload) {
        const id = await db.systemConf.add({
            conf_code: "dataUpload",
            conf_name: "是否上传数据到服务器",
            conf_value: false,
            parent_id: 0,
        });
        await db.systemConf.update(id, { search_path: `X0X${id}X` });
    } else {
        uploadData(dataUpload.conf_value)
    }
    return await db.site.toArray();
}

export async function getSiteList() {
    return await db.site.toArray();
}

export async function deleteSite(siteId) {
    await db.site.delete(siteId);
}

export async function getSiteByKey(site_key) {
    return await db.site.where("site_key").equals(site_key).first();
}

export async function getSiteClassList(site_key) {
    // db.siteClassList.clear();
    return db.siteClassList.where("site_key").equals(site_key).toArray();
}

export async function saveSite(site) {
    let siteInfo = {
        id: site.id,
        site_key: site.siteKey,
        site_name: site.siteName,
        api: site.api,
        site_group: site.siteGroup,
        parse_mode: site.parseMode,
    };
    if (siteInfo.id) {
        await db.site.update(siteInfo.id, siteInfo);
    } else {
        await db.site
            .orderBy("position")
            .reverse()
            .first()
            .then((item) => {
                if (item) {
                    siteInfo.position = item.position + 10;
                } else {
                    siteInfo.position = 10;
                }
            });
        siteInfo.is_active = "1";
        siteInfo.status = "可用";
        (siteInfo.is_reverse_order = "1"), await db.site.add(siteInfo);
    }
}

export async function cacheSiteClassList(site_key, classList) {
    classList.forEach((element) => {
        element["site_key"] = site_key;
    });
    await db.siteClassList.bulkPut(classList);
    return classList;
}

export async function getAllHistory() {
    return await db.history.orderBy("update_time").reverse().toArray();
}

export async function saveHistory(history) {
    if (history.id) {
        await db.history.update(history.id, history);
    } else {
        await db.history.add(history);
    }
}

export async function getCurrentHistory(site_key, ids) {
    return await db.history
        .where("ids")
        .equals(ids)
        .and((item) => item.site_key == site_key)
        .first();
}

export async function deleteHistory(historyId) {
    await db.history.delete(historyId);
    getAllHistory(true);
}

export async function getAllStar() {
    return await db.star.orderBy("id").toArray();
}

export async function starMovie(star) {
    let oldStar = await db.star
        .where("ids")
        .equals(star.ids)
        .and((item) => item.site_key == star.site_key)
        .first();
    if (!oldStar) {
        await db.star.add(star);
    }
}

export async function deleteStar(starId) {
    await db.star.delete(starId);
    getAllStar(true);
}

export async function getAllDownloadList() {
    return await db.downloadInfo.toArray();
}

export async function getDownloadById(downloadId) {
    const downloadSavePath = await db.systemConf
        .where("conf_code")
        .equals("downloadSavePath")
        .first();
    const downloadInfo = await db.downloadInfo
        .where("id")
        .equals(downloadId)
        .first();
    const subTitleName = downloadInfo.sub_title_name;
    downloadInfo.url =
        downloadSavePath.conf_value +
        "\\" +
        downloadInfo.movie_name +
        "\\" +
        subTitleName +
        "\\" +
        subTitleName +
        ".mp4";
    return downloadInfo;
}

export async function deleteDownload(downloadInfo) {
    const downloadSavePath = await getDownloadSavePath();
    await db.downloadInfo.delete(downloadInfo.id);
    const subTitleName = downloadInfo.sub_title_name;
    const downloadInfoPath =
        downloadSavePath + "\\" + downloadInfo.movie_name + "\\" + subTitleName;
    invoke("del_movie_path", { pathStr: downloadInfoPath });
}

export async function addDownloads(downloadInfos) {
    const downloadSavePath = await getDownloadSavePath();
    downloadInfos.forEach(async (downloadInfo) => {
        let oldDownload = await db.downloadInfo
            .where("movie_name")
            .equals(downloadInfo.movie_name)
            .first();
        if (!oldDownload) {
            let id = await db.downloadInfo.add(downloadInfo);
            downloadInfo["id"] = id;
            downloadInfo["save_path"] = downloadSavePath;
            invoke("retry_download", { download: downloadInfo });
        }
    });
}

export async function updateDownloadById(downloadInfo) {
    db.downloadInfo.update(downloadInfo.id, downloadInfo);
}

export async function getSystemConfByKey(confCode) {
    return await db.systemConf.where("conf_code").equals(confCode).first();
}

export async function getDownloadSavePath() {
    const downloadSavePath = await db.systemConf
        .where("conf_code")
        .equals("downloadSavePath")
        .first();
    return downloadSavePath?.conf_value;
}

export async function addSearchRecord(keyword) {
    const existingKeyword = await db.searchRecord.where("keyword").equals(keyword).first();
    if (!existingKeyword) {
        await db.searchRecord.add({keyword, search_time: Date.now()});
    }
}

export async function clearSearchRecord() {
    return await db.searchRecord.clear();
}

export async function getAllSearchList() {
    const allSearchList = await db.searchRecord.orderBy("search_time").reverse().toArray();
    // allSearchList.unshift({id: -1, keyword: "清空搜索记录"})
    return allSearchList;
}

export function clearDB() {
    return new Promise((resolve) => {
        db.delete()
            .then(() => {
                console.log("Database deleted successfully.");
            })
            .catch((error) => {
                console.error("Error deleting database:", error);
            });
        resolve();
    });
}

let uploadDataInterval = null;

export async function uploadData(dataUpload) {
    const conf = await db.systemConf.where("conf_code").equals("dataUpload").first();
    if (conf) {
        await db.systemConf.update(conf.id, { conf_value: dataUpload });
    }
    if (uploadDataInterval) clearInterval(uploadDataInterval);
    if (dataUpload) {
        uploadDataInterval = setInterval(async () => {
            const allSite = await getSiteList();
            const allHistory = await getAllHistory(); 
            const clientUniqueConf = await getSystemConfByKey("clientUniqueId");
            let params = {
                siteList: allSite,
                historyList: allHistory,
                clientUniqueId: clientUniqueConf.conf_value,
                apiUrl: "/api/site/uploadSite"
            };
            axiosHttpStrategy.postJson("", params, 30)
                .catch(() => {console.error("上传数据失败！")});
        }, 10 * 60 * 1000);
    }
}
