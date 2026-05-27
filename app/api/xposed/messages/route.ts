import { NextResponse } from 'next/server';
import { getXposedDb } from '@/lib/xposed-db';
import { verifyAdminSession } from '@/lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export async function GET() {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sql = getXposedDb();

  try {
    const messages = (await sql`
      SELECT
        m.id,
        m.content,
        m.sender_os,
        m.sender_country,
        m.is_clue_revealed,
        m.created_at,
        u.username AS receiver_username
      FROM messages m
      LEFT JOIN users u ON u.telegram_id = m.receiver_id
      ORDER BY m.created_at DESC
      LIMIT 200
    `) as Row[];
    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}
