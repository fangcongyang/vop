import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";

const root = ReactDOM.createRoot(document.getElementById("root"));

function main() {
    // 异步加载非关键资源
    Promise.all([
        import("virtual:svg-icons-register"),
        import("nprogress/nprogress.css"),
        // 延迟加载 lazysizes，因为它主要用于图片懒加载
        new Promise(resolve => {
            setTimeout(() => {
                Promise.all([
                    import("lazysizes"),
                    import("lazysizes/plugins/parent-fit/ls.parent-fit")
                ]).then(resolve);
            }, 100);
        })
    ]).catch(error => {
        console.warn("Non-critical resources loading failed:", error);
    });
    
    // 立即渲染应用
    import("./App").then(({ default: App }) => {
        root.render(
            <React.StrictMode>
                <App />
            </React.StrictMode>
        );
    }).catch(error => {
        console.error("Failed to load App:", error);
        // 显示错误界面
        root.render(
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: '#f5f5f5',
                color: '#666',
                fontSize: '16px'
            }}>
                应用加载失败，请刷新页面重试
            </div>
        );
    });
}

main();
