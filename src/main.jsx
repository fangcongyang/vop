import React from "react";
import ReactDOM from "react-dom/client";
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
            <App />
        </React.StrictMode>
    );
}

main();
