import { NextRequest, NextResponse } from 'next/server';
import { getAvailablePeriods } from '@/lib/engine/pnlEngine';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const outletId = Number(req.nextUrl.searchParams.get('outletId'));
  if (!outletId) return NextResponse.json({ error: 'outletId is required' }, { status: 400 });
  const periods = getAvailablePeriods(outletId);
  return NextResponse.json({ periods });
}
