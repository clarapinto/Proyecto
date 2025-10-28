// src/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// 🔎 Logs de diagnóstico en desarrollo
if (import.meta.env.DEV) {
  console.info('[supabase] DEV mode');
  console.info('Tiene URL?', !!import.meta.env.VITE_SUPABASE_URL);
  console.info('Tiene KEY?', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
}

const url  = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

let client: SupabaseClient<Database>;

if (url && anon) {
  client = createClient<Database>(url, anon);
} else {
  if (import.meta.env.DEV) {
    console.warn('[supabase] Faltan variables (.env). Usando cliente MOCK en dev');
    // cliente mínimo para evitar crash mientras maquetas la UI
    client = {
      auth: {
        signInWithPassword: async () => ({ data: null as any, error: new Error('mock: sin supabase') }),
        signOut: async () => ({ error: null }),
        getUser: async () => ({ data: { user: null } as any, error: null }),
      },
      from: () => ({
        select: async () => ({ data: [] as any, error: null }),
        insert: async () => ({ data: [] as any, error: null }),
        update: async () => ({ data: [] as any, error: null }),
        delete: async () => ({ data: [] as any, error: null }),
      }),
    } as unknown as SupabaseClient<Database>;
  } else {
    throw new Error('Missing Supabase environment variables');
  }
}

export const supabase = client;
