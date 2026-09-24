/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_APP_BASE_URL: string
  readonly VITE_APP_BASE_API: string
  readonly VITE_APP_USE_MOCK: string
  readonly VITE_APP_ENABLE_DEVTOOLS: string
  readonly VITE_APP_STORAGE_NS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
