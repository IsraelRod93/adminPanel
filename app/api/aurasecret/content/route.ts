import { NextRequest, NextResponse } from 'next/server';
import { getAuraDb } from '@/lib/aura-db';
import { verifyAdminSession } from '@/lib/auth';

export async function GET() {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sql = getAuraDb();
  await sql`ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT FALSE`.catch(() => {});
  await sql`ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS thumbnail_url TEXT`.catch(() => {});

  try {
    const items = await sql`
      SELECT
        v.id, v.type, v.title, v.price, v.file_url, v.thumbnail_url, v.created_at, v.approved,
        c.name AS companion_name, c.id AS companion_id
      FROM vault_items v
      JOIN companions c ON c.id = v.companion_id
      ORDER BY v.approved ASC, v.created_at DESC
      LIMIT 500
    `;
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { itemId } = await request.json();
  if (!itemId) return NextResponse.json({ error: 'itemId requerido' }, { status: 400 });

  const sql = getAuraDb();
  await sql`UPDATE vault_items SET approved = true WHERE id = ${itemId}::uuid`;
  return NextResponse.json({ ok: true });
}

export async function POST() {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sql = getAuraDb();
  const result = await sql`UPDATE vault_items SET approved = true WHERE approved = false RETURNING id`;
  return NextResponse.json({ ok: true, approved: result.length });
}

export async function DELETE(request: NextRequest) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { itemId } = await request.json();
  if (!itemId) return NextResponse.json({ error: 'itemId requerido' }, { status: 400 });

  const sql = getAuraDb();
  await sql`DELETE FROM vault_items WHERE id = ${itemId}::uuid`;
  return NextResponse.json({ ok: true });
}
