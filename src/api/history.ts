import createRequest from "./base";

const getCurrentHistoryOrSaveRequest = createRequest<any, any>("get_current_history_or_save");

export const getCurrentHistoryOrSave = (playInfo: any, detail: any) =>{
    const videoFlag = playInfo.movieInfo.videoFlag || "";
    const isOnline = playInfo.playType === "iptv";
    const history: any = {
        history_name: playInfo.name,
        site_key: playInfo.movieInfo.siteKey,
        ids: playInfo.movieInfo.ids.toString(),
        index: playInfo.movieInfo.index,
        play_time: 0,
        duration: 0,
        start_position: 0,
        end_position: 0,
        detail: detail ? JSON.stringify(detail) : void 0,
        online_play: isOnline ? playInfo.movieInfo.onlineUrl : "",
        video_flag: videoFlag,
        has_update: "0",
    };
    return getCurrentHistoryOrSaveRequest(history);
}

export const getCurrentHistory = createRequest<{ siteKey: string, ids: string }, any>("get_current_history", true);

export const selectAllHistory = createRequest<any, void>("select_all_history");

export const updateHistory = createRequest<{ id: string, index: number, playTime: number, startPosition: number, endPosition: number, hasUpdate: string }, void>("update_history");

export const deleteHistory = createRequest<{ id: string }, void>("delete_history", true);

export const importHistory = createRequest<{ filePath: string }, void>("import_history", true);
