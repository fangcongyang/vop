import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "@/store/store";
import "virtual:svg-icons-register";
import "lazysizes";
import "lazysizes/plugins/parent-fit/ls.parent-fit";
import App from "./App";
import "nprogress/nprogress.css";
import "./styles.css";

const root = ReactDOM.createRoot(document.getElementById("root"));

function main() {
    root.render(
        <React.StrictMode>
            <Provider store={store}>
                <App />
            </Provider>
        </React.StrictMode>
    );
}

main();
export { store };
