import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 環境変数で本番でもログを有効化できるようにする
// Railway/本番で `VITE_ENABLE_DEBUG_LOGS=true` を設定すると console.log を削除しません
const enableDebugLogs = process.env.VITE_ENABLE_DEBUG_LOGS === 'true';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
    // 本番環境でのconsole.log削除
    minify: 'terser',
    terserOptions: {
      compress: {
        // 本番環境ではconsole.logとdebuggerを削除（環境変数で制御可能）
        drop_console: !enableDebugLogs,
        drop_debugger: !enableDebugLogs,
        // console.error/warn は残す
        pure_funcs: enableDebugLogs ? [] : ['console.log', 'console.debug', 'console.info'],
      },
      format: {
        // コメントを削除
        comments: false,
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // デプロイ環境での設定
  server: {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      // Prevent HTML caching to avoid stale index.html serving old chunk names
      'Cache-Control': 'no-store',
    },
  },
  preview: {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'no-store',
    },
  },
});