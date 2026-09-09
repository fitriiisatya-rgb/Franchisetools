import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const outletId = req.nextUrl.searchParams.get('outletId');

  const uploads = db
    .prepare(
      `SELECT u.id, u.filename, u.status, u.detected_periods, u.sheets_total, u.sheets_used, u.sheets_ignored,
              u.rows_processed, u.rows_mapped, u.rows_unmapped, u.data_quality_pct, u.uploaded_at, u.debug_log,
              o.name as outlet_name, o.id as outlet_id
       FROM uploads u JOIN outlets o ON o.id = u.outlet_id
       ${outletId ? 'WHERE u.outlet_id = ?' : ''}
       ORDER BY u.uploaded_at DESC`
    )
    .all(...(outletId ? [Number(outletId)] : []));

  const unmappedQuery = outletId
    ? db.prepare(
        `SELECT account_name, source_sheet, COUNT(*) as occurrences, SUM(amount) as total_amount, MAX(period) as latest_period
         FROM transactions WHERE category = 'UNMAPPED' AND outlet_id = ?
         GROUP BY account_name, source_sheet ORDER BY occurrences DESC`
      ).all(Number(outletId))
    : db
        .prepare(
          `SELECT account_name, source_sheet, COUNT(*) as occurrences, SUM(amount) as total_amount, MAX(period) as latest_period
           FROM transactions WHERE category = 'UNMAPPED'
           GROUP BY account_name, source_sheet ORDER BY occurrences DESC`
        )
        .all();

  return NextResponse.json({
    uploads: uploads.map((u) => ({ ...(u as Record<string, unknown>), debug_log: JSON.parse(((u as Record<string, unknown>).debug_log as string) || '{}') })),
    unmappedAccounts: unmappedQuery,
  });
}
