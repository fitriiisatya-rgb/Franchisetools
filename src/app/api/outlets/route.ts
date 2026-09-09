import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const outlets = db
    .prepare(
      `SELECT o.id, o.code, o.name,
        (SELECT COUNT(*) FROM transactions t WHERE t.outlet_id = o.id) as tx_count
       FROM outlets o ORDER BY o.name ASC`
    )
    .all();
  return NextResponse.json({ outlets });
}
