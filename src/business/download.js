import { updateDownloadById } from "@/db";

export class DownloadBus {
    wsAddr = "ws://127.0.0.1:8000";
    downloadRequest = {
        id: "0",
        messageType: "get_download_info_by_queue",
        downloadInfo: null,
    };
    ws;
    updateDownloadInfoEvent;
    downloadInterval;
    isCompulsionClose = false;

    constructor(downloadInfo) {
        this.downloadRequest.downloadInfo = downloadInfo;
        this.initSocket();
    }

    isWsOpen = () => {
        return this.ws && this.ws.readyState === 1;
    };

    intervalGetDownloadInfo = () => {
        this.downloadInterval = setInterval(async () => {
            this.downloadRequest.mes_type
            this.ws.send(JSON.stringify(this.downloadRequest))
        }, 1000);
    };

    compulsionClose = () => {
        this.isCompulsionClose = true;
        clearInterval(this.downloadInterval);
        this.ws.close();
    };

    initSocket = () => {
        this.ws = new WebSocket(this.wsAddr);
        this.ws.onopen = () => {
            this.intervalGetDownloadInfo();
        };

        this.ws.onclose = () => {
            setTimeout(() => {
                if (!this.isCompulsionClose) {
                    this.initSocket();
                }
            }, 3000);
        };

        this.ws.onerror = () => {
            console.log("websoket连接失败，请刷新！");
        };

        this.ws.onmessage = async ({ data }) => {
            const dataObj = JSON.parse(data);
            if (dataObj.messageType == "get_download_info_by_queue") {
                if (dataObj.downloadInfo != null && dataObj.downloadInfo != undefined) {
                    clearInterval(this.downloadInterval);
                    this.downloadRequest.messageType = "downloadVideo";
                    this.downloadRequest.downloadInfo = downloadInfo;
                    this.ws.send(JSON.stringify(this.downloadRequest));
                }
                return;
            }
            let isNeedSeed = false;
            if (dataObj.status) {
                this.downloadRequest.downloadInfo.status = dataObj.status;
            }
            if (dataObj.download_status) {
                this.downloadRequest.downloadInfo.download_status =
                    dataObj.download_status;
            }
            switch (dataObj.mes_type) {
                case "parseSourceEnd":
                    this.downloadRequest.downloadInfo.count = dataObj.count;
                    isNeedSeed = true;
                    break;
                case "parseSourceError":
                    isNeedSeed = true;
                    break;
                case "progress":
                    this.downloadRequest.downloadInfo.download_count =
                        dataObj.download_count;
                    break;
                case "downloadSliceEnd":
                    this.downloadRequest.downloadInfo.download_count =
                        dataObj.download_count;
                    isNeedSeed = true;
                    break;
                case "checkSourceEnd":
                    isNeedSeed = true;
                    break;
            }

            await updateDownloadById(this.downloadRequest.downloadInfo);
            this.updateDownloadInfoEvent(this.downloadRequest.downloadInfo);

            if (isNeedSeed) {
                this.isWsOpen() &&
                    this.ws.send(JSON.stringify(this.downloadRequest));
            }

            if (dataObj.mes_type === "end") {
                this.intervalGetDownloadInfo();
            }
        };
    };
}
