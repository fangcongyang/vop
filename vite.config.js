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
    
    // 构建优化
    build: {
        rollupOptions: {
            output: {
                // 代码分割策略
                manualChunks: {
                    // 将 React 相关库分离
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    // 将 Ant Design 分离
                    'antd-vendor': ['antd', '@ant-design/icons'],
                    // 将 Tauri API 分离
                    'tauri-vendor': [
                        '@tauri-apps/api',
                        '@tauri-apps/plugin-dialog',
                        '@tauri-apps/plugin-fs',
                        '@tauri-apps/plugin-http',
                        '@tauri-apps/plugin-os',
                        '@tauri-apps/plugin-process',
                        '@tauri-apps/plugin-shell',
                        '@tauri-apps/plugin-store',
                        '@tauri-apps/plugin-updater'
                    ],
                    // 将工具库分离
                    'utils-vendor': ['lodash', 'axios', 'cheerio', 'marked']
                }
            }
        },
        // 启用 gzip 压缩
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: mode === 'production',
                drop_debugger: mode === 'production'
            }
        }
    },

    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },

    // 优化依赖预构建
    optimizeDeps: {
        include: [
            'react',
            'react-dom',
            'react-router-dom',
            'antd',
            '@ant-design/icons',
            'axios',
            'lodash'
        ],
        exclude: [
            // 排除 Tauri 相关包，因为它们在浏览器环境中不可用
            '@tauri-apps/api',
            '@tauri-apps/plugin-dialog',
            '@tauri-apps/plugin-fs',
            '@tauri-apps/plugin-http',
            '@tauri-apps/plugin-os',
            '@tauri-apps/plugin-process',
            '@tauri-apps/plugin-shell',
            '@tauri-apps/plugin-store',
            '@tauri-apps/plugin-updater'
        ]
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
        // 启用预热
        warmup: {
            clientFiles: ['./src/App.jsx', './src/main.jsx']
        },
        proxy: {
            "/api": {
                target: loadEnv(mode, process.cwd()).VITE_VOP_API,
                changeOrigin: true, // 允许跨域
                rewrite: (path) => path.replace(/^\/api/, "api"),
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
