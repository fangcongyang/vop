import { invoke } from "@tauri-apps/api/core";
import { listen } from '@tauri-apps/api/event';

export class DownloadFileTask {
    constructor(downloadTaskInfo) {
        this.downloadTaskInfo = downloadTaskInfo;
        this.unlisten = null;
        this.events = {
            "begin": new Set(),
            "progress": new Set(),
            "end": new Set(),
            "error": new Set(),
        };
        this.initEventListen();
    }

    startDownload() {
        invoke('download_file_task', { downloadTaskInfo: this.downloadTaskInfo });
    }

    async initEventListen() {
        this.unlisten = await listen(this.downloadTaskInfo.event_id, (event) => {
            const eventName = event.payload.status;
            switch (eventName) {
                case "begin":
                    this.events[eventName].forEach((fn) => fn(event.payload));
                    break;
                case "progress":
                    this.events[eventName].forEach((fn) => fn(event.payload));
                    break;
                case "end":
                case "error":
                    this.events[eventName].forEach((fn) => fn(event.payload));
                    if (this.unlisten) {
                        this.unlisten();
                    }
                    break;
            }
        });
    }

    on(eventName, listener) {
        if (this.events[eventName]) {
            this.events[eventName].add(listener);
        }
    }

    getDownloadTaskInfo() {
        return this.downloadTaskInfo;
    }
}