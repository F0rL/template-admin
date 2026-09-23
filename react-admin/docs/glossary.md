# 术语表（glossary）

react-admin 范本通用术语。「vue3-admin 对应」列仅作对照参考，两项目文档与代码完全独立。

| 术语                    | 定义                                                                       | vue3-admin 对应                 |
| ----------------------- | -------------------------------------------------------------------------- | ------------------------------- |
| ApiResponse\<T\>        | 后端统一响应契约 `{ data, code, msg, errors, success }`；`success === false` 为业务错误 | 同名（global.d.ts）             |
| PaginatedData\<T\>      | 分页响应 `{ list, total }`，调用方自行读取                                  | 同名                            |
| apiGet / apiPost        | HTTP 层解包助手，只做 ApiResponse 解包、原样返回 data                       | 同名（utils/http/apiHelpers）   |
| BusinessError           | 业务错误 reject 载体；网络错误处理时对其直接放行避免重复 toast              | 同名                            |
| fetch* / create* 等     | API 函数命名约定：`fetch*` 只读查询且末位支持 `signal`；写操作 `create*/update*/delete*/reset*` | 同名约定                        |
| queryKey 工厂           | API 文件末尾的层级前缀常量（`['menus']` / `['menus','tree']`），仅保留实际用于失效的条目 | 同名约定                        |
| constantRoutes          | 静态路由（登录/错误/404），始终注册                                        | 同名                            |
| asyncRoutes            | 待后端菜单过滤的动态路由模块（router/modules/）                            | 同名                            |
| generateRoutes         | fetchUserRightMenu → 过滤 asyncRoutes → 存入 permission store 的动作        | 同名                            |
| AuthGuard              | 登录守卫组件：token 校验 + 首载用户信息/菜单 + 重定向                       | router.beforeEach 守卫          |
| navigate 桥             | 非组件上下文跳转（http 401）使用的 useNavigate 引用桥（router/navigate.ts） | 组件外 router 实例导入          |
| iconMap                 | 字符串 → 图标组件映射表（icons/index.ts 默认导出），动态渲染菜单图标        | 同名                            |
| STORAGE_NS             | localStorage 命名空间前缀（`react-admin:`），同源部署不与 vue3-admin 串值   | 同名机制（`admin:`）            |
| persist                | Zustand persist 中间件：user 存 `token/userInfo`，app 存 `sidebarOpened/size` | pinia-plugin-persistedstate     |
| h-page                 | Tailwind utility：视窗高 − header − 内容 padding，列表页满高布局基准        | 同名                            |
| panel-card             | 内容块卡片 utility（圆角白底内边距轻阴影），页面内容块统一容器             | 同名                            |
| ProTable               | 配置驱动表格（antd Table 薄封装），Phase 2 落地                            | 同名（el-table 封装）           |
| auto-height            | ProTable 满高模式：表格占满 flex 剩余高度、表体内部滚动                    | 同名                            |
| SelectIcon             | 图标选择器（Popover + 双标签页：antd icons / ri）                           | 同名（ep + ri 双标签）          |
| useDialogForm          | 弹窗表单 hook（open / close / pending / 提交成功回调失效缓存）              | composable 同名                 |
| 占位页（PlaceholderPage） | Phase 1 空白页：仅展示页面名，路由/菜单先行                               | 无（本次新增）                  |
| 模板页                 | Phase 2 首个完整实现的系统管理页面，固定「列表页模板」形制供其余页面复制     | 无（本次新增）                  |
| React Compiler         | React 官方自动记忆化编译器（babel-plugin-react-compiler 1.0 GA），替代手动 memo/useMemo/useCallback | 无                              |
| queryClient 共享实例    | lib/queryClient.ts 预配置：staleTime 0 / gcTime 5min / retry 0 / 关闭 focus 重取 | 同配置（vue-query 版）          |
| dev-server mock        | vite-plugin-mock-dev-server 中间件拦截 `/api/*`，Network 可见，生产构建天然无 mock | 同方案                          |
| gen:api                | （暂缓）从 swagger.json 生成/合并接口文件的脚本                             | scripts/gen-api.js              |
