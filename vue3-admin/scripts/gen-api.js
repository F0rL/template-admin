/**
 * gen-api — 接口同步脚本
 *
 * 从 src/api/swagger.json 按控制器（路径 /api/{Controller}/{Action} 前缀）读取接口，
 * 按项目架构生成 / 增量同步 src/api/ 下的接口文件。
 *
 * 用法：
 *   node scripts/gen-api.js <Controller>          # 生成/合并单个控制器（如 SysUser、PcPatrol）
 *   node scripts/gen-api.js <Controller> --force  # 不合并，整体覆盖（会丢失手写响应类型）
 *   node scripts/gen-api.js --all                 # 处理全部控制器
 *   node scripts/gen-api.js --help                # 显示帮助
 *
 * 或通过 pnpm：pnpm gen:api <Controller> [--all] [--force]
 *
 * 说明：
 *   - 响应类型一律生成 unknown，需手动补；合并时保留已手写的响应泛型。
 *   - 合并以 URL 为身份标识；接口在 swagger 中已删除会被标注 // [stale] 不在 swagger 中。
 *   - 系统控制器写入 src/api/system/，其余写入 src/api/ 顶层。
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ADMIN_ROOT = resolve(__dirname, '..')
const SWAGGER_PATH = join(ADMIN_ROOT, 'src', 'api', 'swagger.json')
const API_DIR = join(ADMIN_ROOT, 'src', 'api')

const SYSTEM_CONTROLLERS = new Set([
  'Auth', 'WxWork', 'WxWorkThirdParty', 'SysUser', 'SysRole', 'SysMenu', 'SysLog',
  'SysSetting', 'SysOrg', 'SysRolePerm', 'SysDataMaintenance', 'SysFile',
])

// ============ swagger 解析 ============

function controllerOf(path) {
  return path.replace(/^\/+/, '').split('/')[1]
}

function actionOf(path) {
  return path.replace(/^\/+/, '').split('/')[2]
}

export function loadSwagger(path = SWAGGER_PATH) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function listControllers(swagger) {
  const set = new Set()
  for (const p of Object.keys(swagger.paths)) set.add(controllerOf(p))
  return [...set].sort()
}

export function getControllerOperations(swagger, controller) {
  const ops = []
  for (const [path, methods] of Object.entries(swagger.paths)) {
    if (controllerOf(path) !== controller) continue
    for (const [method, op] of Object.entries(methods)) {
      if (!['get', 'post', 'put', 'delete', 'patch'].includes(method)) continue
      ops.push({
        method,
        action: actionOf(path),
        url: path.replace(/^\/api/, ''),
        summary: op.summary || '',
        parameters: op.parameters || [],
        requestBody: op.requestBody || null,
      })
    }
  }
  return ops
}

// ============ schema -> TS 类型 ============

function collectRefs(schema, ctx) {
  if (!schema) return
  if (schema.$ref) {
    ctx.refs.add(schema.$ref.split('/').pop())
    return
  }
  if (schema.items) collectRefs(schema.items, ctx)
  if (schema.properties) Object.values(schema.properties).forEach((v) => collectRefs(v, ctx))
  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') collectRefs(schema.additionalProperties, ctx)
  if (schema.allOf) schema.allOf.forEach((s) => collectRefs(s, ctx))
  if (schema.oneOf) schema.oneOf.forEach((s) => collectRefs(s, ctx))
}

function schemaToTs(schema, ctx) {
  if (!schema) return 'unknown'
  let t
  if (schema.$ref) {
    t = schema.$ref.split('/').pop()
    ctx.refs.add(t)
  } else if (schema.enum) {
    t = schema.enum.map((v) => (typeof v === 'string' ? `'${v}'` : String(v))).join(' | ')
  } else if (schema.type === 'array') {
    t = `${schemaToTs(schema.items, ctx)}[]`
  } else if (schema.allOf) {
    t = schema.allOf.map((s) => schemaToTs(s, ctx)).join(' & ')
  } else if (schema.oneOf) {
    t = schema.oneOf.map((s) => schemaToTs(s, ctx)).join(' | ')
  } else if (schema.type === 'object') {
    if (schema.properties) {
      const req = schema.required || []
      t = `{\n${Object.entries(schema.properties)
        .map(([k, v]) => `  ${k}${req.includes(k) ? '' : '?'}: ${schemaToTs(v, ctx)}`)
        .join('\n')}\n}`
    } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      t = `Record<string, ${schemaToTs(schema.additionalProperties, ctx)}>`
    } else {
      t = 'Record<string, unknown>'
    }
  } else if (schema.type === 'string') {
    t = 'string'
  } else if (schema.type === 'integer' || schema.type === 'number') {
    t = 'number'
  } else if (schema.type === 'boolean') {
    t = 'boolean'
  } else {
    t = 'unknown'
  }
  return schema.nullable ? `${t} | null` : t
}

export function emitSchemaDeclaration(name, schema, ctx) {
  const desc = schema.description ? `/** ${schema.description.split('\n')[0]} */\n` : ''
  if (schema.properties && (schema.type === 'object' || !schema.type)) {
    const req = schema.required || []
    const body = Object.entries(schema.properties)
      .map(([k, v]) => `  ${k}${req.includes(k) ? '' : '?'}: ${schemaToTs(v, ctx)}`)
      .join('\n')
    return `${desc}export interface ${name} {\n${body}\n}`
  }
  if (schema.enum) {
    const names = schema['x-enumNames'] ? ` // ${schema['x-enumNames'].join(' | ')}` : ''
    const union = schema.enum.map((v) => (typeof v === 'string' ? `'${v}'` : String(v))).join(' | ')
    return `${desc}export type ${name} = ${union}${names}`
  }
  return `${desc}export type ${name} = ${schemaToTs(schema, ctx)}`
}

export function collectRequestSchemaNames(swagger, ops) {
  const schemas = swagger.components.schemas
  const refs = new Set()
  const ctx = { refs }
  for (const op of ops) {
    const body = op.requestBody?.content?.['application/json']?.schema
    if (body) collectRefs(body, ctx)
    for (const p of op.parameters) if (p.schema) collectRefs(p.schema, ctx)
  }
  const queue = [...refs]
  while (queue.length) {
    const name = queue.shift()
    const def = schemas[name]
    if (!def) continue
    collectRefs(def, ctx)
    for (const r of ctx.refs) {
      if (!refs.has(r)) { refs.add(r); queue.push(r) }
    }
  }
  return [...refs]
}

function stripGet(a) { return a.startsWith('Get') ? a.slice(3) : a }
function lowerFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1) }

export function classifyOp(op) {
  if (op.method === 'get') return { kind: 'fetch', name: 'fetch' + stripGet(op.action), viaPost: false }
  if (op.action.startsWith('Get')) return { kind: 'fetch', name: 'fetch' + stripGet(op.action), viaPost: true }
  const map = [
    ['Create', 'create'], ['Add', 'create'],
    ['Update', 'update'], ['Edit', 'update'],
    ['Delete', 'delete'], ['Remove', 'delete'],
    ['Reset', 'reset'],
  ]
  for (const [pre, verb] of map) {
    if (op.action.startsWith(pre)) return { kind: 'write', name: verb + op.action.slice(pre.length) }
  }
  return { kind: 'write', name: lowerFirst(op.action) }
}

function paramInterfaceName(action) {
  return stripGet(action) + 'Params'
}

function generateParamsInterface(action, parameters, ctx) {
  if (!parameters.length) return null
  const name = paramInterfaceName(action)
  const fields = parameters
    .map((p) => `  ${p.name}${p.required ? '' : '?'}: ${schemaToTs(p.schema, ctx)}`)
    .join('\n')
  return { name, text: `export interface ${name} {\n${fields}\n}` }
}

function jsDoc(op) {
  return op.summary ? `/** ${op.summary} */\n` : ''
}

function generateFunction(op, responseType) {
  const cls = classifyOp(op)
  const isUnknown = !responseType
  const resp = responseType || 'unknown'
  if (cls.kind === 'fetch') {
    const hasQuery = op.parameters.length > 0
    const bodySchema = op.requestBody?.content?.['application/json']?.schema
    const bodyType = bodySchema?.$ref ? bodySchema.$ref.split('/').pop() : null
    const todo = isUnknown ? '// TODO: 手动补响应类型\n' : ''
    let sig, call
    if (cls.viaPost) {
      if (bodyType) {
        sig = `data?: ${bodyType}, signal?: AbortSignal`
        call = `apiPost<${resp}>('${op.url}', data, { signal })`
      } else if (hasQuery) {
        sig = `params?: ${paramInterfaceName(op.action)}, signal?: AbortSignal`
        call = `apiPost<${resp}>('${op.url}', params, { signal })`
      } else {
        sig = 'signal?: AbortSignal'
        call = `apiPost<${resp}>('${op.url}', {}, { signal })`
      }
    } else {
      sig = hasQuery
        ? `params?: ${paramInterfaceName(op.action)}, signal?: AbortSignal`
        : 'signal?: AbortSignal'
      call = `apiGet<${resp}>('${op.url}', ${hasQuery ? '{ params, signal }' : '{ signal }'})`
    }
    return `${todo}${jsDoc(op)}export function ${cls.name}(${sig}) {\n  return ${call}\n}`
  }
  const bodySchema = op.requestBody?.content?.['application/json']?.schema
  const bodyType = bodySchema?.$ref ? bodySchema.$ref.split('/').pop() : null
  if (bodyType) {
    return `${jsDoc(op)}export function ${cls.name}(data: ${bodyType}) {\n  return apiPost('${op.url}', data)\n}`
  }
  return `${jsDoc(op)}export function ${cls.name}() {\n  return apiPost('${op.url}', {})\n}`
}

function importLine(ops) {
  const needsGet = ops.some((o) => { const c = classifyOp(o); return c.kind === 'fetch' && !c.viaPost })
  const needsPost = ops.some((o) => { const c = classifyOp(o); return c.kind === 'write' || c.viaPost })
  const parts = []
  if (needsGet) parts.push('apiGet')
  if (needsPost) parts.push('apiPost')
  return `import { ${parts.join(', ')} } from '@/utils/http'`
}

function generateQueryKeys(controller, ops) {
  const key = lowerFirst(controller) + 'Keys'
  const hasList = ops.some((o) => classifyOp(o).kind === 'fetch' && o.action.includes('List'))
  let text = `export const ${key} = {\n  all: ['${lowerFirst(controller)}'] as const,\n`
  if (hasList) text += `  lists: () => [...${key}.all, 'list'] as const,\n`
  text += '}'
  return text
}

// ============ 增量合并 ============

function splitSections(content) {
  const out = {}
  const re = /\/\/\s*=+\s*([^=]+?)\s*=+\s*/g
  let last = { name: '_pre', start: 0 }
  for (const m of content.matchAll(re)) {
    out[last.name] = content.slice(last.start, m.index)
    last = { name: m[1].trim(), start: m.index + m[0].length }
  }
  out[last.name] = content.slice(last.start)
  return out
}

function splitBlocks(section) {
  const blocks = []
  const re = /(?:\/\*\*[\s\S]*?\*\/\s*)?export\s+\w+/g
  const starts = []
  let m
  while ((m = re.exec(section))) starts.push(m.index)
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i]
    const end = i + 1 < starts.length ? starts[i + 1] : section.length
    blocks.push(section.slice(start, end).trim())
  }
  return blocks.filter(Boolean)
}

export function parseExisting(content) {
  const sections = splitSections(content)
  const typesSection = sections['Types'] || ''
  const funcsSection = sections['API Functions'] || ''
  const keysSection = sections['Query Keys'] || ''

  const userTypes = []
  for (const block of splitBlocks(typesSection)) {
    const m = block.match(/export\s+(?:interface|type|enum)\s+(\w+)/)
    if (m) userTypes.push({ name: m[1], text: block })
  }

  const functions = new Map()
  for (const block of splitBlocks(funcsSection)) {
    const m = block.match(/(?:apiGet|apiPost)<([^>]+)>\(\s*['"]([^'"]+)['"]/)
    if (m) functions.set(m[2], { responseType: m[1], text: block })
  }

  return { userTypes, functions, queryKeysText: keysSection.trim() || null }
}

// ============ 文件内容生成 ============

export function generateFileContent(swagger, controller, existingContent = null) {
  const ops = getControllerOperations(swagger, controller)
  if (!ops.length) return null
  const schemas = swagger.components.schemas
  const ctx = { refs: new Set() }

  const schemaNames = collectRequestSchemaNames(swagger, ops)
  const requestTypeNames = new Set(schemaNames)

  const paramInterfaces = []
  for (const op of ops) {
    if ((op.method === 'get' || op.action.startsWith('Get')) && op.parameters.length) {
      const pi = generateParamsInterface(op.action, op.parameters, ctx)
      paramInterfaces.push(pi)
      requestTypeNames.add(pi.name)
    }
  }

  const existing = existingContent ? parseExisting(existingContent) : null
  const responseMap = existing ? existing.functions : new Map()
  const userTypes = existing ? existing.userTypes.filter((t) => !requestTypeNames.has(t.name)) : []
  const queryKeysText = existing ? existing.queryKeysText : null

  const typeLines = []
  for (const name of schemaNames) {
    const def = schemas[name]
    if (def) typeLines.push(emitSchemaDeclaration(name, def, ctx))
  }
  for (const pi of paramInterfaces) typeLines.push(pi.text)
  for (const t of userTypes) typeLines.push(t.text)

  const opUrls = new Set(ops.map((o) => o.url))
  const funcLines = []
  for (const op of ops) {
    const existingFn = responseMap.get(op.url)
    funcLines.push(generateFunction(op, existingFn ? existingFn.responseType : null))
  }
  if (existing) {
    for (const [url, fn] of existing.functions) {
      if (!opUrls.has(url)) funcLines.push(`// [stale] 不在 swagger 中\n${fn.text}`)
    }
  }

  const keysText = queryKeysText || generateQueryKeys(controller, ops)

  const content =
    `${importLine(ops)}\n\n` +
    '// ==================== Types ====================\n\n' +
    `${typeLines.join('\n\n')}\n\n` +
    '// ==================== API Functions ====================\n\n' +
    `${funcLines.join('\n\n')}\n\n` +
    '// ==================== Query Keys ====================\n\n' +
    `${keysText}\n`

  return {
    file: lowerFirst(controller) + '.ts',
    dir: SYSTEM_CONTROLLERS.has(controller) ? 'system' : '.',
    content,
  }
}

// ============ CLI ============

function usage() {
  return [
    '用法: node scripts/gen-api.js <Controller> [--all] [--force]',
    '',
    '参数:',
    '  <Controller>   控制器名（路径 /api/{Controller}/{Action} 前缀），如 SysUser、PcPatrol',
    '  --all          处理全部控制器',
    '  --force        不合并，整体覆盖已存在文件（会丢失手写响应类型）',
    '  --help, -h     显示本帮助',
    '',
    '示例:',
    '  node scripts/gen-api.js SysUser',
    '  node scripts/gen-api.js PcPatrol --force',
    '  pnpm gen:api --all',
  ].join('\n')
}

function main() {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage())
    process.exit(0)
  }
  const force = args.includes('--force')
  const all = args.includes('--all')
  const controllers = args.filter((a) => !a.startsWith('--'))
  const swagger = loadSwagger()
  const available = listControllers(swagger)
  const targets = all ? available : controllers

  if (!targets.length) {
    console.error(usage())
    console.error('\n可用控制器: ' + available.join(', '))
    process.exit(1)
  }
  for (const c of targets) {
    if (!available.includes(c)) {
      console.error(`控制器不存在: ${c}（可用: ${available.join(', ')}）`)
      process.exit(1)
    }
    const rel = SYSTEM_CONTROLLERS.has(c) ? 'system' : ''
    const existingPath = join(API_DIR, rel, lowerFirst(c) + '.ts')
    const existingContent = existsSync(existingPath) && !force ? readFileSync(existingPath, 'utf8') : null
    const result = generateFileContent(swagger, c, existingContent)
    if (!result) { console.error(`控制器 ${c} 无接口`); continue }
    const outDir = join(API_DIR, result.dir)
    mkdirSync(outDir, { recursive: true })
    const outPath = join(outDir, result.file)
    writeFileSync(outPath, result.content, 'utf8')
    console.log(`生成(${existingContent ? '合并更新' : '新建'}): ${outPath}`)
  }
}

const entry = process.argv[1] ? resolve(process.argv[1]) : ''
if (entry && fileURLToPath(import.meta.url) === entry) main()
