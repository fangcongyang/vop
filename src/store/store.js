import { configureStore } from '@reduxjs/toolkit';
import coreReducer from "./coreSlice";
import movieReducer from "./movieSlice";

export const store = configureStore({
    reducer: {
        core: coreReducer,
        movie: movieReducer
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
      serializableCheck: false  
    }),
});