import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    // 当前环境的 safe-delete 会拦截 Vite 清空 dist；改为覆盖写入，旧 hash 资源保留但不影响入口引用。
    emptyOutDir: false
  },
  server: {
    port: 5173
  },
  preview: {
    port: 4173
  }
});
