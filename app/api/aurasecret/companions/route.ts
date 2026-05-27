import { NextRequest, NextResponse } from 'next/server';
import { getAuraDb } from '@/lib/aura-db';
import { verifyAdminSession } from '@/lib/auth';

export async function GET() {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sql = getAuraDb();
  await sql`ALTER TABLE companions ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE`.catch(() => {});

  try {
    const companions = await sql`
      SELECT
        c.id, c.name, c.type, c.status, c.verified,
        c.tagline, c.description, c.age, c.location, c.photo_url,
        c.created_at,
        COUNT(v.id)::int AS vault_items
      FROM companions c
      LEFT JOIN vault_items v ON v.companion_id = c.id
      WHERE c.status != 'deleted'
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;
    return NextResponse.json({ companions });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { companionId, status, verified } = await request.json();
  if (!companionId) return NextResponse.json({ error: 'companionId requerido' }, { status: 400 });

  const sql = getAuraDb();
  if (typeof verified === 'boolean') {
    await sql`UPDATE companions SET verified = ${verified} WHERE id = ${companionId}::uuid`;
  }
  if (status) {
    await sql`UPDATE companions SET status = ${status} WHERE id = ${companionId}::uuid`;
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { companionId } = await request.json();
  if (!companionId) return NextResponse.json({ error: 'companionId requerido' }, { status: 400 });

  const sql = getAuraDb();
  await sql`UPDATE companions SET status = 'deleted' WHERE id = ${companionId}::uuid`;
  return NextResponse.json({ ok: true });
}
