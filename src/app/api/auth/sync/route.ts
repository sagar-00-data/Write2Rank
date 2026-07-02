import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase-server';

// Deterministic UUID generator based on Clerk ID
function getDeterministicUUID(str: string): string {
  const cleanId = str.replace('user_', '');
  let hex = '';
  for (let i = 0; i < cleanId.length; i++) {
    hex += cleanId.charCodeAt(i).toString(16);
  }
  if (hex.length < 32) {
    hex = hex.padEnd(32, 'f');
  } else if (hex.length > 32) {
    hex = hex.substring(0, 32);
  }
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-4${hex.substring(12, 15)}-8${hex.substring(15, 18)}-${hex.substring(18, 30)}`;
}

export async function POST() {
  try {
    // 1. Authenticate the request via Clerk
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: 'Failed to retrieve Clerk user' }, { status: 500 });
    }

    // 2. Extract user details
    const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User';
    const email = clerkUser.emailAddresses[0]?.emailAddress || '';
    const profilePhoto = clerkUser.imageUrl || '';
    const deterministicId = getDeterministicUUID(userId);

    // 3. Prepare the full profile with Beta Tester defaults
    const fullProfile = {
      id: deterministicId,
      clerk_id: userId,
      name,
      email,
      profile_photo: profilePhoto,
      last_login: new Date().toISOString(),
      plan: 'Beta Tester',
      status: 'Active',
      custom_eval_limit: null,
      custom_ocr_limit: null,
      evals_used_today: 0,
      ocr_used_today: 0,
      total_eval_count: 0,
      total_ocr_count: 0,
    };

    // 4. Upsert the profile record (using safe fallback logic if columns are missing)
    const { data: existingUser, error: checkError } = await supabaseServer
      .from('users')
      .select('id')
      .eq('id', deterministicId)
      .maybeSingle();

    if (existingUser) {
      // Try to update with all columns, falling back to basic columns if fails
      const { error: updateError } = await supabaseServer
        .from('users')
        .update({
          name,
          email,
          profile_photo: profilePhoto,
          last_login: new Date().toISOString(),
        })
        .eq('id', deterministicId);

      if (updateError) {
        console.warn('⚠️ Server profile update failed, falling back...', updateError.message);
        // Fallback update to standard fields
        await supabaseServer
          .from('users')
          .update({ name, email })
          .eq('id', deterministicId);
      }
    } else {
      // Try to insert full profile, falling back if fails
      const { error: insertError } = await supabaseServer
        .from('users')
        .insert([fullProfile]);

      if (insertError) {
        console.warn('⚠️ Server profile insert failed, falling back...', insertError.message);
        // Fallback insert to standard fields (id, name, email, created_at)
        await supabaseServer
          .from('users')
          .insert([{
            id: deterministicId,
            name,
            email,
            created_at: new Date().toISOString(),
          }]);
      }
    }

    // 5. Ensure analytics row exists for this user
    const { data: existingAnalytics } = await supabaseServer
      .from('analytics')
      .select('id')
      .eq('user_id', deterministicId)
      .maybeSingle();

    if (!existingAnalytics) {
      await supabaseServer
        .from('analytics')
        .insert([{
          user_id: deterministicId,
          average_score: 0.00,
          weak_topics: [],
          strong_topics: [],
          evaluation_count: 0,
          improvement_trends: [],
        }]);
    }

    return NextResponse.json({ 
      success: true, 
      userId: deterministicId, 
      clerkId: userId 
    });

  } catch (err: any) {
    console.error('❌ [Sync API] Sync error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
