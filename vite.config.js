import { defineConfig } from 'vite'
import { resolve } from 'path'
import { 
  copyFileSync, 
  mkdirSync, 
  readdirSync, 
  statSync,
  existsSync,
  writeFileSync
} from 'fs'

export default defineConfig({
  root: '.',
  define: {
    // ✅ Pass environment variables to the build
    'process.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
    'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL),
    'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY),
    // ✅ Also make them available as import.meta.env
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
  },
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
        '.vscode'
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
          
          if (basePath === '') {
            if (excludeFolders.includes(item) && stats.isDirectory()) return
            if (excludeFiles.includes(item) && stats.isFile()) return
          }
          
          if (stats.isDirectory()) {
            if (!existsSync(destPath)) {
              mkdirSync(destPath, { recursive: true })
            }
            copyAllFiles(srcPath, destPath, item)
          } else {
            try {
              copyFileSync(srcPath, destPath)
            } catch (err) {
              console.warn(`⚠️ Could not copy ${item}:`, err.message)
            }
          }
        })
      }
      
      console.log('📦 Copying all files to dist...')
      copyAllFiles(srcDir, distDir)
      
      // ==========================================
      // 2. COPY ADMIN DASHBOARD
      // ==========================================
      try {
        const adminSrc = resolve(__dirname, 'admin-8f7k29x-private-dashboard')
        const adminDist = resolve(distDir, 'admin-8f7k29x-private-dashboard')
        
        if (existsSync(adminSrc)) {
          if (!existsSync(adminDist)) {
            mkdirSync(adminDist, { recursive: true })
          }
          
          const adminFiles = ['admin.js', 'admin.css', 'index.html']
          adminFiles.forEach(file => {
            const src = resolve(adminSrc, file)
            if (existsSync(src)) {
              copyFileSync(src, resolve(adminDist, file))
            }
          })
        }
      } catch (err) {
        console.warn('⚠️ Admin dashboard copy skipped:', err.message)
      }
      
      // ==========================================
      // 3. COPY JS FOLDER
      // ==========================================
      try {
        const jsSrc = resolve(__dirname, 'js')
        const jsDist = resolve(distDir, 'js')
        if (existsSync(jsSrc)) {
          if (!existsSync(jsDist)) mkdirSync(jsDist, { recursive: true })
          readdirSync(jsSrc).forEach(file => {
            if (file.endsWith('.js')) {
              copyFileSync(resolve(jsSrc, file), resolve(jsDist, file))
            }
          })
        }
      } catch (err) {
        console.warn('⚠️ JS folder copy skipped:', err.message)
      }
      
      // ==========================================
      // 4. COPY LIB FOLDER
      // ==========================================
      try {
        const libSrc = resolve(__dirname, 'lib')
        const libDist = resolve(distDir, 'lib')
        if (existsSync(libSrc)) {
          if (!existsSync(libDist)) mkdirSync(libDist, { recursive: true })
          readdirSync(libSrc).forEach(file => {
            if (file.endsWith('.js')) {
              copyFileSync(resolve(libSrc, file), resolve(libDist, file))
            }
          })
        }
      } catch (err) {
        console.warn('⚠️ Lib folder copy skipped:', err.message)
      }
      
      // ==========================================
      // 5. COPY TYPES FOLDER
      // ==========================================
      try {
        const typesSrc = resolve(__dirname, 'types')
        const typesDist = resolve(distDir, 'types')
        if (existsSync(typesSrc)) {
          if (!existsSync(typesDist)) mkdirSync(typesDist, { recursive: true })
          readdirSync(typesSrc).forEach(file => {
            copyFileSync(resolve(typesSrc, file), resolve(typesDist, file))
          })
        }
      } catch (err) {
        console.warn('⚠️ Types folder copy skipped:', err.message)
      }
      
      // ==========================================
      // 6. COPY FONT FOLDER
      // ==========================================
      try {
        const fontSrc = resolve(__dirname, 'font')
        const fontDist = resolve(distDir, 'font')
        if (existsSync(fontSrc)) {
          if (!existsSync(fontDist)) mkdirSync(fontDist, { recursive: true })
          readdirSync(fontSrc).forEach(file => {
            copyFileSync(resolve(fontSrc, file), resolve(fontDist, file))
          })
        }
      } catch (err) {
        console.warn('⚠️ Font folder copy skipped:', err.message)
      }
      
      // ==========================================
      // 7. COPY LOGO FOLDER
      // ==========================================
      try {
        const logoSrc = resolve(__dirname, 'logo')
        const logoDist = resolve(distDir, 'logo')
        if (existsSync(logoSrc)) {
          if (!existsSync(logoDist)) mkdirSync(logoDist, { recursive: true })
          readdirSync(logoSrc).forEach(file => {
            copyFileSync(resolve(logoSrc, file), resolve(logoDist, file))
          })
        }
      } catch (err) {
        console.warn('⚠️ Logo folder copy skipped:', err.message)
      }
      
      // ==========================================
      // 8. COPY CSS FOLDER
      // ==========================================
      try {
        const cssSrc = resolve(__dirname, 'css')
        const cssDist = resolve(distDir, 'css')
        if (existsSync(cssSrc)) {
          if (!existsSync(cssDist)) mkdirSync(cssDist, { recursive: true })
          readdirSync(cssSrc).forEach(file => {
            if (file.endsWith('.css')) {
              copyFileSync(resolve(cssSrc, file), resolve(cssDist, file))
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