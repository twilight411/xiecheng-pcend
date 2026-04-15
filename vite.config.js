import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Vercel 构建环境会设置 VERCEL=1，用于公开演示免登录（可用 VITE_PUBLIC_DEMO=false 关闭）
  define: {
    __VERCEL_BUILD__: JSON.stringify(process.env.VERCEL === '1'),
  },
})
