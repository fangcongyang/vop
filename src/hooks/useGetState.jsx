import { useState, useRef, useCallback } from "react";

export const useGetState = (initState) => {
    const [state, setState] = useState(initState);
    const stateRef = useRef(state);
    stateRef.current = state;
    const setValue = (value) => {
        if (typeof value === "function") {
            setState((prevState) => {
                const d = value(prevState);
                stateRef.current = d;
                return d;
            });
        } else {
            setState(value);
            stateRef.current = value;
        }
    };
    const getState = useCallback(() => stateRef.current, []);
    return [state, setValue, getState];
};
