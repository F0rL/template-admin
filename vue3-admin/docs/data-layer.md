# 数据层规范

## API 文件结构

每个领域一个文件。系统基础架构相关接口统一放在 `src/api/system/` 下，其余业务领域放在 `src/api/{domain}.ts`。文件名取请求路径的接口类名首字母小写（如 `/SysLog/GetListHttpLog` → `sysLog.ts`、`/WxWork/GetOrgTree` → `wxWork.ts`）。单文件内按"类型 → API 函数 → 查询键"顺序排列。API 函数是纯异步函数，对 vue-query 零感知，只负责请求和返回数据。

接口文件由 `pnpm gen:api <Controller>` 从 `src/api/swagger.json` 生成：`SYSTEM_CONTROLLERS`（Auth/WxWork/SysUser/SysRole/SysMenu/SysLog/SysUpload/SysOrg 等）写入 `src/api/system/`，其余写入 `src/api/` 顶层。生成器只产出 `unknown` 响应类型，需手动补齐；重复执行按 URL 合并更新，保留已手写的响应类型。

**调用方式**：接口方法用命名空间导入，类型与查询键常量用具名导入，避免接口方法与组件方法混淆：

```ts
import * as sysLogApi from '@/api/system/sysLog' // 仅方法，可调用
import { logKeys } from '@/api/system/sysLog'     // 常量
import type { LogListItem } from '@/api/system/sysLog' // 类型
```

**函数命名约定**：

| 前缀                                         | 用途                                    | 是否支持 signal                    | 示例            |
| -------------------------------------------- | --------------------------------------- | ---------------------------------- | --------------- |
| `fetch*`                                     | 只读查询，可能被 `useQuery` 使用        | ✅ 第二参数 `signal?: AbortSignal` | `fetchUserList` |
| `create*` / `update*` / `delete*` / `reset*` | 写操作，只被 `useMutation` 或命令式调用 | ❌ 不需要                          | `createUser`    |

其余 POST 动作取动作名小驼峰（如 `BatchAddPeople` → `batchAddPeople`、`CopyLocations` → `copyLocations`），命名由 `pnpm gen:api` 生成。

**signal 参数规范**：被 `useQuery` 消费的 `fetch*` 函数须预留 `signal?: AbortSignal` 作为最后一个参数，注入到 axios config（组件卸载时自动取消请求）；仅命令式调用、不进查询缓存的 `fetch*`（如 `fetchUserRightMenu`、`fetchUserInfo`）无需 signal：

```ts
export function fetchXxx(params?: XxxParams, signal?: AbortSignal) {
  return apiGet<PaginatedData<XxxItem>>('/url', { params, signal })
}
```

## 响应解包

后端统一返回 `ApiResponse<T>`（`{ data, code, msg, errors, success }`，定义在 `src/types/global.d.ts`）。解包逻辑集中在 `@/utils/http`：

- `apiGet<T>` — 返回解包后的 `data`（原样返回 `T`），不再统一处理分页
- `apiPost<T>` — 增删改，返回解包后的 `data`

分页响应（`data` 为 `{ list, total }`）由 API 函数用 `PaginatedData<T>`（`{ list: T[]; total: number }`，定义在 `src/types/global.d.ts`）标注返回类型，调用方自行读取 `list`/`total`。

业务错误（`success === false`）由响应拦截器统一调用 `handleBusinessError` 处理并 reject，调用方无需重复判断。

## vue-query 使用约束

| 场景                                          | 用              | 不用                    |
| --------------------------------------------- | --------------- | ----------------------- |
| 组件内数据获取                                | `useQuery`      | 裸 axios / 手动 loading |
| 需要生命周期钩子的写操作                      | `useMutation`   | 裸调用 + try/catch      |
| 一次性调用（loading 由 withLoading 接管）     | 直接调 API 函数 | `useMutation`           |
| Store 中的命令式请求（login、generateRoutes） | 直接调 API 函数 | vue-query               |

**useQuery 必须内联写在视图中**，queryKey 和 queryFn 同处可见。不为单一使用者创建 `queryOptions` 工厂或独立查询文件。

**queryFn 必须解构 `{ signal }` 并透传给 `fetch*` 函数**，否则页面卸载时请求不会自动取消：

```ts
// ✅ 正确
queryFn: ({ signal }) => fetchUserList({ pageIndex: 1 }, signal)
```

**列表搜索约定**：筛选条件（关键字、日期范围等）不放进 queryKey，由 queryFn 读取响应式值；查询/重置统一走"回到第 1 页触发请求（已在第 1 页时手动 refetch）"。资源类型类参数（如日志的 http/error）属于请求身份，仍放进 queryKey。

**useMutation 仅在确实用到 onMutate / onSuccess / onError / onSettled 时使用**；生命周期内完成副作用（失效缓存、提示、loading 清理），不要在事件处理函数里重复写。

## 共享 QueryClient

`src/lib/queryClient.ts` 导出预配置的 `queryClient` 实例：`staleTime: 0`、`gcTime: 5min`、`retry: 0`（查询与变更均不自动重试）、`refetchOnWindowFocus: false`。需要 `invalidateQueries` / `useQueryClient` 时导入该实例。

## 查询键

查询键工厂放在 API 文件末尾，仅保留实际用于 `invalidateQueries` 的条目，采用层级前缀结构：

```
['menus']           ← menuKeys.all       失效所有菜单缓存
['menus', 'tree']   ← menuKeys.trees()   只失效树形数据
```

## 缓存失效

写操作成功后通过 `queryClient.invalidateQueries({ queryKey: 对应键 })` 精确失效相关缓存。禁止手动调用 refetch。

## Store 与查询边界

Store 持有跨页面共享的应用状态（token、用户信息、路由菜单）；vue-query 管理服务端数据缓存。login、generateRoutes 等一次性命令式操作直接调 API 函数，不进查询缓存。