import createRequest from "./base";
import movieApi from "@/api/movies";

export const getSiteList = createRequest<any, any>("get_all_sites");

export const deleteSite = createRequest<any, any>("delete_site", true);

export const getSiteByKey = createRequest<any, any>("get_site_by_key", true);

export const selectSiteClassList = createRequest<any, any>(
    "select_site_class_list",
    true
);

const cacheSiteClassList = createRequest<any, any>("cache_site_class_list")

export const getSiteClassList = async (siteKey: string) => {
    const params = { siteKey };
    let classList = await selectSiteClassList(params);
    if (classList.length === 0) {
        const site = await getSiteByKey(params);
        try {
            const res = await movieApi.getSiteClass(site);
            const allClass = [
                { class_id: "-1", class_name: "最新" },
                ...res.classList,
            ];
            allClass.forEach((item) => {
                item.class_id = item.class_id.toString();
                item.site_key = site.site_key;
            });
            classList = await cacheSiteClassList(allClass);
        } catch (err) {
            console.error(`site_key: ${site.site_key} get class error: ${err}`);
            classList = [];
        }
    }
    return classList;
};

export const insertSite = createRequest<any, any>("insert_site");

export const updateSite = createRequest<any, any>("update_site");

export const saveSite = async (site: any) => {
    let siteInfo: any = {
        id: site.id,
        site_key: site.siteKey,
        site_name: site.siteName,
        api: site.api,
        site_group: site.siteGroup,
        parse_mode: site.parseMode,
    };
    if (siteInfo.id) {
        await updateSite(siteInfo);
    } else {
        siteInfo.is_active = "1";
        siteInfo.status = "可用";
        siteInfo.is_reverse_order = "1";
        await insertSite(siteInfo);
    }
};
