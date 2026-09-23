# ADR-0005：TanStack Query v5 数据层约定

- 状态：已接受
- 日期：2026-09-23
- 关联：ADR-0006

## 背景

vue3-admin 已使用 @tanstack/vue-query（同引擎的 Vue 版），数据层契约经过验证。React 版采用同款 `@tanstack/react-query ^5.103`，约定全盘平移。

## 决策

- 共享 `QueryClient` 实例（`src/lib/queryClient.ts`）：`staleTime: 0`、`gcTime: 5min`、`retry: 0`、`refetchOnWindowFocus: false`。
- 使用约束（与 vue3-admin data-layer 一致）：

| 场景                                   | 用                | 不用                       |
| -------------------------------------- | ----------------- | -------------------------- |
| 组件内数据获取                          | `useQuery`        | 裸 axios / 手动 loading    |
| 需要生命周期副作用的写操作               | `useMutation`     | 裸调用 + try/catch         |
| 一次性调用（loading 由 withLoading 接管）| 直接调 API 函数    | `useMutation`               |
| Store 中的命令式请求（login、generateRoutes） | 直接调 API 函数 | vue/react-query            |

- `useQuery` **内联写在视图中**（queryKey 与 queryFn 同处可见）；`queryFn` 必须解构 `{ signal }` 透传给 `fetch*` 函数（卸载自动取消）。
- 列表筛选条件不进 queryKey，由 queryFn 读取；资源类型类参数（属于请求身份）进 queryKey。查询/重置统一「回第 1 页触发请求」。
- queryKey 工厂放 API 文件末尾，层级前缀结构，仅保留实际用于 `invalidateQueries` 的条目。
- 写操作成功后 `queryClient.invalidateQueries({ queryKey })` 精确失效，禁止手动 refetch。

## 理由

- 同引擎平移零学习成本；vue3-admin 的契约已在真实使用中验证。
- devtools 联调体验（React Query Devtools）。

## 后果

- 页面不手写 loading/error 装配逻辑，统一由 Query 返回态驱动。
- React Compiler 启用后，queryFn/option 对象无需手动 memo（见 ADR-0009）。

## 被否决的备选

- **裸 axios + useState/useEffect**：无缓存、取消、重取、失效语义。
- **SWR**：变更与缓存失效语义弱于 TanStack Query，且与 vue3-admin 不同引擎。
