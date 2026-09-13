import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // 画像解析・来歴確認用SDKを含むため、既定値より現実的な警告閾値にする。
    chunkSizeWarningLimit: 1500,
  },
})
