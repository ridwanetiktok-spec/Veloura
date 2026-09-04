import { defineConfig } from 'vite'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, readdirSync } from 'fs'

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
      const publicScriptDirectory = resolve(__dirname, 'dist/js')
      mkdirSync(publicScriptDirectory, { recursive: true })
      copyFileSync(
        resolve(__dirname, 'js/main.js'),
        resolve(publicScriptDirectory, 'main.js')
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
      input: getHtmlInputs() // ← Auto-detects all HTML files!
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

// ===== AUTO-DETECT HTML FILES =====
function getHtmlInputs() {
  const files = readdirSync(resolve(__dirname, '.'))
  const htmlFiles = files.filter(file => file.endsWith('.html'))
  
  const inputs = {}
  
  htmlFiles.forEach(file => {
    const name = file.replace('.html', '')
    inputs[name] = resolve(__dirname, file)
  })
  
  return inputs
}