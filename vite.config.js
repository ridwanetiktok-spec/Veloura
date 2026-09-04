import { defineConfig } from 'vite'
import { resolve } from 'path'
import { copyFileSync, mkdirSync } from 'fs'

export default defineConfig({
  root: '.',
  plugins: [{
    name: 'copy-admin-script',
    closeBundle() {
      const outputDirectory = resolve(__dirname, 'dist/admin-8f7k29x-private-dashboard')
      mkdirSync(outputDirectory, { recursive: true })
      copyFileSync(
        resolve(__dirname, 'admin-8f7k29x-private-dashboard/admin.js'),
        resolve(outputDirectory, 'admin.js')
      )
    }
  }],
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin-8f7k29x-private-dashboard/index.html'),
        shop: resolve(__dirname, 'shop.html'),
        blog: resolve(__dirname, 'blog.html'),
        privacy: resolve(__dirname, 'privacy-policy.html'),
        terms: resolve(__dirname, 'terms-of-service.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      '@admin': resolve(__dirname, 'admin-8f7k29x-private-dashboard'),
      '@lib': resolve(__dirname, 'lib'),
      '@js': resolve(__dirname, 'js'),
      '@css': resolve(__dirname, 'css')
    }
  }
})