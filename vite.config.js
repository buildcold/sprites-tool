import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import { copyFileSync, existsSync, mkdirSync } from 'fs'

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
  plugins: [react(), wasm(), topLevelAwait(), {
    name: 'copy-ffmpeg',
    buildStart() {
      const srcDir = resolve(__dirname, 'node_modules/@ffmpeg/core/dist/esm')
      const destDir = resolve(__dirname, 'public/ffmpeg')

      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true })
      }

      const files = ['ffmpeg-core.js', 'ffmpeg-core.wasm']
      files.forEach(file => {
        const src = resolve(srcDir, file)
        const dest = resolve(destDir, file)
        if (existsSync(src)) {
          copyFileSync(src, dest)
        }
      })
    }
  }],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/core'],
  },
})