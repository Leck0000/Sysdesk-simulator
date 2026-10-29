/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** WebSocket endpoint; when unset the app does not open a socket. */
  readonly VITE_WS_URL?: string;
  /** "1" seeds demo tickets (see src/app/demo.ts). */
  readonly VITE_DEMO?: string;
  /** REST API base URL (default: same origin). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
