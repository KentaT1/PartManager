import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
// For GitHub Pages: The anon/public key is safe to expose in client-side code
// This is by design - Supabase uses Row Level Security (RLS) to protect your data
// NEVER expose the service_role key (that's for server-side only)

// You can set these in two ways:
// 1. For local development: Create a .env.local file with:
//    REACT_APP_SUPABASE_URL=your_supabase_url
//    REACT_APP_SUPABASE_ANON_KEY=your_anon_key
// 2. For GitHub Pages: Replace the values below directly (they're public anyway)

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const isSupabaseConfigured = supabaseUrl !== 'YOUR_SUPABASE_URL' && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY';

if (!isSupabaseConfigured) {
  console.warn('⚠️ Supabase credentials not configured. Please set up your Supabase project.');
  console.warn('📝 Create a .env.local file with:');
  console.warn('   REACT_APP_SUPABASE_URL=your_supabase_url');
  console.warn('   REACT_APP_SUPABASE_ANON_KEY=your_anon_key');
} else {
  // Validate URL format
  if (supabaseUrl.includes('dashboard') || supabaseUrl.includes('supabase.com/dashboard')) {
    console.error('❌ ERROR: Your Supabase URL is incorrect!');
    console.error('You have: ' + supabaseUrl);
    console.error('It should be: https://YOUR_PROJECT_REF.supabase.co');
    console.error('Get the correct URL from: Settings → API → Project URL');
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

