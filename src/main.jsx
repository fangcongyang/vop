import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "@/store/store";
import "virtual:svg-icons-register";
import "lazysizes";
import "lazysizes/plugins/parent-fit/ls.parent-fit";
import { initDB } from "@/db";
import { initEnv } from "@/utils/env";
import App from "./App";
import "nprogress/nprogress.css";
import "./styles.css";

const root = ReactDOM.createRoot(document.getElementById("root"));

function main() {
    initDB().then(() => {
        root.render(
            <React.StrictMode>
                <Provider store={store}>
                    <App />
                </Provider>
            </React.StrictMode>
        );
    });
}

initEnv().then(() => {
    main();
})
export { store };
