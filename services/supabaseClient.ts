
import { createClient } from '@supabase/supabase-js';

// Vercel handles environment variables via process.env.
// We prioritize those, and fall back to the hardcoded ones provided for this environment.
const supabaseUrl = process.env.SUPABASE_URL || 'https://ofxyioyppiepomboqrrb.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9meHlpb3lwcGllcG9tYm9xcnJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MDYwNTcsImV4cCI6MjA4NDE4MjA1N30.MJFHQHV9JzBzW3Sl3Pt-4o9RyYGFtY4qk8joZwk3h54';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// System is configured if either environment variables or hardcoded fallbacks are present.
export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;
