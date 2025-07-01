import { Store, load } from "@tauri-apps/plugin-store";
import { type } from "@tauri-apps/plugin-os";
import { appConfigDir, join } from "@tauri-apps/api/path";

export class StoreObserver {
    private _name: string;
    private _listeners: Record<string, Set<Function>>;

    constructor(name: string) {
        this._name = name;
        this._listeners = {};
    }

    on(eventName: string, listener: Function) {
        if (!this._listeners[eventName]) {
            this._listeners[eventName] = new Set();
        }
        this._listeners[eventName].add(listener);
    }

    emit(eventName: string, value: any) {
        this._listeners[eventName]?.forEach((listener) => {
            listener(value);
        });
    }

    get name() {
        return this._name;
    }
}

// 播放器专题
export interface StoreSubject {
    // 注册播放器观察者
    registerObserver(observer: StoreObserver): void;
    // 移除播放器观察者
    removeObserver(observer: StoreObserver): void;
    // 播放器通知观察者
    notifyObservers(eventName: string, observerName: string, value: any): void;
}

interface DataStore extends StoreSubject {
    _store?: any;
    _observers: Set<StoreObserver>;
    _init(): Promise<void>;
    set(key: string, value: any): void;
    get(key: string): Promise<any>;
}

export class TauriDataStore implements DataStore, StoreSubject {
    _store: Store | undefined;
    _observers: Set<StoreObserver>;
    private _initialized: boolean = false;
    private _initPromise: Promise<void> | null = null;

    constructor() {
        this._store = undefined;
        this._observers = new Set();
    }

    async _init(): Promise<void> {
        if (this._initialized) {
            return;
        }
        
        if (this._initPromise) {
            return this._initPromise;
        }
        
        this._initPromise = this._doInit();
        await this._initPromise;
        this._initialized = true;
    }
    
    private async _doInit(): Promise<void> {
        const appConfigDirPath = await appConfigDir();
        const appConfigPath = await join(appConfigDirPath, "vop.json");
        this._store = await load(appConfigPath, { autoSave: false });
    }

    async set(key: string, value: any) {
        await this._init();
        this._store?.set(key, value);
        this._store?.save();
    }

    async get(key: string): Promise<any> {
        await this._init();
        return this._store?.get(key);
    }

    registerObserver(observer: StoreObserver): void {
        this._observers.add(observer);
    }

    removeObserver(observer: StoreObserver): void {
        this._observers.delete(observer);
    }

    notifyObservers(eventName: string, observerName: string, value: any): void {
        for (const observer of this._observers) {
            if (observer.name !== observerName) {
                try {
                    observer.emit(eventName, value);
                } catch (error) {
                    console.error(`Error emitting event for observer ${observer.name}:`, error);
                }
            }
        }        
    }
}

class LocalDataStore implements DataStore, StoreSubject {
    _observers: Set<StoreObserver>;

    constructor() {
        this._observers = new Set();
    }
    _store?: any;

    _init(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    set(key: string, value: any) {
        localStorage.setItem(key, value);
    }

    get(key: string): Promise<any> {
        return new Promise((resolve) => {
            const value = localStorage.getItem(key);
            if (value) {
                resolve(value);
            } else {
                resolve(null);
            }
        });
    }

    registerObserver(observer: StoreObserver): void {
        this._observers.add(observer);
    }

    removeObserver(observer: StoreObserver): void {
        this._observers.delete(observer);
    }

    notifyObservers(
        eventName: string,
        observerName: string,
        value: any
    ): void {
        Array.from(this._observers)
            .filter((observer) => observer.name !== observerName)
            .forEach((observer) => {
                observer.emit(eventName, value);
            });
    }
}

// 为了向后兼容，保留同步的store导出（但建议使用storePromise）
export const store: DataStore = (() => {
    try {
        type();
        return new TauriDataStore(); // 注意：此时可能未完全初始化
    } catch {
        console.log("use LocalDataStore");
        return new LocalDataStore();
    }
})();