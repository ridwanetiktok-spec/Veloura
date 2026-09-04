// ============================================
// Veloura Supabase Client
// ============================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate URL
if (!SUPABASE_URL || !SUPABASE_URL.startsWith('https://')) {
  console.error('Invalid Supabase URL. Set VITE_SUPABASE_URL in .env.');
}

if (!SUPABASE_ANON_KEY) {
  console.error('Missing Supabase anon key. Set VITE_SUPABASE_ANON_KEY in .env.');
}

// Create the client
const supabaseClient = SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('https://')
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Expose to window
window.supabaseClient = supabaseClient;
window.supabaseReady = true;
window.dispatchEvent(new CustomEvent('supabase-ready', {
  detail: { client: supabaseClient }
}));

if (supabaseClient) {
  console.log('Supabase client initialized.');
}