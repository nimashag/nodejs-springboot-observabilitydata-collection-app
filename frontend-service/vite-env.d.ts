/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_USER_URL: string;
    readonly VITE_RESTAURANT_URL: string;
    readonly VITE_ORDER_URL: string;
    readonly VITE_DELIVERY_URL: string;
    readonly VITE_API_BASE: string;
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
  