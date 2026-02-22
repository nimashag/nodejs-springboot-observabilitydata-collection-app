/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOG_AGGREGATION_API_URL?: string;
  readonly VITE_ALERT_AGENT_API_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

