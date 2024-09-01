import { useCallback, useEffect } from "react";
import { useGetState } from "./useGetState";
import { store, TauriDataStore, StoreObserver } from "../utils/store";
import { debounce } from "lodash";

export const useConfig = (key, defaultValue, options = { page: "" }) => {
    const [property, setPropertyState, getProperty] = useGetState(defaultValue);
    const { sync = true } = options;
    const storeObserver = new StoreObserver(options.page);

    // 同步到Store (State -> Store)
    const syncToStore = useCallback(
        debounce(async (v) => {
            store.set(key, v);
        }),
        []
    );

    // 同步到State (Store -> State)
    const syncToState = useCallback((v) => {
        if (v !== null) {
            setPropertyState(v);
        } else {
            // console.log(options.page, key, store)
            store.get(key).then((value) => {
                // console.log(options.page, key, value)
                if (value === null) {
                    setPropertyState(convertValue(value));
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

    const setProperty = useCallback((v, forceSync = false) => {
        setPropertyState(v);
        const isSync = forceSync || sync;
        isSync && syncToStore(v);
    }, []);

    // 初始化
    useEffect(() => {
        syncToState(null);
        store.registerObserver(storeObserver);
        storeObserver.on(key, (v) => {
            setProperty(...v);
        });
        if (key.includes("[")) return;
        return () => {
            store.removeObserver(storeObserver);
        };
    }, []);

    return [property, setProperty, getProperty];
};
