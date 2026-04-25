import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 環境変数で本番でもログを有効化できるようにする
const enableDebugLogs = process.env.VITE_ENABLE_DEBUG_LOGS === 'true';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // ベンダーライブラリを分離してキャッシュ効率を向上
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
    // 本番環境でのconsole削除
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: !enableDebugLogs,
        pure_funcs: enableDebugLogs ? [] : ['console.log', 'console.debug', 'console.info', 'console.warn'],
      },
      format: {
        comments: false,
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  },
  preview: {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  },
});
