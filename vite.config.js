import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { internalIpV4 } from "internal-ip";
import { createSvgIconsPlugin } from "vite-plugin-svg-icons";
import path from "path";

const mobile = !!/android|ios/.exec(process.env.TAURI_ENV_PLATFORM);

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => ({
    plugins: [
        react(),
        createSvgIconsPlugin({
            // 指定需要缓存的图标文件夹
            iconDirs: [path.resolve(__dirname, "./src/assets/icons")],
            // 指定symbolId格式
            symbolId: "icon-[dir]-[name]",
            // 自定义插入位置
            inject: "body-last",
            customDomId: "__svg__icons__dom__",
        }),
    ],

    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
        port: 2420,
        strictPort: true,
        host: mobile ? "0.0.0.0" : "0.0.0.0",
        proxy: {
            "/vopApi": {
                target: loadEnv(mode, process.cwd()).VITE_VOP_API,
                changeOrigin: true, // 允许跨域
                rewrite: (path) => path.replace(/^\/vopApi/, ""),
            },
        },
        hmr: mobile
            ? {
                  protocol: "ws",
                  host: await internalIpV4(),
                  port: 1421,
              }
            : undefined,
        watch: {
            // 3. tell vite to ignore watching `src-tauri`
            ignored: ["**/src-tauri/**"],
        },
    },
}));
