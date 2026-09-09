'use client';

import { useRef, useState } from 'react';
import { formatPeriodLabel } from '@/lib/format';

interface UploadResult {
  status: 'completed' | 'duplicate_skipped';
  outletName: string;
  filename: string;
  detectedPeriods: string[];
  sheetsTotal: number;
  sheetsUsed: number;
  sheetsIgnored: number;
  rowsProcessed: number;
  rowsMapped: number;
  rowsUnmapped: number;
  dataQualityPct: number;
  message: string;
  reconciliation: { key: string; period: string; status: string; variancePct: number }[];
}

export default function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [outletName, setOutletName] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (outletName.trim()) fd.append('outletName', outletName.trim());
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload gagal.');
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload gagal.');
    } finally {
      setBusy(false);
    }
  }

  const mismatches = result?.reconciliation.filter((r) => r.status === 'MISMATCH') ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight">Upload Laporan Keuangan</h1>
      <p className="text-sm text-neutral-500 mt-1 mb-6">
        Upload file Excel laporan keuangan outlet. Sistem otomatis mendeteksi sheet, mem-parsing, menormalisasi,
        melakukan mapping akun, dan menghitung P&L bulanan — tanpa proses manual.
      </p>

      <div
        className={`card border-dashed p-8 text-center cursor-pointer transition-colors ${dragOver ? 'bg-emerald-50 border-emerald-300' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) setFile(f);
        }}
      >
        <div className="text-3xl mb-2">📄</div>
        <div className="text-sm font-medium">{file ? file.name : 'Klik atau drag & drop file Excel di sini'}</div>
        <div className="text-xs text-neutral-500 mt-1">Format .xlsx, maksimum 25MB</div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="mt-4">
        <label className="text-xs text-neutral-500 flex flex-col gap-1">
          Nama Outlet (opsional — otomatis dideteksi dari nama file jika dikosongkan)
          <input
            type="text"
            className="border border-neutral-200 rounded-lg px-3 py-2 text-sm"
            placeholder="mis. L&R Bakery Cipayung"
            value={outletName}
            onChange={(e) => setOutletName(e.target.value)}
          />
        </label>
      </div>

      <button
        onClick={submit}
        disabled={!file || busy}
        className="mt-4 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors"
      >
        {busy ? 'Memproses...' : 'Upload & Proses'}
      </button>

      {error && <div className="card border-red-200 bg-red-50 text-red-700 text-sm p-4 mt-6">{error}</div>}

      {result && (
        <div className="card p-5 mt-6 space-y-4">
          <div className="font-semibold text-sm">
            {result.status === 'duplicate_skipped' ? 'File Sudah Pernah Diupload' : 'Upload Berhasil'}
          </div>
          <div className="text-sm text-neutral-600">{result.message}</div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <Stat label="Outlet" value={result.outletName} />
            <Stat label="Periode Terdeteksi" value={`${result.detectedPeriods.length} bulan`} />
            <Stat label="Rentang Periode" value={result.detectedPeriods.length ? `${formatPeriodLabel(result.detectedPeriods[0])} – ${formatPeriodLabel(result.detectedPeriods[result.detectedPeriods.length - 1])}` : '-'} />
            <Stat label="Sheet Diproses" value={`${result.sheetsUsed} / ${result.sheetsTotal}`} />
            <Stat label="Sheet Diabaikan" value={String(result.sheetsIgnored)} />
            <Stat label="Data Quality" value={`${result.dataQualityPct}%`} highlight={result.dataQualityPct >= 95 ? 'good' : result.dataQualityPct >= 80 ? 'ok' : 'bad'} />
            <Stat label="Baris Diproses" value={String(result.rowsProcessed)} />
            <Stat label="Baris Ter-mapping" value={String(result.rowsMapped)} />
            <Stat label="Baris Unmapped" value={String(result.rowsUnmapped)} highlight={result.rowsUnmapped > 0 ? 'bad' : 'good'} />
          </div>

          {mismatches.length > 0 && (
            <div className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg p-3">
              {mismatches.length} pengecekan rekonsiliasi memiliki selisih di atas toleransi — lihat halaman Data Quality untuk detail.
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <a href="/profitability" className="text-sm text-emerald-600 underline">Lihat Dashboard →</a>
            {result.rowsUnmapped > 0 && (
              <a href="/data-quality" className="text-sm text-orange-600 underline">Tinjau Akun Unmapped →</a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: 'good' | 'ok' | 'bad' }) {
  const color = highlight === 'good' ? 'text-emerald-600' : highlight === 'bad' ? 'text-red-600' : highlight === 'ok' ? 'text-orange-600' : 'text-neutral-800';
  return (
    <div className="border border-neutral-100 rounded-lg p-2.5">
      <div className="text-[11px] text-neutral-500">{label}</div>
      <div className={`font-medium ${color}`}>{value}</div>
    </div>
  );
}
