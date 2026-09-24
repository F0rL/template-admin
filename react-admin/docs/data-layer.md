# 数据层规范

## API 文件结构

每个领域一个文件。系统基础架构相关接口统一放在 `src/api/system/` 下（现有 `auth.ts` / `sysUser.ts` / `sysRole.ts` / `sysMenu.ts` / `sysFile.ts`），其余业务领域放在 `src/api/{domain}.ts`。单文件内按「类型（Types）→ API 函数（API Functions）→ 查询键（Keys）」分区（以 [auth.ts](../src/api/system/auth.ts) 为模板）。API 函数是纯异步函数，对 react-query 零感知，只负责请求和返回数据。

**函数命名约定**：

| 前缀                                         | 用途                                    | 是否支持 signal                        | 示例            |
| -------------------------------------------- | --------------------------------------- | -------------------------------------- | --------------- |
| `fetch*`                                     | 只读查询，可能被 `useQuery` 使用        | ✅ 最后一个参数 `signal?: AbortSignal` | `fetchUserList` |
| `create*` / `update*` / `delete*` / `reset*` | 写操作，只被 `useMutation` 或命令式调用 | ❌ 不需要                              | `resetUserPwd`  |
| 其余 POST 动作（`upload*` 等）               | 同上，取动作名小驼峰                    | ❌ 不需要                              | `sysFileUpload` |

**signal 参数规范**：被 `useQuery` 消费的 `fetch*` 函数须预留 `signal?: AbortSignal` 作为最后一个参数并注入 `apiGet`/`apiPost` 的 config（组件卸载时 react-query 自动 abort，请求取消）；仅命令式调用、不进查询缓存的 `fetch*`（如 `fetchUserInfo`、`fetchUserRightMenu`）无需 signal：

```ts
export function fetchXxx(params?: XxxParams, signal?: AbortSignal) {
  return apiGet<PaginatedData<XxxItem>>('/url', { params, signal })
}
```

## 响应解包

后端统一返回 `ApiResponse<T>`（`{ data, code, msg, errors, success }`，定义在 `src/types/global.d.ts`）。解包逻辑集中在 `@/utils/http`：

- `apiGet<T>` — 返回解包后的 `data`（原样返回 `T`），不统一处理分页
- `apiPost<T>` — 增删改，返回解包后的 `data`

分页响应（`data` 为 `{ list, total }`）由 API 函数用 `PaginatedData<T>`（`{ list: T[]; total: number }`，定义在 `src/types/global.d.ts`）标注返回类型，调用方自行读取 `list`/`total`。

业务错误（`success === false`）由响应拦截器统一调用 `handleBusinessError` 处理并 reject，调用方无需重复判断。

## react-query 使用约束

| 场景                                          | 用              | 不用                               |
| --------------------------------------------- | --------------- | ---------------------------------- |
| 组件内数据获取                                | `useQuery`      | 裸 axios / 手动 useState+useEffect |
| 需要生命周期钩子的写操作                      | `useMutation`   | 裸调用 + try/catch                 |
| 一次性调用（loading 由 withLoading 接管）     | 直接调 API 函数 | `useMutation`                      |
| Store 中的命令式请求（login、generateRoutes） | 直接调 API 函数 | react-query                        |

**useQuery 必须内联写在视图中**，queryKey 和 queryFn 同处可见。不为单一使用者创建 `queryOptions` 工厂或独立查询文件（现例：登录页验证码 `queryKey: ['captcha']`，见 `src/views/login/components/AccountLogin.tsx`）。

**queryFn 必须解构 `{ signal }` 并透传给 `fetch*` 函数**，否则组件卸载时请求不会自动取消：

```tsx
// ✅ 正确
const { data } = useQuery({ queryKey: ['captcha'], queryFn: ({ signal }) => fetchCaptcha(signal) })
```

**useMutation 仅在确实用到 onMutate / onSuccess / onError / onSettled 时使用**；生命周期内完成副作用（失效缓存、提示、loading 清理），不要在事件处理函数里重复写。

**列表筛选约定**：筛选条件（关键字等）分两个 state——输入框值（不入 queryKey）与**已提交值**（入 queryKey）；点查询/回车时把输入值提交为已提交值并回到第 1 页，重置同理。已提交值进 queryKey 才能让 react-query 在参数变化时自动重新请求，也避免 `refetch` 闭包读到旧值（禁止把输入框值直接放进 queryKey，否则逐字触发请求）。分页参数（`page` / `pageSize`）同样入 queryKey，配 `placeholderData: keepPreviousData` 让翻页保留上一页数据、不闪白：

```tsx
const [keyword, setKeyword] = useState('') // 输入框值
const [searchKey, setSearchKey] = useState('') // 已提交值
const { data, isFetching } = useQuery({
  queryKey: [...userKeys.lists(), page, pageSize, searchKey],
  queryFn: ({ signal }) =>
    fetchUserList({ page, rows: pageSize, searchKey: searchKey || undefined }, signal),
  placeholderData: keepPreviousData,
})
```

## 共享 QueryClient

`src/lib/queryClient.ts` 导出预配置的 `queryClient` 实例（App.tsx 内 `QueryClientProvider` 挂载）：`staleTime: 0`（每次挂载重新拉取，缓存仅作过渡展示）、`gcTime: 5min`、`retry: 0`（查询与变更均不自动重试）、`refetchOnWindowFocus: false`。需要 `invalidateQueries` / `useQueryClient` 时直接用 Hook 或导入该实例。开发环境由 App.tsx 挂载 `<ReactQueryDevtools>`，开关经 config 出口读环境变量 `VITE_APP_ENABLE_DEVTOOLS`（默认关闭，生产环境请保持关闭，与 vue3-admin 的 VueQueryDevtools 开关语义一致），用于检查查询缓存、queryKey 与失效效果。

## 查询键与缓存失效

queryKey 内联在 `useQuery` 处即可；当某键需要在写操作后失效时，将键常量提升到 API 文件导出，采用层级前缀结构（仅保留实际用于 `invalidateQueries` 的条目）：

```
['captcha']           ← 失效所有验证码缓存
['users']             ← userKeys.all     失效全部账户查询
['users', 'list']     ← userKeys.lists() 只失效列表（列表项键以此为前缀，invalidate 按前缀匹配）
['roles', 'options']  ← roleKeys.options() 角色下拉选项（staleTime 60s）
```

写操作成功后通过 `queryClient.invalidateQueries({ queryKey: 对应键 })` 精确失效相关缓存。禁止手动 refetch。

## Store 与查询边界

Zustand 持有跨页面共享的会话状态（token、userInfo、路由菜单）；react-query 管理服务端数据缓存。login、loadUserInfo、generateRoutes 等一次性命令式操作在 Store 内直接调 API 函数，不进查询缓存。
