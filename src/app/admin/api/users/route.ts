import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Fetch Users
    const { data: users, error: usersErr } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersErr) throw usersErr;

    // 2. Fetch User Usage Logs
    const { data: logs, error: logsErr } = await supabase
      .from('user_usage_logs')
      .select('user_id, status, timestamp');

    if (logsErr) throw logsErr;

    // Combine user details with usage aggregates
    const usersMap = new Map<string, {
      id: string;
      name: string;
      email: string;
      profilePhoto: string;
      createdAt: string;
      lastLogin: string;
      totalEvals: number;
      successfulEvals: number;
      failedEvals: number;
    }>();

    // Initialize with database users
    (users || []).forEach((u: any) => {
      usersMap.set(u.id, {
        id: u.id,
        name: u.name || 'Anonymous',
        email: u.email || 'N/A',
        profilePhoto: u.profile_photo || '',
        createdAt: u.created_at,
        lastLogin: u.last_login || u.created_at,
        totalEvals: 0,
        successfulEvals: 0,
        failedEvals: 0,
      });
    });

    // Process logs to accumulate evaluations counts
    (logs || []).forEach((l: any) => {
      const uid = l.user_id || '00000000-0000-0000-0000-000000000000';
      if (!usersMap.has(uid)) {
        // Fallback for guest users or logs without matching user row
        usersMap.set(uid, {
          id: uid,
          name: uid === '00000000-0000-0000-0000-000000000000' ? 'Guest User' : 'Unknown Beta User',
          email: uid === '00000000-0000-0000-0000-000000000000' ? 'guest@write2rank.com' : 'unknown@write2rank.com',
          profilePhoto: '',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          totalEvals: 0,
          successfulEvals: 0,
          failedEvals: 0,
        });
      }

      const uRecord = usersMap.get(uid)!;
      uRecord.totalEvals++;
      if (l.status === 'success') {
        uRecord.successfulEvals++;
      } else {
        uRecord.failedEvals++;
      }

      // Track last login/activity time from logs if later than current
      const logTime = new Date(l.timestamp).getTime();
      const currentLastActive = new Date(uRecord.lastLogin).getTime();
      if (logTime > currentLastActive) {
        uRecord.lastLogin = l.timestamp;
      }
    });

    const userList = Array.from(usersMap.values()).sort((a, b) => b.totalEvals - a.totalEvals);

    return NextResponse.json({ users: userList });
  } catch (err: any) {
    console.error('Failed to aggregate user statistics:', err);
    return NextResponse.json({ error: 'Failed to fetch user directory.' }, { status: 500 });
  }
}
