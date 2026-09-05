import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'fs'

export default defineConfig(({ mode }) => {
  // Load environment variables for Vercel
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    root: '.',
    define: {
      // Pass env vars to the browser
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
    },
    plugins: [{
      name: 'copy-assets',
      closeBundle() {
        // === ADMIN DASHBOARD ===
        const adminDir = resolve(__dirname, 'dist/admin-8f7k29x-private-dashboard')
        mkdirSync(adminDir, { recursive: true })
        
        // Copy admin files
        const adminFiles = ['index.html', 'admin.css', 'admin.js']
        adminFiles.forEach(file => {
          const srcPath = resolve(__dirname, 'admin-8f7k29x-private-dashboard', file)
          const destPath = resolve(adminDir, file)
          if (existsSync(srcPath)) {
            copyFileSync(srcPath, destPath)
            console.log(`✅ admin/${file} copied`)
          }
        })

        // === MAIN.JS ===
        const jsDir = resolve(__dirname, 'dist/js')
        mkdirSync(jsDir, { recursive: true })
        const mainJsPath = resolve(__dirname, 'js/main.js')
        if (existsSync(mainJsPath)) {
          copyFileSync(mainJsPath, resolve(jsDir, 'main.js'))
          console.log('✅ main.js copied')
        }

        // === ROOT FILES ===
        const rootFiles = ['pay.js', 'pay.css']
        rootFiles.forEach(file => {
          const srcPath = resolve(__dirname, file)
          const destPath = resolve(__dirname, 'dist', file)
          if (existsSync(srcPath)) {
            copyFileSync(srcPath, destPath)
            console.log(`✅ ${file} copied`)
          }
        })

        // === FOLDERS ===
        const folders = ['types', 'logo', 'font']
        folders.forEach(folder => {
          const srcPath = resolve(__dirname, folder)
          if (existsSync(srcPath)) {
            const destPath = resolve(__dirname, 'dist', folder)
            mkdirSync(destPath, { recursive: true })
            const files = readdirSync(srcPath)
            files.forEach(file => {
              const srcFile = resolve(srcPath, file)
              const destFile = resolve(destPath, file)
              if (existsSync(srcFile)) {
                copyFileSync(srcFile, destFile)
              }
            })
            console.log(`✅ ${folder} folder copied`)
          }
        })

        // === ADMIN LIB FOLDER ===
        const adminLibSrc = resolve(__dirname, 'admin-8f7k29x-private-dashboard/lib')
        if (existsSync(adminLibSrc)) {
          const adminLibDir = resolve(__dirname, 'dist/admin-8f7k29x-private-dashboard/lib')
          mkdirSync(adminLibDir, { recursive: true })
          const libFiles = readdirSync(adminLibSrc)
          libFiles.forEach(file => {
            const srcFile = resolve(adminLibSrc, file)
            const destFile = resolve(adminLibDir, file)
            if (existsSync(srcFile)) {
              copyFileSync(srcFile, destFile)
            }
          })
          console.log('✅ admin lib folder copied')
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
  }
})

// ===== AUTO-DETECT HTML FILES =====
function getHtmlInputs() {
  try {
    const files = readdirSync(resolve(__dirname, '.'))
    const htmlFiles = files.filter(file => file.endsWith('.html'))
    
    const inputs = {}
    
    htmlFiles.forEach(file => {
      const name = file.replace('.html', '')
      inputs[name] = resolve(__dirname, file)
    })
    
    // Add admin/index.html explicitly
    const adminIndexPath = resolve(__dirname, 'admin-8f7k29x-private-dashboard/index.html')
    if (existsSync(adminIndexPath)) {
      inputs['admin-8f7k29x-private-dashboard/index'] = adminIndexPath
    }
    
    return inputs
  } catch (e) {
    // Fallback to minimal inputs if error
    return {
      index: resolve(__dirname, 'index.html')
    }
  }
}