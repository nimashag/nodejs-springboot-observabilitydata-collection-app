/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOG_AGGREGATION_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

