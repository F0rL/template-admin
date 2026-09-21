/**
 * node-forge 子路径模块声明。
 * 项目仅用 lib/md5.js 生成 MD5（登录密码哈希），@types/node-forge 不覆盖子路径导入；
 * 不换 WebCrypto 的原因：crypto.subtle.digest 仅支持 SHA 系列，且仅在 HTTPS/localhost 上下文可用。
 */
declare module 'node-forge/lib/md5.js' {
  interface Md5Digest {
    toHex: () => string
  }
  interface Md5 {
    update: (text: string) => Md5
    digest: () => Md5Digest
  }
  const md5: { create: () => Md5 }
  export default md5
}
