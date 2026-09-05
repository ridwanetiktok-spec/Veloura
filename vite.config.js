import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, readdirSync, existsSync, writeFileSync } from 'fs'
import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, readdirSync, existsSync, writeFileSync, readFileSync } from 'fs'

export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '')
  
  console.log('🔑 VITE_SUPABASE_URL:', env.VITE_SUPABASE_URL ? '✅ Found' : '❌ Missing')
  
  return {
    root: '.',
    define: {
      // Make env variables available globally
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
      // Also make them available as global variables
      'globalThis.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'globalThis.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
    },
    plugins: [{
      name: 'inject-env',
      transformIndexHtml(html) {
        // Inject environment variables into HTML
        return html.replace(/{{VITE_SUPABASE_URL}}/g, env.VITE_SUPABASE_URL || '')
                   .replace(/{{VITE_SUPABASE_ANON_KEY}}/g, env.VITE_SUPABASE_ANON_KEY || '')
      }
    }, {
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
            let content = readFileSync(srcPath, 'utf8')
            // Replace env placeholders in files
            content = content.replace(/{{VITE_SUPABASE_URL}}/g, env.VITE_SUPABASE_URL || '')
                             .replace(/{{VITE_SUPABASE_ANON_KEY}}/g, env.VITE_SUPABASE_ANON_KEY || '')
            writeFileSync(destPath, content)
            console.log(`✅ admin/${file} copied with env vars injected`)
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
            let content = readFileSync(srcPath, 'utf8')
            content = content.replace(/{{VITE_SUPABASE_URL}}/g, env.VITE_SUPABASE_URL || '')
                             .replace(/{{VITE_SUPABASE_ANON_KEY}}/g, env.VITE_SUPABASE_ANON_KEY || '')
            writeFileSync(destPath, content)
            console.log(`✅ ${file} copied with env vars injected`)
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
              let content = readFileSync(srcFile, 'utf8')
              content = content.replace(/{{VITE_SUPABASE_URL}}/g, env.VITE_SUPABASE_URL || '')
                               .replace(/{{VITE_SUPABASE_ANON_KEY}}/g, env.VITE_SUPABASE_ANON_KEY || '')
              writeFileSync(destFile, content)
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
    return {
      index: resolve(__dirname, 'index.html')
    }
  }
}