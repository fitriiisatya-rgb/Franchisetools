import { NextRequest, NextResponse } from 'next/server';
import { ingestWorkbook, IngestValidationError } from '@/lib/ingest';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const outletName = formData.get('outletName');
    const outletCode = formData.get('outletCode');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File tidak ditemukan pada request.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await ingestWorkbook(buffer, file.name, {
      name: typeof outletName === 'string' && outletName.trim() ? outletName : undefined,
      code: typeof outletCode === 'string' && outletCode.trim() ? outletCode : undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof IngestValidationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error('Upload processing failed', err);
    return NextResponse.json({ error: 'Terjadi kesalahan internal saat memproses file.' }, { status: 500 });
  }
}
