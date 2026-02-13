/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONVEX_URL: string
  readonly VITE_HIDE_HIPAA_BANNER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
