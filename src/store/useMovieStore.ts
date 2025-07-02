import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { find } from "lodash";

export interface MovieDetailInfo {
    ids: number;
    siteKey: string;
}

export interface DownloadInfo {
    id: number;
    movie_name: string;
    url: string;
    sub_title_name: string;
    status: string;
    download_count: number;
    count: number;
    download_status: string;
}

export interface HistoryInfo {
    id: string;
    history_name: string;
    ids: string;
    index: number;
    start_position: number;
    end_position: number;
    play_time: number;
    site_key: string;
    online_play: string;
    detail: any;
    video_flag: string;
    duration: number;
    has_update: string;
    create_time: string;
    update_time: string;
}

export interface MovieState {
    movieList: any[];
    movieDetailInfo: MovieDetailInfo | null;
    downloadInfoList: DownloadInfo[];
    historyInfoList: HistoryInfo[];
    toggleMovieDetailInfo: (movieDetailInfo: MovieDetailInfo | null) => void;
    toggleDownloadInfoList: (downloadInfoList: DownloadInfo[]) => void;
    updateDownloadInfoProcess: (downloadInfo: DownloadInfo) => void;
    toggleHistoryInfoList: (historyInfoList: HistoryInfo[]) => void;
}

export const useMovieStore = create<MovieState>()(persist(
    (set) => ({
    movieList: [],
    movieDetailInfo: null,
    downloadInfoList: [],
    historyInfoList: [],
    toggleMovieDetailInfo: (movieDetailInfo: MovieDetailInfo | null) => {
        set({ movieDetailInfo });
    },
    toggleDownloadInfoList: (downloadInfoList: DownloadInfo[]) => {
        set({ downloadInfoList });
    },
    updateDownloadInfoProcess: (downloadInfo: DownloadInfo) => {
        set((state) => {
            const { id, count, download_count, status, download_status } =
                downloadInfo;
            let downloading = find(state.downloadInfoList, { id: id });
            if (!downloading) return state;
            if (count) {
                downloading.count = count;
            }
            if (download_count) {
                downloading.download_count = download_count;
            }
            downloading.status = status;
            downloading.download_status = download_status;
            return {
                downloadInfoList: state.downloadInfoList.map((item) => {
                    if (item.id === id) {
                        return downloading
                    }
                    return item;
                }),
            };
        });
    },
    toggleHistoryInfoList: (historyInfoList: HistoryInfo[]) => {
        set({ historyInfoList });
    },
    }),
    {
        name: 'movie-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
            movieDetailInfo: state.movieDetailInfo,
            downloadInfoList: state.downloadInfoList,
            historyInfoList: state.historyInfoList,
        }),
    }
));
