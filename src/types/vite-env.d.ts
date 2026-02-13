/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_TOKEN_HASH: string;
  readonly VITE_APP_TITLE: string;
  // Add other env variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
