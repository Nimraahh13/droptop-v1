// Paste your Supabase details here (Supabase > Project Settings > API).
// The "anon public" key is SAFE to put here. NEVER put the "service_role" key here.
const SUPABASE_URL = 'https://xksdurtenkhjlgbnicbs.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NFqBOu04u_kgVxyC5uVgEA_aj8W_uKb';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
