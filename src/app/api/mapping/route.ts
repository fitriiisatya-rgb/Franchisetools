import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { loadRules, classifyAccount } from '@/lib/mapping/classify';

export const runtime = 'nodejs';

export async function GET() {
  const rules = db.prepare('SELECT * FROM account_mapping ORDER BY mapping_priority ASC, id ASC').all();
  return NextResponse.json({ rules });
}

const VALID_GROUPS = new Set(['REVENUE', 'SALES_DEDUCTION', 'PROMO', 'COGS', 'ONLINE_COST', 'OPEX', 'OTHER_INCOME', 'OTHER_EXPENSE']);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { accountPattern, normalizedAccount, pnlGroup, analysisGroup, subcategory, mappingPriority } = body ?? {};

  if (!accountPattern || !normalizedAccount || !pnlGroup || !analysisGroup) {
    return NextResponse.json({ error: 'accountPattern, normalizedAccount, pnlGroup, analysisGroup wajib diisi.' }, { status: 400 });
  }
  if (!VALID_GROUPS.has(pnlGroup) || !VALID_GROUPS.has(analysisGroup)) {
    return NextResponse.json({ error: `Group tidak valid. Pilih salah satu: ${[...VALID_GROUPS].join(', ')}` }, { status: 400 });
  }

  const info = db
    .prepare(
      `INSERT INTO account_mapping (account_pattern, normalized_account, pnl_group, analysis_group, subcategory, mapping_priority, match_type, source)
       VALUES (?, ?, ?, ?, ?, ?, 'contains', 'manual')`
    )
    .run(String(accountPattern), String(normalizedAccount), String(pnlGroup), String(analysisGroup), subcategory ? String(subcategory) : null, Number(mappingPriority) || 20);

  loadRules(true); // refresh cache so the new rule applies immediately

  // Reclassify any existing UNMAPPED transactions that now match this rule.
  const candidates = db.prepare(`SELECT id, account_name FROM transactions WHERE category = 'UNMAPPED'`).all() as { id: number; account_name: string }[];
  const update = db.prepare(
    `UPDATE transactions SET category = ?, subcategory = ?, analysis_group = ?, mapping_id = ? WHERE id = ?`
  );
  let reclassified = 0;
  const tx = db.transaction(() => {
    for (const c of candidates) {
      const cls = classifyAccount(c.account_name);
      if (cls.pnlGroup !== 'UNMAPPED') {
        update.run(cls.pnlGroup, cls.subcategory, cls.analysisGroup, cls.mappingId, c.id);
        reclassified++;
      }
    }
  });
  tx();

  return NextResponse.json({ ruleId: info.lastInsertRowid, reclassified });
}
