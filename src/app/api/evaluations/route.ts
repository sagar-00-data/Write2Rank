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
      console.error('Error fetching evaluations from DB:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ evaluations: dbEvals || [] });
  } catch (err: any) {
    console.error('Evaluations GET API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetUserId = getDeterministicUUID(userId);
    const { searchParams } = new URL(request.url);
    const evalId = searchParams.get('id');

    if (!evalId) {
      return NextResponse.json({ error: 'Missing evaluation ID' }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from('evaluations')
      .delete()
      .eq('id', evalId)
      .eq('user_id', targetUserId);

    if (error) {
      console.error('Error deleting evaluation from DB:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Evaluations DELETE API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetUserId = getDeterministicUUID(userId);
    const body = await request.json();

    const insertPayload = {
      ...body,
      user_id: targetUserId,
      created_at: new Date().toISOString()
    };

    const { data: dbData, error } = await supabaseServer
      .from('evaluations')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('Error inserting evaluation to DB:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, evaluation: dbData });
  } catch (err: any) {
    console.error('Evaluations POST API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
