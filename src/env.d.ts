/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  /** Strapi backend base URL; defaults to https://api.thilo.scouts.ch/ */
  readonly BACKEND_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Type declarations for vite-plugin-pwa virtual module
declare module 'virtual:pwa-register' {
  export type RegisterSWOptions = {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: unknown) => void;
  };
  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}
