import { defineConfig } from 'vite'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, readdirSync } from 'fs'

export default defineConfig({
  root: '.',
  plugins: [{
    name: 'copy-assets',
    closeBundle() {
      // === ADMIN DASHBOARD ===
      const adminDir = resolve(__dirname, 'dist/admin-8f7k29x-private-dashboard')
      mkdirSync(adminDir, { recursive: true })
      copyFileSync(
        resolve(__dirname, 'admin-8f7k29x-private-dashboard/admin.js'),
        resolve(adminDir, 'admin.js')
      )

      // === MAIN.JS ===
      const jsDir = resolve(__dirname, 'dist/js')
      mkdirSync(jsDir, { recursive: true })
      copyFileSync(
        resolve(__dirname, 'js/main.js'),
        resolve(jsDir, 'main.js')
      )

      // ==========================================
      // ✅ ADD THESE: Only what's missing
      // ==========================================

      // === PAY.JS (Root level) ===
      try {
        copyFileSync(
          resolve(__dirname, 'pay.js'),
          resolve(__dirname, 'dist/pay.js')
        )
        console.log('✅ pay.js copied')
      } catch (e) {
        console.log('⚠️ pay.js not found')
      }

      // === PAY.CSS (Root level) ===
      try {
        copyFileSync(
          resolve(__dirname, 'pay.css'),
          resolve(__dirname, 'dist/pay.css')
        )
        console.log('✅ pay.css copied')
      } catch (e) {
        console.log('⚠️ pay.css not found')
      }

      // === TYPES FOLDER (Card icons) ===
      try {
        const typesDir = resolve(__dirname, 'dist/types')
        mkdirSync(typesDir, { recursive: true })
        const typesFiles = readdirSync(resolve(__dirname, 'types'))
        typesFiles.forEach(file => {
          copyFileSync(
            resolve(__dirname, 'types', file),
            resolve(typesDir, file)
          )
        })
        console.log('✅ types folder copied')
      } catch (e) {
        console.log('⚠️ types folder not found')
      }

      // === LOGO FOLDER ===
      try {
        const logoDir = resolve(__dirname, 'dist/logo')
        mkdirSync(logoDir, { recursive: true })
        const logoFiles = readdirSync(resolve(__dirname, 'logo'))
        logoFiles.forEach(file => {
          copyFileSync(
            resolve(__dirname, 'logo', file),
            resolve(logoDir, file)
          )
        })
        console.log('✅ logo folder copied')
      } catch (e) {
        console.log('⚠️ logo folder not found')
      }

      // === FONT FOLDER ===
      try {
        const fontDir = resolve(__dirname, 'dist/font')
        mkdirSync(fontDir, { recursive: true })
        const fontFiles = readdirSync(resolve(__dirname, 'font'))
        fontFiles.forEach(file => {
          copyFileSync(
            resolve(__dirname, 'font', file),
            resolve(fontDir, file)
          )
        })
        console.log('✅ font folder copied')
      } catch (e) {
        console.log('⚠️ font folder not found')
      }
    }
  }],
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: getHtmlInputs()
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