import { NextResponse } from 'next/server';
import { getXposedDb } from '@/lib/xposed-db';
import { verifyAdminSession } from '@/lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export async function GET() {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sql = getXposedDb();

  try {
    const users = (await sql`
      SELECT
        u.telegram_id,
        u.username,
        u.stars,
        u.streak_count,
        u.last_active_at,
        u.created_at,
        COUNT(m.id)::int AS messages_received
      FROM users u
      LEFT JOIN messages m ON m.receiver_id = u.telegram_id
      GROUP BY u.telegram_id, u.username, u.stars, u.streak_count, u.last_active_at, u.created_at
      ORDER BY messages_received DESC
      LIMIT 200
    `) as Row[];
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}
