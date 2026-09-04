import { defineConfig } from 'vite'
import { resolve } from 'path'
import { 
  copyFileSync, 
  mkdirSync, 
  readdirSync, 
  statSync,
  existsSync,
  rmdirSync
} from 'fs'

export default defineConfig({
  root: '.',
  plugins: [{
    name: 'copy-all-assets',
    closeBundle() {
      const srcDir = resolve(__dirname, '.')
      const distDir = resolve(__dirname, 'dist')
      
      // ==========================================
      // 1. COPY ALL ROOT FILES (except node_modules, dist, etc.)
      // ==========================================
      const excludeFolders = [
        'node_modules',
        'dist',
        '.git',
        '.vercel',
        '.vscode',
        'admin-8f7k29x-private-dashboard'
      ]
      
      const excludeFiles = [
        'package-lock.json',
        'package.json',
        'vite.config.js',
        '.env',
        '.gitignore',
        'README.md'
      ]
      
      function copyAllFiles(source, destination, basePath = '') {
        const items = readdirSync(source)
        
        items.forEach(item => {
          const srcPath = resolve(source, item)
          const destPath = resolve(destination, item)
          const stats = statSync(srcPath)
          
          // Skip excluded folders/files at root level
          if (basePath === '') {
            if (excludeFolders.includes(item) && stats.isDirectory()) return
            if (excludeFiles.includes(item) && stats.isFile()) return
          }
          
          if (stats.isDirectory()) {
            // Create directory in dist
            if (!existsSync(destPath)) {
              mkdirSync(destPath, { recursive: true })
            }
            // Recursively copy subdirectory
            copyAllFiles(srcPath, destPath, item)
          } else {
            // Copy file
            try {
              copyFileSync(srcPath, destPath)
            } catch (err) {
              console.warn(`⚠️ Could not copy ${item}:`, err.message)
            }
          }
        })
      }
      
      // ==========================================
      // 2. COPY ROOT FILES TO DIST
      // ==========================================
      console.log('📦 Copying all files to dist...')
      copyAllFiles(srcDir, distDir)
      
      // ==========================================
      // 3. COPY ADMIN DASHBOARD (special handling)
      // ==========================================
      try {
        const adminSrc = resolve(__dirname, 'admin-8f7k29x-private-dashboard')
        const adminDist = resolve(distDir, 'admin-8f7k29x-private-dashboard')
        
        if (existsSync(adminSrc)) {
          if (!existsSync(adminDist)) {
            mkdirSync(adminDist, { recursive: true })
          }
          
          // Copy admin.js
          const adminJs = resolve(adminSrc, 'admin.js')
          if (existsSync(adminJs)) {
            copyFileSync(adminJs, resolve(adminDist, 'admin.js'))
          }
          
          // Copy admin.css
          const adminCss = resolve(adminSrc, 'admin.css')
          if (existsSync(adminCss)) {
            copyFileSync(adminCss, resolve(adminDist, 'admin.css'))
          }
          
          // Copy admin index.html
          const adminIndex = resolve(adminSrc, 'index.html')
          if (existsSync(adminIndex)) {
            copyFileSync(adminIndex, resolve(adminDist, 'index.html'))
          }
        }
      } catch (err) {
        console.warn('⚠️ Admin dashboard copy skipped:', err.message)
      }
      
      // ==========================================
      // 4. COPY JS FOLDER
      // ==========================================
      try {
        const jsSrc = resolve(__dirname, 'js')
        const jsDist = resolve(distDir, 'js')
        
        if (existsSync(jsSrc)) {
          if (!existsSync(jsDist)) {
            mkdirSync(jsDist, { recursive: true })
          }
          
          const jsFiles = readdirSync(jsSrc)
          jsFiles.forEach(file => {
            if (file.endsWith('.js')) {
              copyFileSync(
                resolve(jsSrc, file),
                resolve(jsDist, file)
              )
            }
          })
        }
      } catch (err) {
        console.warn('⚠️ JS folder copy skipped:', err.message)
      }
      
      // ==========================================
      // 5. COPY LIB FOLDER (Supabase client)
      // ==========================================
      try {
        const libSrc = resolve(__dirname, 'lib')
        const libDist = resolve(distDir, 'lib')
        
        if (existsSync(libSrc)) {
          if (!existsSync(libDist)) {
            mkdirSync(libDist, { recursive: true })
          }
          
          const libFiles = readdirSync(libSrc)
          libFiles.forEach(file => {
            if (file.endsWith('.js')) {
              copyFileSync(
                resolve(libSrc, file),
                resolve(libDist, file)
              )
            }
          })
        }
      } catch (err) {
        console.warn('⚠️ Lib folder copy skipped:', err.message)
      }
      
      // ==========================================
      // 6. COPY TYPES FOLDER (card icons)
      // ==========================================
      try {
        const typesSrc = resolve(__dirname, 'types')
        const typesDist = resolve(distDir, 'types')
        
        if (existsSync(typesSrc)) {
          if (!existsSync(typesDist)) {
            mkdirSync(typesDist, { recursive: true })
          }
          
          const typesFiles = readdirSync(typesSrc)
          typesFiles.forEach(file => {
            copyFileSync(
              resolve(typesSrc, file),
              resolve(typesDist, file)
            )
          })
        }
      } catch (err) {
        console.warn('⚠️ Types folder copy skipped:', err.message)
      }
      
      // ==========================================
      // 7. COPY FONT FOLDER
      // ==========================================
      try {
        const fontSrc = resolve(__dirname, 'font')
        const fontDist = resolve(distDir, 'font')
        
        if (existsSync(fontSrc)) {
          if (!existsSync(fontDist)) {
            mkdirSync(fontDist, { recursive: true })
          }
          
          const fontFiles = readdirSync(fontSrc)
          fontFiles.forEach(file => {
            copyFileSync(
              resolve(fontSrc, file),
              resolve(fontDist, file)
            )
          })
        }
      } catch (err) {
        console.warn('⚠️ Font folder copy skipped:', err.message)
      }
      
      // ==========================================
      // 8. COPY LOGO FOLDER
      // ==========================================
      try {
        const logoSrc = resolve(__dirname, 'logo')
        const logoDist = resolve(distDir, 'logo')
        
        if (existsSync(logoSrc)) {
          if (!existsSync(logoDist)) {
            mkdirSync(logoDist, { recursive: true })
          }
          
          const logoFiles = readdirSync(logoSrc)
          logoFiles.forEach(file => {
            copyFileSync(
              resolve(logoSrc, file),
              resolve(logoDist, file)
            )
          })
        }
      } catch (err) {
        console.warn('⚠️ Logo folder copy skipped:', err.message)
      }
      
      // ==========================================
      // 9. COPY CSS FOLDER
      // ==========================================
      try {
        const cssSrc = resolve(__dirname, 'css')
        const cssDist = resolve(distDir, 'css')
        
        if (existsSync(cssSrc)) {
          if (!existsSync(cssDist)) {
            mkdirSync(cssDist, { recursive: true })
          }
          
          const cssFiles = readdirSync(cssSrc)
          cssFiles.forEach(file => {
            if (file.endsWith('.css')) {
              copyFileSync(
                resolve(cssSrc, file),
                resolve(cssDist, file)
              )
            }
          })
        }
      } catch (err) {
        console.warn('⚠️ CSS folder copy skipped:', err.message)
      }
      
      console.log('✅ All files copied successfully!')
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