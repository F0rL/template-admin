import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyOp, emitSchemaDeclaration, collectRequestSchemaNames,
  getControllerOperations, listControllers, generateFileContent, parseExisting,
} from './gen-api.js'

const fixture = {
  paths: {
    '/api/SysUser/GetUserList': {
      get: {
        summary: '获取用户列表',
        parameters: [
          { name: 'page', in: 'query', required: true, schema: { type: 'integer', format: 'int32' } },
          { name: 'searchKey', in: 'query', required: false, schema: { type: 'string' } },
        ],
        responses: { 200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/ResponseResult' } } } } },
      },
    },
    '/api/SysUser/CreateUser': {
      post: {
        summary: '创建用户',
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/SysUserRequest' } } } },
        responses: { 200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/ResponseResult' } } } } },
      },
    },
    '/api/SysUser/GetTreeDepartmentList': {
      post: {
        summary: '获取部门树',
        parameters: [
          { name: 'type', in: 'query', required: false, schema: { type: 'integer', format: 'int32' } },
        ],
        responses: { 200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/ResponseResult' } } } } },
      },
    },
  },
  components: {
    schemas: {
      ResponseResult: { type: 'object', properties: { data: { type: 'object' }, code: { type: 'integer' } } },
      SysUserRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          age: { type: 'integer', format: 'int32', nullable: true },
          role: { $ref: '#/components/schemas/Role' },
        },
      },
      Role: { type: 'object', properties: { id: { type: 'integer', format: 'int64' } } },
      EvalSection: { type: 'integer', 'x-enumNames': ['A', 'B'], enum: [0, 1] },
    },
  },
}

test('classifyOp: GET -> fetch，POST 前缀映射', () => {
  assert.deepEqual(classifyOp({ method: 'get', action: 'GetUserList' }), { kind: 'fetch', name: 'fetchUserList', viaPost: false })
  assert.deepEqual(classifyOp({ method: 'post', action: 'CreateUser' }), { kind: 'write', name: 'createUser' })
  assert.deepEqual(classifyOp({ method: 'post', action: 'UpdateUser' }), { kind: 'write', name: 'updateUser' })
  assert.deepEqual(classifyOp({ method: 'post', action: 'DeleteUser' }), { kind: 'write', name: 'deleteUser' })
  assert.deepEqual(classifyOp({ method: 'post', action: 'ResetPwd' }), { kind: 'write', name: 'resetPwd' })
  assert.deepEqual(classifyOp({ method: 'post', action: 'SaveComment' }), { kind: 'write', name: 'saveComment' })
  assert.deepEqual(classifyOp({ method: 'post', action: 'GetTreeDepartmentList' }), { kind: 'fetch', name: 'fetchTreeDepartmentList', viaPost: true })
})

test('listControllers: 唯一控制器列表', () => {
  assert.deepEqual(listControllers(fixture), ['SysUser'])
})

test('schemaToTs + 请求类型闭包', () => {
  const ops = getControllerOperations(fixture, 'SysUser')
  const names = collectRequestSchemaNames(fixture, ops)
  assert.deepEqual(names, ['SysUserRequest', 'Role'])
})

test('emitSchemaDeclaration: object -> interface，enum -> 联合类型', () => {
  const ctx = { refs: new Set() }
  const iface = emitSchemaDeclaration('Role', fixture.components.schemas.Role, ctx)
  assert.match(iface, /export interface Role/)
  assert.match(iface, /id\?: number/)
  const en = emitSchemaDeclaration('EvalSection', fixture.components.schemas.EvalSection, ctx)
  assert.equal(en, 'export type EvalSection = 0 | 1 // A | B')
})

test('generateFileContent: 新建文件', () => {
  const r = generateFileContent(fixture, 'SysUser')
  assert.ok(r)
  assert.equal(r.file, 'sysUser.ts')
  assert.equal(r.dir, 'system')
  assert.match(r.content, /import \{ apiGet, apiPost \} from '@\/utils\/http'/)
  assert.match(r.content, /export interface UserListParams/)
  assert.match(r.content, /export interface SysUserRequest/)
  assert.match(r.content, /export interface Role/)
  assert.match(r.content, /fetchUserList/)
  assert.match(r.content, /createUser/)
  assert.match(r.content, /apiGet<unknown>\('\/SysUser\/GetUserList'/)
  assert.match(r.content, /\/\/ TODO: 手动补响应类型/)
  assert.match(r.content, /export const sysUserKeys =/)
  // URL 必须去掉 /api 前缀
  assert.doesNotMatch(r.content, /\/api\/SysUser/)
})

test('generateFileContent: 合并保留响应泛型与手写类型', () => {
  const existing = [
    "import { apiGet } from '@/utils/http'",
    '',
    '// ==================== Types ====================',
    '',
    '/** 列表行数据 */',
    'export interface UserListItem {',
    '  id: string',
    '  name: string',
    '}',
    '',
    '// ==================== API Functions ====================',
    '',
    'export function fetchUserList(params?: UserListParams, signal?: AbortSignal) {',
    "  return apiGet<UserListItem[]>('/SysUser/GetUserList', { params, signal })",
    '}',
    '',
    '// ==================== Query Keys ====================',
    '',
    'export const userKeys = {',
    "  all: ['users'] as const,",
    '}',
  ].join('\n')

  const r = generateFileContent(fixture, 'SysUser', existing)
  assert.ok(r)
  assert.match(r.content, /apiGet<UserListItem\[\]>\('\/SysUser\/GetUserList'/)
  assert.match(r.content, /createUser/)
  assert.match(r.content, /\/\*\* 列表行数据 \*\//)
  assert.match(r.content, /export interface UserListItem/)
  assert.match(r.content, /export const userKeys =/)
  assert.doesNotMatch(r.content, /\[stale\]/)
})

test('generateFileContent: 失效接口标注 [stale]', () => {
  const existing = [
    "import { apiGet } from '@/utils/http'",
    '',
    '// ==================== Types ====================',
    '',
    '// ==================== API Functions ====================',
    '',
    'export function fetchRemoved(signal?: AbortSignal) {',
    "  return apiGet<unknown>('/SysUser/Removed', { signal })",
    '}',
    '',
    '// ==================== Query Keys ====================',
    '',
  ].join('\n')

  const r = generateFileContent(fixture, 'SysUser', existing)
  assert.match(r.content, /\/\/ \[stale\] 不在 swagger 中/)
  assert.match(r.content, /fetchRemoved/)
})

test('parseExisting: 提取 url -> 响应泛型', () => {
  const existing = [
    "import { apiGet } from '@/utils/http'",
    '',
    '// ==================== Types ====================',
    '',
    'export interface UserListItem { id: string }',
    '',
    '// ==================== API Functions ====================',
    '',
    'export function fetchUserList(params?: UserListParams, signal?: AbortSignal) {',
    "  return apiGet<UserListItem[]>('/SysUser/GetUserList', { params, signal })",
    '}',
    '',
    '// ==================== Query Keys ====================',
    '',
    "export const userKeys = { all: ['users'] as const }",
  ].join('\n')

  const p = parseExisting(existing)
  assert.equal(p.functions.get('/SysUser/GetUserList').responseType, 'UserListItem[]')
  assert.equal(p.userTypes[0].name, 'UserListItem')
  assert.match(p.queryKeysText, /userKeys/)
})
