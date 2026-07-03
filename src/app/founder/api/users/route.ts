import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const plan = searchParams.get('plan') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // 1. Build Query
    let query = supabaseServer
      .from('users')
      .select('*', { count: 'exact' });

    // Apply filters
    if (plan) {
      query = query.eq('plan', plan);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (search) {
      // Support searching by name, email, id or clerk_id
      // Only include UUID/ID filters when search looks like an ID to prevent PostgREST errors
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isIdLike = uuidRegex.test(search) || search.startsWith('user_');
      if (isIdLike) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,id.eq.${search},clerk_id.eq.${search}`);
      } else {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      }
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: users, count, error: usersErr } = await query;
    if (usersErr) throw usersErr;

    // Fetch plan defaults (graceful if table doesn't exist yet)
    let planConfigs: any[] = [];
    try {
      const { data: configs } = await supabaseServer
        .from('plan_configurations')
        .select('*');
      if (configs) planConfigs = configs;
    } catch {
      // plan_configurations table may not exist yet — use empty array
    }

    return NextResponse.json({
      users: users || [],
      total: count || 0,
      page,
      limit,
      planConfigs
    });

  } catch (err: any) {
    console.error('Failed to query user directory:', err);
    return NextResponse.json({ error: 'Failed to fetch user directory.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, action, plan, status, customEvalLimit, customOcrLimit, adminNotes } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 1. Resolve User settings and quick action updates
    const updateFields: Record<string, any> = {};

    if (action === 'save_changes') {
      if (plan !== undefined) updateFields.plan = plan;
      if (status !== undefined) updateFields.status = status;
      if (customEvalLimit !== undefined) updateFields.custom_eval_limit = customEvalLimit === '' || customEvalLimit === null ? null : parseInt(customEvalLimit, 10);
      if (customOcrLimit !== undefined) updateFields.custom_ocr_limit = customOcrLimit === '' || customOcrLimit === null ? null : parseInt(customOcrLimit, 10);
      if (adminNotes !== undefined) updateFields.admin_notes = adminNotes;
    } else if (action === 'reset_usage') {
      updateFields.evals_used_today = 0;
      updateFields.ocr_used_today = 0;
      updateFields.last_reset_date = new Date().toISOString().split('T')[0];
    } else if (action === 'grant_unlimited_today') {
      updateFields.custom_eval_limit = -1;
      updateFields.custom_ocr_limit = -1;
    } else if (action === 'suspend_user') {
      updateFields.status = 'Suspended';
    } else if (action === 'reactivate_user') {
      updateFields.status = 'Active';
    } else if (action === 'change_plan') {
      if (plan) updateFields.plan = plan;
    } else {
      return NextResponse.json({ error: `Invalid action specified: ${action}` }, { status: 400 });
    }

    // Update database
    const { data: updatedUser, error: updateErr } = await supabaseServer
      .from('users')
      .update(updateFields)
      .eq('id', userId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, user: updatedUser });

  } catch (err: any) {
    console.error('Failed to update user profile:', err);
    return NextResponse.json({ error: 'Failed to update user details: ' + err.message }, { status: 500 });
  }
}
