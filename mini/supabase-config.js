// =====================================================================
//  SkillSwap — Supabase Configuration
//  =====================================================================
//
//  HOW TO SET UP:
//  1. Go to https://supabase.com and create a free account
//  2. Create a new project (name it "skillswap" or anything you like)
//  3. Wait for the project to finish setting up (~2 minutes)
//  4. Go to Project Settings → API
//  5. Copy your "Project URL" and paste it below as SUPABASE_URL
//  6. Copy your "anon/public" key and paste it below as SUPABASE_ANON_KEY
//  7. Go to SQL Editor and run the SQL from database/supabase_setup.sql
//
//  That's it! Your real-time chat will work.
// =====================================================================

// ⚠️ REPLACE THESE WITH YOUR OWN SUPABASE CREDENTIALS ⚠️
const SUPABASE_URL      = 'https://sbldpctuhfjvtpwatcxm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNibGRwY3R1aGZqdnRwd2F0Y3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NDY2NjIsImV4cCI6MjA5MjQyMjY2Mn0.WFeKboT0tCZpEAqsjti8EkMMWDKHdMK_51_cSclGTR8';

// Initialize the Supabase client (loaded via CDN in profile.html)
// Defensive: if CDN didn't load, supabase will be null and chat falls back to backend API
let supabase = null;
try {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[Supabase] Client initialized');
  } else {
    console.warn('[Supabase] CDN library not loaded — chat will use backend API fallback');
  }
} catch (err) {
  console.error('[Supabase] Failed to initialize client:', err);
}
