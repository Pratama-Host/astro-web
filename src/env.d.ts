/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SITE_ORIGIN?: string;
  readonly SUPABASE_URL?: string;
  readonly SUPABASE_SERVICE_KEY?: string;
  readonly SUPABASE_STORAGE_BUCKET?: string;
  readonly ADMIN_PASSWORD?: string;
  readonly ADMIN_SESSION_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}


declare module 'cloudflare:workers' {
  export const cache: {
    purge(options: { tags?: string[]; pathPrefixes?: string[]; purgeEverything?: boolean }): Promise<unknown>;
  };
}
