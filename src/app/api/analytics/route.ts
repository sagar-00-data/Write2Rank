import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase-server';

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

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetUserId = getDeterministicUUID(userId);

    const { data: dbEvals, error } = await supabaseServer
      .from('evaluations')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching evaluations from DB for analytics:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const evaluations = dbEvals || [];

    // Calculate weak and strong topics dynamically
    const weakTopicsMap: Record<string, number> = {};
    const strongTopicsMap: Record<string, number> = {};

    evaluations.forEach((e: any) => {
      const breakdown = e.ai_feedback?.breakdown || [];
      breakdown.forEach((item: { topic: string; awarded: number; max: number }) => {
        const topic = item.topic || 'General';
        const isStrong = (item.awarded / (item.max || 1)) >= 0.75;
        if (isStrong) {
          strongTopicsMap[topic] = (strongTopicsMap[topic] || 0) + 1;
        } else {
          weakTopicsMap[topic] = (weakTopicsMap[topic] || 0) + 1;
        }
      });
    });

    const weakTopics = Object.entries(weakTopicsMap)
      .sort((a, b) => b[1] - a[1])
      .map(([topic]) => topic)
      .slice(0, 5);

    const strongTopics = Object.entries(strongTopicsMap)
      .sort((a, b) => b[1] - a[1])
      .map(([topic]) => topic)
      .slice(0, 5);

    return NextResponse.json({
      evaluations,
      weakTopics,
      strongTopics
    });
  } catch (err: any) {
    console.error('Analytics GET API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
