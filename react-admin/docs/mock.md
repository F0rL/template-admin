# Mock

Mock 由 **vite-plugin-mock-dev-server** 实现：`vite.config.ts` 中

```ts
mockDevServerPlugin({
  enabled: env.VITE_APP_USE_MOCK === 'true',
  dir: 'mock',
  include: ['**/*.ts'],
  exclude: ['**/db.ts', '**/utils.ts'],
})
```

以 dev server 中间件在 proxy 之前拦截 `/api/*` 请求。

- **开关**：`.env.development` 的 `VITE_APP_USE_MOCK`（`true`/`false`），修改后需重启 dev server。
- **切换真实后端**：`VITE_APP_USE_MOCK=false` 后 `/api` 请求穿透到 `server.proxy`，转发至 `VITE_APP_BASE_API`。
- **生效范围**：仅 dev server；生产构建/`vite preview` 天然无 mock，无需 tree-shake 机制。
- **网络可见**：请求真实发出到 dev server，Network 面板可见请求/响应。
- **include/exclude 说明**：插件默认 include 仅匹配 `*.mock.ts` 等带 `.mock.` 的文件名，本项目沿用原文件名故显式放开；`db.ts`/`utils.ts` 是纯数据源/工具模块（无 `defineMock` 默认导出），必须 exclude——若被扫到，插件会把其命名导出误当作 mock 配置产生幽灵项，遮蔽后续 handler（表现为空响应）。

## 组织（三件套）

```
mock/
├── auth.ts     # defineMock：登录链路 3 个端点的 handler（验证码/token/用户信息）
├── sysUser.ts  # defineMock：账户管理（列表/实体/新增/更新/删除/重置密码/修改自身密码）
├── sysRole.ts  # defineMock：角色（列表/实体/新增/更新/删除）
├── sysMenu.ts  # defineMock：菜单（右侧菜单/菜单树/菜单列表/实体/父级候选/增删改）
├── sysFile.ts  # defineMock：文件上传（仅上传，表单消费返回的 path）
├── wxWork.ts   # defineMock：组织架构（部门树/组织架构树/成员实体/成员分页列表/缓存刷新）
├── sysLog.ts   # defineMock：日志（请求日志/错误日志的列表与详情）
├── db.ts       # 统一数据源：depts / users / roles / menus / httpLogs / errorLogs / CAPTCHA_BASE64 / MOCK_CAPTCHA_KEY 等
└── utils.ts    # makeResp / makePageResp / makeErrorResp / paginate（响应结构构造器）
```

- 每个接口文件默认导出 `defineMock([...])`（自 `vite-plugin-mock-dev-server` 具名导入），插件自动聚合目录内全部文件（无 index.ts）；新增 mock 数据先进 `db.ts`，再由 handler 取用。
- 接口项声明：`url`（**必须带 `/api` 前缀**，与 `config.API_BASE_URL` 对齐）+ `method`（**大写** `'GET' | 'POST'`）+ `body: () => ResponseBody`（常规 JSON 响应用 `body`，不用低层 `response` 字段）。
- 响应必须经 `utils.ts` 构造器绑定 API 层类型（`ApiResponse<T>` / `PaginatedData<T>`，见 `src/types/global.d.ts`）；业务错误一律 HTTP 200 + `success:false`（`makeErrorResp`），禁止 4xx/5xx。
- `db.ts` 的菜单 `menus` 为**扁平列表**（`parentId` 表达层级），`path` 与 `src/router/modules/` 的路由 path 对齐，`icon` 键名与 `src/icons` 的 iconMap 对齐（`ad:` / `ri:` 前缀，均无前导斜杠）。
- **与 vue3-admin 的数据契约一致**：两个模板的 `mock/db.ts` 数据与各 handler 返回的 data 形状完全相同（同一套设计共享），仅两处有意差异——① react 版 `buildTree` 的叶子节点**不带 `children`**（vue3 版为 `children: []`），因 antd Table 对带 `children` 的行固定渲染展开按钮；② 菜单 `icon` 名 react 用 `ad:` / `ri:`（本项目仅收录 antd + ri 两图标库），vue3 用 `ep:` / `ri:`。

## 覆盖范围

**Phase 1（auth）** —— 对齐 `src/api/system/auth.ts` 的三个端点：

- `GetLoginVerCode`：固定验证码（base64 图片 + key）。
- `GetTokenPC`：**免校验**——不校验账号密码/验证码，参数结构保持 `LoginPayload` 契约，直接返回 `mock-token-${Date.now()}`（浏览器验收时任意输入可登录，OTP 输满自动提交）。
- `GetUserInfo`：静态数据（id `admin` / 名「管理员」/ 关联角色「超级管理员组」）。

`SysMenu/GetUserRightMenu` 归属 `sysMenu.ts`、`SysUser/UpdatePwd` 归属 `sysUser.ts`（与 vue3-admin 的端点分布一致）。

**Phase 2（账户管理）** —— 对齐 `src/api/system/{sysUser,sysRole,sysFile}.ts`：

- `SysUser/GetUserList`：`db.users`（12 条）按 `searchKey` 模糊过滤 `userId` / `name` 后分页；handler 内做 db → 契约映射（`statusName` 启用/禁用、`userType: 10` 本地用户、`sysRoleUsers` 由 `roleIds` 经 `roleNameOf()` 补名、部门字段取自 `depId/depName`）。
- `SysUser/GetUserEntity`：按 `id` 查 `db.users`，不存在返回 `makeErrorResp`。
- `SysUser/CreateUser` / `UpdateUser` / `DeleteUser` / `ResetPwd` / `UpdatePwd`：**假成功**（不落库）——前端只依赖成功结构完成 toast、关抽屉、失效列表缓存；列表数据不会因这些操作改变。
- `SysRole/GetRoleList`：`db.roles`（26 条）分页返回 `{ id, name }`。
- `SysFile/SysFileUpload`：固定返回 `path: '/file/mock-avatar.png'`（表单只消费 `path`）；文件字段名 `File`（对齐后端 `IFormFile`）。

**Phase 3（角色管理）** —— 对齐 `src/api/system/{sysRole,sysMenu}.ts`：

- `SysRole/GetRoleEntity`：按 `id` 查 `db.roles`，返回 `status: { value, text }`、`isDelHandle`（内置角色 `10086` 为 false）、`menuList`（按 `menuIdsJSON` 解析出的 `{ id, title }[]`）、`localUser` / `workUser`（mock 恒为空数组）与 `menuIdsJSON`（权限树回填）；不存在返回 `makeErrorResp`。
- `SysRole/CreateRole` / `UpdateRole` / `DeleteRole`：**假成功**（不落库）。
- `SysMenu/GetUserRightMenu`：`db.menus` 过滤 `isMenuShow` 后建树（Sidebar 与权限路由数据源）。
- `SysMenu/GetMenuTree`：`db.menus` 按 `searchKey` 过滤 title/path 后建树（角色表单权限树数据源）。
- `SysMenu/GetMenuList`：与 `GetMenuTree` 同源同过滤，响应为 `PaginatedData` 包装（不分页，total = 过滤后条数）。
- `SysMenu/GetMenuEntity`：按 `id` 查 `db.menus`，不存在返回 `makeErrorResp`。
- `SysMenu/GetParentMenuAll`：返回 `{ id, title }[]` 扁平列表（菜单表单父级候选）。
- `SysMenu/CreateMenu` / `UpdateMenu` / `DeleteMenu`：**假成功**（不落库）。

**Phase 3（组织架构）** —— 对齐 `src/api/system/wxWork.ts`：

- `WxWork/GetTreeDepartmentList`（POST）：由 `db.depts` 扁平列表构建部门树（保持声明顺序）。
- `WxWork/GetOrgTree`：`searchKey` 命中时跨全库搜用户返回 `{ id: userId, name: '名（工号）', type: 2, isLeaf: true }[]`；否则 `departmentId=0` 返回根部门（`type: 1, isLeaf: false`），其余返回该部门下用户节点。
- `WxWork/GetUserEntity`：按 `userId` 查 `db.users`，返回 `{ name, userid, mobile, department: [Number(depId)], departmentNames: [depName] }`；未命中返回 `data: null`。
- `WxWork/GetUserList`：按 `departmentId` 经 `depts.userIds` 反查 `db.users` 成员（支持一人多部门），`searchKey` 过滤姓名/账号后分页；data 结构为 `{ message, total }`（字段名对齐后端契约），分页参数名为 `row`。
- `WxWork/UserRefresh`：**假成功**（不改动 db 内存数据）。

**Phase 3（日志管理）** —— 对齐 `src/api/system/sysLog.ts`：

- `SysLog/GetHttpLogList` / `GetErrorLogList`：数据源为 `db.httpLogs` / `db.errorLogs`（模块加载时随机生成一次），按 `searchKey` 过滤事件名称/接口地址/调用人员/错误信息后分页。
- `SysLog/GetHttpLogEntity` / `GetErrorLogEntity`：按 `id` 查详情，部分字段（host/userId 等）随机生成；不存在时返回 `{ id }`。

**硬约束**：mock 仅覆盖已实现页面的端点；新页面默认先补 mock 再联调，避免 dev 下请求穿透到 404。

## 排查

未匹配 handler 的请求会穿透到 dev proxy/404，无显式报错；mock 漏配时先比对 URL（注意 `/api` 前缀）与 method（大写）和 `mock/*.ts` 中的 handler 定义。
