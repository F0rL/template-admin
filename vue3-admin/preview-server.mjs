// 轻量服务器：静态服务 dist/ + /api/* 反向代理到线上后端
// 用于 vite preview 时代替 dev server（避免 dev 优化器卡死）
// 适配 admin-aijoin：访问根路径 /admin/（run.bat 用 --base=./ 构建，资源相对 /admin/ 解析）
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, 'dist')
const PORT = Number(process.env.PORT || 4000)
const MOUNT = '/admin/' // 与 VITE_APP_BASE_URL 保持一致；资源请求须剥掉该前缀再定位 dist 文件
const API_HOST = 'dxlxx.sunjee.cn'
const API_PORT = 89

// ============ API 反向代理 ============
const proxy = http.request.bind(http)
const sendProxy = (req, res) => {
  const opts = {
    host: API_HOST,
    port: API_PORT,
    method: req.method,
    path: req.url,
    headers: { ...req.headers, host: `${API_HOST}:${API_PORT}` }
  }
  const p = proxy(opts, upstream => {
    res.writeHead(upstream.statusCode || 502, upstream.headers)
    upstream.pipe(res)
  })
  p.on('error', e => {
    res.writeHead(502, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ code: 502, msg: 'proxy error: ' + e.message }))
  })
  req.pipe(p)
}

// ============ MIME ============
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.json': 'application/json; charset=utf-8',
  '.map':  'application/json; charset=utf-8'
}
const mime = p => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream'

// 静态资源扩展名：这些路径缺失时必须 404，不能 fallback 成 index.html。
// 否则浏览器拿到 text/html 却按 JS 解析，页面直接白屏
// （重新 build 后 chunk hash 变化时必踩）。
const ASSET_EXT = /\.(js|mjs|css|map|json|svg|png|jpe?g|gif|ico|webp|woff2?|ttf|eot)$/i

// ============ SPA fallback（仅页面路由 → index.html）============
const serveStatic = (req, res) => {
  // 先按 ? 拆分去掉 query，再对 path 段做 URL 解码（chunk 文件名可能含非 ASCII 字符）
  const rawPath = req.url.split('?')[0]
  let url
  try {
    url = decodeURIComponent(rawPath)
  } catch {
    url = rawPath
  }
  // 去掉挂载前缀 /admin/ 得到 dist 内相对路径
  let rel = url.startsWith(MOUNT) ? url.slice(MOUNT.length) : url
  if (rel === '' || rel === '/') rel = 'index.html'
  let fp = path.join(DIST, rel)
  if (!fp.startsWith(DIST)) { res.writeHead(403); return res.end('forbidden') }
  fs.stat(fp, (err, st) => {
    if (err || !st.isFile()) {
      // 静态资源缺失 → 明确 404，便于定位（而不是伪装成 HTML 导致白屏）
      if (ASSET_EXT.test(rel)) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
        return res.end('404 not found: ' + rel)
      }
      // 页面路由 → SPA fallback
      fp = path.join(DIST, 'index.html')
      fs.readFile(fp, (e, buf) => {
        if (e) { res.writeHead(404); return res.end('not found') }
        res.writeHead(200, {
          'content-type': MIME['.html'],
          // 入口页禁止缓存：否则重新 build 后浏览器仍用旧 index.html
          // 去引用已被清掉的旧 chunk，导致动态 import 失败
          'cache-control': 'no-store, must-revalidate',
        })
        res.end(buf)
      })
      return
    }
    res.writeHead(200, { 'content-type': mime(fp), 'cache-control': 'no-cache' })
    fs.createReadStream(fp).pipe(res)
  })
}

const server = http.createServer((req, res) => {
  // CORS 透传（dev 时代由 vite 注入，这里由上游响应头带回）
  if (req.url.startsWith('/api/')) return sendProxy(req, res)
  // favicon
  if (req.url === '/favicon.ico') {
    const ico = path.join(DIST, 'vite.svg')
    if (fs.existsSync(ico)) { res.writeHead(200, { 'content-type': 'image/svg+xml' }); return fs.createReadStream(ico).pipe(res) }
  }
  serveStatic(req, res)
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ admin-aijoin running`)
  console.log(`   Local:   http://localhost:${PORT}${MOUNT}`)
  console.log(`   API:     http://${API_HOST}:${API_PORT} (proxied via /api/*)`)
  console.log(`   Serving: ${DIST}`)
})
