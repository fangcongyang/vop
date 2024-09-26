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

    isWsOpen = () => this.ws && this.ws.readyState === 1;

    intervalGetDownloadInfo = () => {
        this.downloadInterval = setInterval(() => {
            this.downloadRequest.downloadInfo = null
            this.downloadRequest.messageType = "get_download_info_by_queue";
            this.ws.send(JSON.stringify(this.downloadRequest));
        }, 1000);
    };

    compulsionClose = () => {
        this.isCompulsionClose = true;
        clearInterval(this.downloadInterval);
        this.ws.close();
    };

    initSocket = () => {
        this.ws = new WebSocket(this.wsAddr);
        this.ws.onopen = this.intervalGetDownloadInfo;

        this.ws.onclose = () => {
            if (!this.isCompulsionClose) {
                clearInterval(this.downloadInterval);
                setTimeout(this.initSocket, 3000);
            }
        };

        this.ws.onerror = () => {
            console.log("websocket连接失败，请刷新！");
        };

        this.ws.onmessage = async ({ data }) => {
            const dataObj = JSON.parse(data);
            if (dataObj.messageType === "get_download_info_by_queue") {
                if (dataObj.downloadInfo) {
                    clearInterval(this.downloadInterval);
                    this.downloadRequest.messageType = "downloadVideo";
                    this.downloadRequest.downloadInfo = dataObj.downloadInfo;
                    this.ws.send(JSON.stringify(this.downloadRequest));
                }
                return;
            }

            let isNeedSeed = false;
            if (dataObj?.status) {
                this.downloadRequest.downloadInfo.status = dataObj.status;
            }
            if (dataObj?.download_status) {
                this.downloadRequest.downloadInfo.download_status = dataObj.download_status;
            }

            switch (dataObj.mes_type) {
                case "parseSourceEnd":
                case "parseSourceError":
                case "downloadSliceEnd":
                case "checkSourceEnd":
                    isNeedSeed = true;
                    if (dataObj.mes_type === "parseSourceEnd") {
                        this.downloadRequest.downloadInfo.count = dataObj.count;
                    }
                    break;
                case "progress":
                    this.downloadRequest.downloadInfo.download_count = dataObj.download_count;
                    break;
                case "end":
                    this.downloadRequest.downloadInfo.download_status = dataObj.download_status;
                    break;
            }

            await updateDownloadById(this.downloadRequest.downloadInfo);
            this.updateDownloadInfoEvent(this.downloadRequest.downloadInfo);

            if (isNeedSeed && this.isWsOpen()) {
                this.ws.send(JSON.stringify(this.downloadRequest));
            }

            if (dataObj.mes_type === "end") {
                this.intervalGetDownloadInfo();
            }
        };
    };
}
