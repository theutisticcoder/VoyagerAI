
import { createClient } from '@supabase/supabase-js';

// Use environment variables if available, otherwise fallback to the hardcoded keys provided by the user.
const supabaseUrl = process.env.SUPABASE_URL || 'https://ofxyioyppiepomboqrrb.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9meHlpb3lwcGllcG9tYm9xcnJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MDYwNTcsImV4cCI6MjA4NDE4MjA1N30.MJFHQHV9JzBzW3Sl3Pt-4o9RyYGFtY4qk8joZwk3h54';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Since valid keys are now explicitly provided in the code, the system is considered configured.
export const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;
