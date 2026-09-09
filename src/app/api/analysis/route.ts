import { NextRequest, NextResponse } from 'next/server';
import { buildFullAnalysis } from '@/lib/engine/analysisEngine';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const outletId = Number(req.nextUrl.searchParams.get('outletId'));
  const period = req.nextUrl.searchParams.get('period');
  const comparePeriod = req.nextUrl.searchParams.get('comparePeriod');

  if (!outletId || !period || !comparePeriod) {
    return NextResponse.json({ error: 'outletId, period, and comparePeriod are required' }, { status: 400 });
  }

  const analysis = buildFullAnalysis(outletId, period, comparePeriod);
  if (!analysis) {
    return NextResponse.json({ error: 'Data tidak ditemukan untuk periode yang dipilih.' }, { status: 404 });
  }
  return NextResponse.json(analysis);
}
