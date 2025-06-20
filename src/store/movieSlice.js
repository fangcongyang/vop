import { createSlice } from "@reduxjs/toolkit"
import _ from 'lodash';

const initialState = {
    siteList: [],
    siteMap: {},
    currentSite: {},
    historyList: [],
    downloadList: [],
    searchKeyword: '',
    detailInfo: {
        ids: 0,
        siteKey: "",
    },
}

export const movieSlice = createSlice({
    name: "movie",
    initialState,
    reducers: {
        storeSiteList(state, action) {
            const { siteList, forceRefresh } = action.payload;
            if (forceRefresh || state.siteList.length === 0) {
                state.currentSite = siteList[0];
                state.siteList = siteList;
                state.siteMap = siteList.reduce((acc, site) => {
                    acc[site.site_key] = site;
                    return acc;
                }, {})
            }
        },
        toggleCurrentSite(state, action) {
            state.currentSite = action.payload;
        },
        updateDownloadProcess(state, action) {
            const { id, count, download_count, status, download_status } = action.payload;
            let downloading = _.find(state.downloadList, { 'id': id});
            if (!downloading) return;
            if (count) {
                downloading.count = count;
            }
            if (download_count) {
                downloading.download_count = download_count;
            }
            downloading.status = status;
            downloading.download_status = download_status;
        },
        storeHistoryList(state, action) {
            const { historyList, forceRefresh } = action.payload;
            if (forceRefresh || state.historyList.length === 0) {
                state.historyList = historyList;
            }
        },
        storeDownloadList(state, action) {
            const { downloadList, forceRefresh } = action.payload;
            if (forceRefresh || state.downloadList.length === 0) {
                state.downloadList = downloadList;
            }
        },
        updateSearchKeyword(state, action) {
            state.searchKeyword = action.payload;
        },
        updateDetailInfo(state, action) {
            state.detailInfo = action.payload;
        }
    }
})

export const { storeSiteList, toggleCurrentSite, updateDownloadProcess, storeHistoryList, storeDownloadList, 
    updateSearchKeyword, updateDetailInfo} = movieSlice.actions

export const siteListStore = (state) => state.movie.siteList

export const siteMapStore = (state) => state.movie.siteMap

export const currentSiteStore = (state) => state.movie.currentSite

export const historyListStore = (state) => state.movie.historyList;

export const currentHistoryStore = (state) => state.movie.currentHistory

export const downloadListStore = (state) => state.movie.downloadList;

export const searchKeywordStore = (state) => state.movie.searchKeyword;

export const detailInfoStore = (state) => state.movie.detailInfo;

export default movieSlice.reducer

