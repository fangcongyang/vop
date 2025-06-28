export enum GlobalEvent {
    SmallPlayEvent = 'smallPlayEvent',
}

export interface SmallPlayInfo {
    playMode: string;
    playUrl: string;
    playType: string;
    playMovieUq: string;
    currentHistory: any;
    playStateTime: number;
    movie: {
        index: number;
        siteKey: string;
        videoFlag: string;
    };
}