/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_UPLOAD_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_ENABLE_DEBUG?: string
  readonly VITE_ENABLE_ANALYTICS?: string
  readonly VITE_MAX_FILE_SIZE?: string
  readonly VITE_MAX_UPLOAD_SIZE?: string
  readonly VITE_SUPPORT_URL?: string
  readonly VITE_DOCS_URL?: string
  readonly VITE_TERMS_URL?: string
  readonly VITE_PRIVACY_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}