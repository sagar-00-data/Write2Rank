import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch evaluations and join with users table
    const { data: evals, error } = await supabase
      .from('evaluations')
      .select(`
        id,
        user_id,
        score,
        max_score,
        confidence,
        exam_type,
        created_at,
        question_text,
        answer_text,
        users (
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ evaluations: evals || [] });
  } catch (err: any) {
    console.error('Failed to query evaluations database:', err);
    return NextResponse.json({ error: 'Failed to query evaluations.' }, { status: 500 });
  }
}
