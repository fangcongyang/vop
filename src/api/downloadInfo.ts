import createRequest from "./base";

export const selectAllDownloadInfo = createRequest<any, any>("select_all_download_info", true);

export const getDownloadInfoById = createRequest<{ id: string }, any>("get_download_info_by_id", true);

export const saveDownloadInfo = createRequest<{ download_infos: any[] }, any>("save_download_info", true);

export const deleteDownloadInfo = createRequest<{ id: string }, any>("delete_download_info", true);
