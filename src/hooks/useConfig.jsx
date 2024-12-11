import { useCallback, useEffect } from "react";
import { useGetState } from "./useGetState";
import { store, TauriDataStore, StoreObserver } from "../utils/store";
import { generateUUID } from "@/utils/common";
import { debounce } from "lodash";

export const useConfig = (key, defaultValue, options = { }) => {
    const [property, setPropertyState, getProperty] = useGetState(defaultValue);
    const { sync = true } = options;
    const storeObserver = new StoreObserver(generateUUID());

    // 同步到Store (State -> Store)
    const syncToStore = async (v, isSync) => {
        if (!isSync) return;
        setTimeout(() => { 
            store.set(key, v);
            let eventKey = key.replace('/./g', '_').replace('/@/g', ':');
            store.notifyObservers(eventKey, storeObserver.name, v);
        }, 200);
    }

    // 同步到State (Store -> State)
    const syncToState = useCallback((v) => {
        if (v !== null) {
            setPropertyState(v);
        } else {
            store.get(key).then((value) => {
                if (value === null) {
                    setPropertyState(defaultValue);
                    store.set(key, defaultValue);
                } else {
                    setPropertyState(convertValue(value));
                }
            });
        }
    }, []);

    const convertValue = (v) => {
        if (store instanceof TauriDataStore) return v;
        let newValue = defaultValue;
        switch (typeof defaultValue) {
            case 'boolean':
                newValue = v === 'true';
                break;
            default:
                break;
        }
        return newValue;
    };

    const setProperty = useCallback((v, forceSync = true) => {
        setPropertyState(v);
        const isSync = forceSync && sync;
        syncToStore(v, isSync);
    }, []);

    // 初始化
    useEffect(() => {
        syncToState(null);
        let eventKey = key.replace('/./g', '_').replace('/@/g', ':');
        store.registerObserver(storeObserver);
        storeObserver.on(eventKey, (v) => {
            setProperty(v, false);
        });
        return () => {
            store.removeObserver(storeObserver);
        };
    }, []);

    return [property, setProperty, getProperty];
};
