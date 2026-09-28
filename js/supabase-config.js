// Paste your Supabase details here (Supabase > Project Settings > API).
// The "anon public" key is SAFE to put here. NEVER put the "service_role" key here.
const SUPABASE_URL = 'https://xksdurtenkhjlgbnicbs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhrc2R1cnRlbmtoamxnYm5pY2JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NzYyODYsImV4cCI6MjEwNjE1MjI4Nn0.7iW3v1gPJl-iRCYmYJwbXl3qnEeVwEzpjPA_Ew6LDMY';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
