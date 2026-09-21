# 工具函数

| 文件                    | 用途                                                                                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/utils/feedback.ts` | 用户反馈统一封装：`message` / `notify` / `confirm` / `alert` / `prompt` / `showLoading` / `withLoading`，以及全局配置 `setupFeedback` / `feedbackDefaults`，所有提示统一走这里 |
| `src/utils/encrypt.ts`  | `encryptPwdRsa`（RSA 加密密码，jsencrypt）、`md5Hash`（大写 hex）、`encryptText`/`decryptText`（AES-256-CBC + PBKDF2）                                          |
| `src/utils/dayjs.ts`    | dayjs 实例（中文 locale、relativeTime、utc、customParseFormat 插件）                                                                                            |
| `src/utils/validate.ts` | `isEmail`、`isMobile`、`isURL`、`isIdCard`                                                                                                                      |
| `src/utils/file.ts`     | `resolveFileUrl`（后端相对路径拼完整 URL）、`validateImageFile`（图片格式/大小校验）                                                                            |
