import type { Api } from './types';
import { mockApi } from './mockApi';
import { createSupabaseApi } from './supabaseApi';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** No Supabase keys in .env → app runs on local demo data. */
export const isDemo = !url || !key;
export const api: Api = isDemo ? mockApi : createSupabaseApi(url!, key!);
