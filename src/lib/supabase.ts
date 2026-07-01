import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL or Anon Key is missing in environment variables. ' +
    'Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.'
  );
}

// Ensure createClient is not called with empty values during build compilation to prevent build failures.
const rawSupabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Use a Proxy to handle cases where Supabase is not configured (e.g. during build or missing env variables)
// to prevent "Cannot read properties of null" runtime errors.
// ✅ SAFE for client-side import — uses anon key only. Respects RLS.
export const supabase = new Proxy({} as any, {
  get(target, prop) {
    if (!rawSupabase) {
      console.warn(`⚠️ Supabase client accessed but not configured. Property read: "${String(prop)}"`);
      
      // A handler that intercepts any method call on our mock query builder and returns a self-referential function/object
      const mockQueryBuilder: any = new Proxy(() => {}, {
        get(t, p) {
          // If they await the result (or access .then), resolve to a stubbed result
          if (p === 'then') {
            return (resolve: any) => resolve({ data: null, error: new Error('Supabase not configured') });
          }
          return mockQueryBuilder;
        },
        apply() {
          return mockQueryBuilder;
        }
      });

      return mockQueryBuilder;
    }
    return Reflect.get(rawSupabase, prop);
  }
});

// ⛔ supabaseAdmin has been intentionally removed from this file.
// It lives in @/lib/supabase-server (server-only module).
// Never import supabaseAdmin in client components or pages.
