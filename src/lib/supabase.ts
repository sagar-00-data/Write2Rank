import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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
export const supabase = new Proxy({} as any, {
  get(target, prop) {
    if (!rawSupabase) {
      console.warn(`⚠️ Supabase client accessed but not configured. Property read: "${String(prop)}"`);
      // Return a dummy object structure to prevent crashes when methods like .from() or .select() are chained
      const dummyChainer = () => dummyChainer;
      Object.setPrototypeOf(dummyChainer, {
        select: dummyChainer,
        insert: dummyChainer,
        update: dummyChainer,
        upsert: dummyChainer,
        delete: dummyChainer,
        eq: dummyChainer,
        order: dummyChainer,
        limit: dummyChainer,
        maybeSingle: dummyChainer,
        single: dummyChainer,
        then: (resolve: any) => resolve({ data: null, error: new Error('Supabase not configured') })
      });
      return prop === 'from' ? () => dummyChainer : dummyChainer;
    }
    return Reflect.get(rawSupabase, prop);
  }
});

