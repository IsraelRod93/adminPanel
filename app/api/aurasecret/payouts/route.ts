import { NextRequest, NextResponse } from 'next/server';
import { getAuraDb } from '@/lib/aura-db';
import { verifyAdminSession } from '@/lib/auth';

export async function GET() {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sql = getAuraDb();

  try {
    const pending = await sql`
      SELECT wr.id, wr.amount_stars, wr.amount_mxn, wr.mp_email, wr.clabe,
             wr.status, wr.created_at, c.name AS companion_name
      FROM withdrawal_requests wr
      JOIN companions c ON c.id = wr.companion_id
      WHERE wr.status = 'pending'
      ORDER BY wr.created_at ASC
    `;

    const [totals] = await sql`
      SELECT
        COUNT(*)::int AS count,
        COALESCE(SUM(amount_stars), 0)::int AS total_stars,
        COALESCE(SUM(amount_mxn), 0)::numeric AS total_mxn
      FROM withdrawal_requests WHERE status = 'pending'
    `;

    return NextResponse.json({ pending, totals });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { withdrawalId, status } = await request.json();
  if (!withdrawalId || !status) return NextResponse.json({ error: 'withdrawalId y status requeridos' }, { status: 400 });

  const sql = getAuraDb();
  await sql`
    UPDATE withdrawal_requests
    SET status = ${status}, processed_at = NOW()
    WHERE id = ${withdrawalId}
  `;
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sql = getAuraDb();
  const manual = await sql`
    SELECT wr.id, wr.amount_mxn, wr.clabe, c.name AS companion_name
    FROM withdrawal_requests wr
    JOIN companions c ON c.id = wr.companion_id
    WHERE wr.status IN ('pending', 'manual_required') AND wr.clabe IS NOT NULL
    ORDER BY wr.created_at ASC
  `;

  if (manual.length === 0) {
    return NextResponse.json({ error: 'Sin retiros con CLABE pendientes' }, { status: 404 });
  }

  const header = 'Beneficiario,CLABE,Monto MXN,Concepto,Referencia\n';
  const rows = manual
    .map((r) =>
      `${r.companion_name},${r.clabe},${Number(r.amount_mxn).toFixed(2)},Ganancias AuraSecret,${r.id.slice(0, 8)}`,
    )
    .join('\n');

  await sql`
    UPDATE withdrawal_requests SET status = 'manual_required'
    WHERE id = ANY(${manual.map((r) => r.id)})
  `;

  return new Response(header + rows, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="retiros-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
