# 工具函数

| 文件                      | 用途                                                                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/utils/feedback.ts`   | 用户反馈统一封装：`message` / `notify` / `confirm` / `showLoading` / `withLoading`，所有提示统一走这里（硬约束：禁止直接使用 antd 静态方法）                      |
| `src/utils/encrypt.ts`    | `encryptPwdRsa`（RSA 加密密码，JSEncrypt + 内置公钥）、`md5Hash`（node-forge，大写 hex）                                                                          |
| `src/utils/validate.ts`   | `isEmail`、`isMobile`、`isURL`、`isIdCard`                                                                                                                       |
| `src/utils/file.ts`       | `resolveFileUrl`（后端相对路径拼完整 URL）、`validateImageFile`（图片格式/大小校验）、`downloadBlob`（文件流下载）                                                |
| `src/utils/dayjs.ts`      | dayjs 实例（中文 locale，relativeTime / customParseFormat / utc 插件），具名与默认双导出                                                                          |
| `src/icons/index.ts`      | `iconMap`（字符串图标名 → 图标组件，adMap + riMap 合并）+ `IconComponent` 类型                                                                                    |
| `src/components/DynamicIcon.tsx` | 按图标名渲染 iconMap 中的图标：`<DynamicIcon name={menu.icon} />`                                                                                          |

## feedback

- 实例来源：`message` / `notify` / `modal` 实例来自 `<AntdApp>` 上下文（App.useApp），由 `<FeedbackBridge/>`（App.tsx 内、AntdApp 子级）经 `setFeedbackHooks` 注入，保证主题/locale 一致；App 挂载前极端情况退化为 antd 静态方法兜底。
- `message.success/error/warning/info(content, options?)`；`notify.success(description, title?, options?)`（支持描述/标题/选项三种入参形态）；`confirm(content, title?, options?)` 返回 `Promise<boolean>`（true=确定，false=取消/关闭，勿传 onOk/onCancel 覆盖布尔约定）。
- 全屏加载：`withLoading(task, text?)` 跟随 Promise/函数自动开闭；`showLoading(text?)` 手动控制（返回 `{ close }`）。计数嵌套，由 `<LoadingHost/>` 订阅 `useFeedbackLoading` 渲染全屏 Spin。

## file

- `resolveFileUrl(url)`：http(s)/协议相对/data/blob 原样返回；含 `127.0.0.1`/`localhost` 旧 origin 的历史脏数据剥掉后按 `config.FILE_BASE_URL` 重拼；其余相对路径直接拼 `FILE_BASE_URL`。
- `validateImageFile(file)`：jpg/jpeg/png/bmp + ≤2MB，失败自动 toast 并返回 false（antd Upload 的 beforeUpload 直接收原生 File）。
- `downloadBlob(url, filename, params?)`：**原生 fetch 绕过 axios 拦截器**（文件流 blob 无 success 字段，走拦截器会被误判为业务错误），手动携带 Bearer；若响应为 JSON 错误则 toast 后中止，成功则触发浏览器下载。

## icons

- iconMap 键名（如 `ri:user-line`）与后端菜单 `icon` 字段对齐（无前导斜杠）；新增动态图标在 `src/icons/ad.ts` / `ri.ts` 登记，index 内合并、同键 ri 覆盖 ad。
- 静态场景（按钮/表单内固定图标）直接 import 图标组件，不走 iconMap。
