import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import process from 'node:process';

let adminClient: SupabaseClient | null | undefined;
let publicClient: SupabaseClient | null | undefined;

/** Client service-role hanya boleh dipakai di modul server/API Astro. */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClient !== undefined) return adminClient;

  const url = process.env.SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_KEY?.trim();

  if (!url || !serviceKey) {
    adminClient = null;
    return adminClient;
  }

  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { 'X-Client-Info': 'tkj-xi9-astro-server' } },
  });
  return adminClient;
}

/** Publishable/anon client untuk query publik yang dibatasi RLS. Tidak pernah memakai service key. */
export function getSupabasePublic(): SupabaseClient | null {
  if (publicClient !== undefined) return publicClient;

  const url = process.env.SUPABASE_URL?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    console.warn('[supabase] SUPABASE_URL/SUPABASE_ANON_KEY belum diisi: halaman publik memakai data fallback G.json.');
    publicClient = null;
    return publicClient;
  }

  publicClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { 'X-Client-Info': 'tkj-xi9-astro-public' } },
  });
  return publicClient;
}

export function getStorageBucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET?.trim() || 'astro';
}
