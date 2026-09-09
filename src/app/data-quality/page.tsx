'use client';

import { useEffect, useState } from 'react';
import { formatPeriodLabel, formatRupiahFull } from '@/lib/format';

interface UploadRow {
  id: number;
  filename: string;
  outlet_name: string;
  status: string;
  detected_periods: string;
  sheets_total: number;
  sheets_used: number;
  sheets_ignored: number;
  rows_processed: number;
  rows_mapped: number;
  rows_unmapped: number;
  data_quality_pct: number;
  uploaded_at: string;
  debug_log: {
    sheetDetection?: { sheetName: string; selected: boolean; reason: string }[];
    headerRow?: number;
    detectedFields?: string[];
    rowsScanned?: number;
    rowsSkippedEmpty?: number;
    mappingSuccess?: number;
    mappingFailed?: number;
  };
}

interface UnmappedAccount {
  account_name: string;
  source_sheet: string;
  occurrences: number;
  total_amount: number;
  latest_period: string;
}

const GROUPS = ['REVENUE', 'SALES_DEDUCTION', 'PROMO', 'COGS', 'ONLINE_COST', 'OPEX', 'OTHER_INCOME', 'OTHER_EXPENSE'];

export default function DataQualityPage() {
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [unmapped, setUnmapped] = useState<UnmappedAccount[]>([]);
  const [expandedUpload, setExpandedUpload] = useState<number | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ normalizedAccount: '', pnlGroup: 'OPEX', analysisGroup: 'OPEX', subcategory: '' });
  const [savingMsg, setSavingMsg] = useState<string | null>(null);

  function load() {
    fetch('/api/data-quality')
      .then((r) => r.json())
      .then((d) => {
        setUploads(d.uploads ?? []);
        setUnmapped(d.unmappedAccounts ?? []);
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function submitMapping(accountName: string) {
    setSavingMsg(null);
    const res = await fetch('/api/mapping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountPattern: `%${accountName.toLowerCase()}%`,
        normalizedAccount: form.normalizedAccount || accountName.toUpperCase().replace(/\s+/g, '_').slice(0, 60),
        pnlGroup: form.pnlGroup,
        analysisGroup: form.analysisGroup,
        subcategory: form.subcategory || null,
        mappingPriority: 5,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSavingMsg(data.error || 'Gagal menyimpan mapping.');
      return;
    }
    setSavingMsg(`Mapping disimpan. ${data.reclassified} transaksi unmapped berhasil diklasifikasi ulang.`);
    setEditing(null);
    load();
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Data Quality</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Status kualitas data hasil upload, log deteksi sheet, dan akun yang belum berhasil di-mapping.
        </p>
      </div>

      <section>
        <h2 className="font-semibold text-sm mb-3">Riwayat Upload</h2>
        <div className="space-y-3">
          {uploads.length === 0 && <div className="text-sm text-neutral-500">Belum ada upload.</div>}
          {uploads.map((u) => {
            const periods: string[] = JSON.parse(u.detected_periods || '[]');
            const expanded = expandedUpload === u.id;
            return (
              <div key={u.id} className="card p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{u.filename}</div>
                    <div className="text-xs text-neutral-500">
                      {u.outlet_name} • {periods.length ? `${formatPeriodLabel(periods[0])} – ${formatPeriodLabel(periods[periods.length - 1])}` : '-'} •{' '}
                      {new Date(u.uploaded_at).toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${u.data_quality_pct >= 95 ? 'bg-emerald-50 text-emerald-700' : u.data_quality_pct >= 80 ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'}`}>
                      Data Quality {u.data_quality_pct}%
                    </span>
                    <button
                      className="text-xs text-neutral-500 underline"
                      onClick={() => setExpandedUpload(expanded ? null : u.id)}
                    >
                      {expanded ? 'Sembunyikan detail' : 'Lihat detail'}
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="mt-4 pt-4 border-t border-neutral-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <DebugStat label="Sheet Total" value={u.sheets_total} />
                    <DebugStat label="Sheet Digunakan" value={u.sheets_used} />
                    <DebugStat label="Sheet Diabaikan" value={u.sheets_ignored} />
                    <DebugStat label="Header Row" value={(u.debug_log?.headerRow ?? 0) + 1} />
                    <DebugStat label="Baris Diproses" value={u.rows_processed} />
                    <DebugStat label="Baris Mapped" value={u.rows_mapped} />
                    <DebugStat label="Baris Unmapped" value={u.rows_unmapped} />
                    <DebugStat label="Baris Kosong Dilewati" value={u.debug_log?.rowsSkippedEmpty ?? 0} />
                    <div className="col-span-2 sm:col-span-4">
                      <div className="text-neutral-500 mb-1">Sheet terpilih sebagai sumber P&L:</div>
                      <div className="text-neutral-800">
                        {u.debug_log?.sheetDetection?.filter((s) => s.selected).map((s) => `${s.sheetName} — ${s.reason}`).join('; ') || '-'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-sm mb-1">Unmapped Accounts</h2>
        <p className="text-xs text-neutral-500 mb-3">
          Akun yang belum dikenali sistem. Tambahkan mapping sekali di sini — transaksi terkait (termasuk upload
          bulan berikutnya) akan otomatis terklasifikasi tanpa pekerjaan manual berulang.
        </p>
        {savingMsg && <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 mb-3">{savingMsg}</div>}
        {unmapped.length === 0 ? (
          <div className="card p-4 text-sm text-emerald-700 bg-emerald-50 border-emerald-200">Tidak ada akun unmapped. 🎉</div>
        ) : (
          <div className="space-y-2">
            {unmapped.map((a) => (
              <div key={a.account_name + a.source_sheet} className="card p-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{a.account_name}</div>
                    <div className="text-xs text-neutral-500">
                      Sheet: {a.source_sheet} • {a.occurrences}x • Total {formatRupiahFull(a.total_amount)} • Terakhir {formatPeriodLabel(a.latest_period)}
                    </div>
                  </div>
                  <button
                    className="text-xs text-emerald-600 underline shrink-0"
                    onClick={() => setEditing(editing === a.account_name ? null : a.account_name)}
                  >
                    {editing === a.account_name ? 'Batal' : '+ Tambah Mapping'}
                  </button>
                </div>
                {editing === a.account_name && (
                  <div className="mt-3 pt-3 border-t border-neutral-100 grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input
                      className="border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs"
                      placeholder="Normalized account (opsional)"
                      value={form.normalizedAccount}
                      onChange={(e) => setForm({ ...form, normalizedAccount: e.target.value })}
                    />
                    <select
                      className="border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs"
                      value={form.pnlGroup}
                      onChange={(e) => setForm({ ...form, pnlGroup: e.target.value, analysisGroup: e.target.value })}
                    >
                      {GROUPS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    <input
                      className="border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs"
                      placeholder="Subcategory (opsional)"
                      value={form.subcategory}
                      onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
                    />
                    <button
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
                      onClick={() => submitMapping(a.account_name)}
                    >
                      Simpan Mapping
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DebugStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-neutral-400">{label}</div>
      <div className="font-medium text-neutral-800">{value}</div>
    </div>
  );
}
