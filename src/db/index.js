import Dexie from "dexie";
import { AxiosHttpStrategy } from "@/utils/httpStrategy";
import { unionWith, isEqual } from "lodash";
import { generateUUID } from "@/utils/common";
import { message } from "@tauri-apps/plugin-dialog";
import { getSiteList } from "@/api/site";

class MopDatabase extends Dexie {
    site;
    siteClassList;
    downloadInfo;
    systemConf;
    star;
    searchRecord;

    constructor() {
        super("VopDatabase");
        this.version(1).stores({
            site: "++id,site_key,site_name,api,site_group,is_active,status,position,is_reverse_order,parse_mode",
            siteClassList: "++id,class_id,site_key,class_name",
            systemConf:
                "++id,conf_code,conf_name,conf_value,parent_id,search_path",
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

export async function getSystemConfByKey(confCode) {
    return await db.systemConf.where("conf_code").equals(confCode).first();
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
            const clientUniqueConf = await getSystemConfByKey("clientUniqueId");
            let params = {
                siteList: allSite,
                historyList: [],
                clientUniqueId: clientUniqueConf.conf_value,
                apiUrl: "/api/site/uploadSite"
            };
            axiosHttpStrategy.postJson("", params, 30)
                .catch(() => {console.error("上传数据失败！")});
        }, 10 * 60 * 1000);
    }
}
