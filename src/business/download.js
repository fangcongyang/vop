export class DownloadBus {
    wsAddr = "ws://127.0.0.1:8000";
    downloadRequest = {
        id: "0",
        messageType: "get_download_info_by_queue",
        downloadTaskInfo: null,
    };
    ws;
    updateDownloadInfoEvent;
    downloadInterval;
    isCompulsionClose = false;

    constructor(downloadInfo) {
        this.downloadRequest.downloadTaskInfo = downloadInfo;
        this.initSocket();
    }

    isWsOpen = () => this.ws && this.ws.readyState === 1;

    intervalGetDownloadInfo = () => {
        this.downloadInterval = setInterval(() => {
            this.downloadRequest.downloadTaskInfo = null
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
                if (dataObj.downloadTaskInfo) {
                    clearInterval(this.downloadInterval);
                    this.downloadRequest.messageType = "downloadVideo";
                    this.downloadRequest.downloadTaskInfo = dataObj.downloadTaskInfo;
                    this.ws.send(JSON.stringify(this.downloadRequest));
                }
                return;
            }

            if (dataObj?.status) {
                this.downloadRequest.downloadTaskInfo.status = dataObj.status;
            }
            if (dataObj?.download_status) {
                this.downloadRequest.downloadTaskInfo.download_status = dataObj.download_status;
            }

            switch (dataObj.mes_type) {
                case "parseSourceEnd":
                case "parseSourceError":
                case "downloadSliceEnd":
                case "checkSourceEnd":
                    if (dataObj.mes_type === "parseSourceEnd") {
                        this.downloadRequest.downloadTaskInfo.count = dataObj.count;
                    }
                    break;
                case "progress":
                    this.downloadRequest.downloadTaskInfo.download_count = dataObj.download_count;
                    break;
                case "end":
                    this.downloadRequest.downloadTaskInfo.download_status = dataObj.download_status;
                    break;
            }

            this.updateDownloadInfoEvent(this.downloadRequest.downloadTaskInfo);

            if (dataObj.mes_type === "end") {
                this.intervalGetDownloadInfo();
            }
        };
    };
}
