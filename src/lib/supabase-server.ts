import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE || '';

// Server client uses the private Service Role Key if available to bypass RLS, falling back to anon key
const activeKey = supabaseServiceKey || supabaseAnonKey;

const rawSupabase = (supabaseUrl && activeKey)
  ? createClient(supabaseUrl, activeKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

// Proxy wrapper prevents build-time runtime errors when keys are not populated
export const supabaseServer = new Proxy({} as any, {
  get(target, prop) {
    if (!rawSupabase) {
      console.warn(`⚠️ Supabase server client accessed but not configured. Property read: "${String(prop)}"`);
      
      const mockQueryBuilder: any = new Proxy(() => {}, {
        get(t, p) {
          if (p === 'then') {
            return (resolve: any) => resolve({ data: null, error: new Error('Supabase server client not configured') });
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
