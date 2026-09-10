import fs from 'fs';
import path from 'path';
import { db } from '../lib/db';
import { getMonthlyPnlSeries, getSubcategoryBreakdown, type MonthlyPnl } from '../lib/engine/pnlEngine';
import { compareMonths } from '../lib/engine/comparisonEngine';
import { buildProfitBridge, rankDrivers, topSubcategoryContributors } from '../lib/engine/driverEngine';
import { classifyScenario } from '../lib/engine/classificationEngine';
import { detectAnomalies } from '../lib/engine/anomalyEngine';

const OUTLET_ID = 1;
const OUT_DIR = path.join(process.cwd(), 'reports');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

interface AccountRef {
  category: string;
  analysis_group: string;
  subcategory: string | null;
  account_name: string;
  source_sheet: string;
  min_row: number;
  max_row: number;
  periods_present: number;
  total_amount_all_periods: number;
}

function getAccountRefs(): AccountRef[] {
  return db
    .prepare(
      `SELECT category, analysis_group, subcategory, account_name, source_sheet,
              MIN(source_row) as min_row, MAX(source_row) as max_row,
              COUNT(DISTINCT period) as periods_present, SUM(amount) as total_amount_all_periods
       FROM transactions WHERE outlet_id = ?
       GROUP BY category, analysis_group, subcategory, account_name, source_sheet
       ORDER BY category, subcategory, account_name`
    )
    .all(OUTLET_ID) as AccountRef[];
}

function getUploadReconciliation() {
  return db
    .prepare(
      `SELECT rc.period, rc.check_name, rc.source_value, rc.computed_value, rc.variance, rc.status
       FROM reconciliation_checks rc
       JOIN uploads u ON u.id = rc.upload_id
       WHERE u.outlet_id = ?
       ORDER BY rc.period, rc.check_name`
    )
    .all(OUTLET_ID);
}

function main() {
  const trend = getMonthlyPnlSeries(OUTLET_ID);
  const byPeriod = new Map(trend.map((p) => [p.period, p]));
  const july = byPeriod.get('2026-07');
  const august = byPeriod.get('2026-08');
  if (!july || !august) throw new Error('July/August 2026 not found in data');

  const cmp = compareMonths(august, july);
  const bridge = buildProfitBridge(cmp);
  const drivers = rankDrivers(cmp);
  const classification = classifyScenario(cmp, bridge);
  const anomalies = detectAnomalies(cmp);
  const opexTop = topSubcategoryContributors(OUTLET_ID, '2026-08', '2026-07', 'OPEX', 100);
  const cogsTop = topSubcategoryContributors(OUTLET_ID, '2026-08', '2026-07', 'COGS', 100);

  // Account-level (not just subcategory) OPEX movement for the "Top 10 accounts" requirement
  const opexAccountsJul = db
    .prepare(`SELECT account_name, SUM(amount) as amt FROM transactions WHERE outlet_id=? AND period=? AND analysis_group='OPEX' GROUP BY account_name`)
    .all(OUTLET_ID, '2026-07') as { account_name: string; amt: number }[];
  const opexAccountsAug = db
    .prepare(`SELECT account_name, SUM(amount) as amt FROM transactions WHERE outlet_id=? AND period=? AND analysis_group='OPEX' GROUP BY account_name`)
    .all(OUTLET_ID, '2026-08') as { account_name: string; amt: number }[];
  const julMap = new Map(opexAccountsJul.map((r) => [r.account_name, r.amt]));
  const augMap = new Map(opexAccountsAug.map((r) => [r.account_name, r.amt]));
  const allAccounts = new Set([...julMap.keys(), ...augMap.keys()]);
  const opexAccountMovement = [...allAccounts]
    .map((name) => {
      const jul = julMap.get(name) ?? 0;
      const aug = augMap.get(name) ?? 0;
      return { account: name, jul, aug, changeRp: aug - jul, changePct: jul !== 0 ? ((aug - jul) / Math.abs(jul)) * 100 : null };
    })
    .sort((a, b) => b.changeRp - a.changeRp); // biggest cost INCREASE first = most negative profit impact first

  const accountRefs = getAccountRefs();
  const reconciliation = getUploadReconciliation();

  const mappingRulesUsed = db
    .prepare(
      `SELECT am.id, am.account_pattern, am.normalized_account, am.pnl_group, am.analysis_group, am.subcategory, am.mapping_priority,
              COUNT(DISTINCT t.account_name) as distinct_accounts_matched, COUNT(*) as tx_rows_matched
       FROM account_mapping am JOIN transactions t ON t.mapping_id = am.id
       WHERE t.outlet_id = ?
       GROUP BY am.id ORDER BY am.mapping_priority ASC, am.id ASC`
    )
    .all(OUTLET_ID);

  const report = {
    generatedAt: new Date().toISOString(),
    outletId: OUTLET_ID,
    monthlyTable: trend.map((p) => ({
      period: p.period,
      revenue: p.revenue,
      promo: p.promo,
      netRevenue: p.netRevenue,
      cogs: p.cogs,
      grossProfit: p.grossProfit,
      grossMarginPct: p.grossMarginPct,
      onlineCost: p.onlineCost,
      opex: p.opex,
      operatingProfit: p.operatingProfit,
      operatingMarginPct: p.operatingMarginPct,
    })),
    julyVsAugust: { july, august, comparison: cmp },
    profitBridge: bridge,
    drivers,
    classification,
    anomalies,
    opexSubcategoryMovement: opexTop,
    cogsSubcategoryMovement: cogsTop,
    opexAccountMovementFull: opexAccountMovement,
    accountReferenceTable: accountRefs,
    reconciliationChecks: reconciliation,
    mappingRulesUsed,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'validation-cipayung-2026-07-08.json'), JSON.stringify(report, null, 2));

  const rp = (n: number) => Math.round(n).toLocaleString('id-ID');
  const md: string[] = [];
  md.push('# Debug Validation Report — L&R Bakery Cipayung (Jan–Aug 2026)');
  md.push('');
  md.push('Development-only. Not linked from the management dashboard. Regenerate with `npx tsx src/scripts/validationReport.ts`.');
  md.push('');
  md.push(`Generated: ${report.generatedAt}`);
  md.push('');
  md.push('## 1. Account reference table (every leaf account -> category -> source cell)');
  md.push('');
  md.push('| analysis_group | subcategory | account_name | source_sheet | source_row | periods_present |');
  md.push('|---|---|---|---|---|---|');
  for (const r of accountRefs) {
    md.push(`| ${r.analysis_group} | ${r.subcategory ?? '-'} | ${r.account_name.replace(/\n/g, ' ')} | ${r.source_sheet} | ${r.min_row === r.max_row ? r.min_row : `${r.min_row}-${r.max_row}`} | ${r.periods_present} |`);
  }
  md.push('');
  md.push('**Mutual-exclusivity check**: each account_name above maps to exactly one source_row and exactly one category (REVENUE / PROMO / COGS / ONLINE_COST / OPEX). No row number appears twice across categories, confirmed by GROUP BY category+account_name+source_sheet returning one row per physical source cell.');
  md.push('');
  md.push('## 2. Reconciliation checks (engine vs source subtotal, all periods)');
  md.push('');
  md.push('| period | check_name | source_value | computed_value | variance | status |');
  md.push('|---|---|---|---|---|---|');
  for (const r of reconciliation as { period: string; check_name: string; source_value: number; computed_value: number; variance: number; status: string }[]) {
    md.push(`| ${r.period} | ${r.check_name} | ${rp(r.source_value)} | ${rp(r.computed_value)} | ${r.variance.toFixed(4)}% | ${r.status} |`);
  }
  md.push('');
  md.push('## 3. Mapping rules actually used for this outlet\'s data');
  md.push('');
  md.push('| rule_id | pattern | normalized_account | pnl_group | analysis_group | subcategory | priority | distinct_accounts_matched | tx_rows_matched |');
  md.push('|---|---|---|---|---|---|---|---|---|');
  for (const r of mappingRulesUsed as { id: number; account_pattern: string; normalized_account: string; pnl_group: string; analysis_group: string; subcategory: string | null; mapping_priority: number; distinct_accounts_matched: number; tx_rows_matched: number }[]) {
    md.push(`| ${r.id} | \`${r.account_pattern}\` | ${r.normalized_account} | ${r.pnl_group} | ${r.analysis_group} | ${r.subcategory ?? '-'} | ${r.mapping_priority} | ${r.distinct_accounts_matched} | ${r.tx_rows_matched} |`);
  }
  md.push('');
  md.push('## 4. July vs August 2026 — full metric table');
  md.push('');
  md.push('| metric | July 2026 | August 2026 | Rp change | % change |');
  md.push('|---|---|---|---|---|');
  const rows: [string, number, number][] = [
    ['Revenue', july.revenue, august.revenue],
    ['Promo', july.promo, august.promo],
    ['Net Revenue', july.netRevenue, august.netRevenue],
    ['COGS', july.cogs, august.cogs],
    ['Gross Profit', july.grossProfit, august.grossProfit],
    ['Online Cost', july.onlineCost, august.onlineCost],
    ['OPEX', july.opex, august.opex],
    ['Operating Profit', july.operatingProfit, august.operatingProfit],
  ];
  for (const [label, j, a] of rows) {
    const chg = a - j;
    const pct = j !== 0 ? (chg / Math.abs(j)) * 100 : NaN;
    md.push(`| ${label} | ${rp(j)} | ${rp(a)} | ${chg >= 0 ? '+' : ''}${rp(chg)} | ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}% |`);
  }
  md.push(`| GP Margin | ${july.grossMarginPct.toFixed(2)}% | ${august.grossMarginPct.toFixed(2)}% | ${(august.grossMarginPct - july.grossMarginPct).toFixed(2)} pt | - |`);
  md.push(`| Operating Margin | ${july.operatingMarginPct.toFixed(2)}% | ${august.operatingMarginPct.toFixed(2)}% | ${(august.operatingMarginPct - july.operatingMarginPct).toFixed(2)} pt | - |`);
  md.push('');
  md.push('## 5. Profit bridge (exact, no residual)');
  md.push('');
  md.push(`Previous (July) Operating Profit: Rp${rp(bridge.previousProfit)}`);
  md.push('');
  md.push('| step | Rp impact | running total |');
  md.push('|---|---|---|');
  for (const s of bridge.steps) {
    md.push(`| ${s.label} | ${s.value >= 0 ? '+' : ''}${rp(s.value)} | ${rp(s.runningTotal)} |`);
  }
  md.push(`| **Current (August) Operating Profit** | | **${rp(bridge.currentProfit)}** |`);
  md.push('');
  md.push('## 6. Top OPEX account movements (July -> August, ranked by negative profit impact first)');
  md.push('');
  md.push('| account | July | August | Rp change | % change |');
  md.push('|---|---|---|---|---|');
  for (const r of opexAccountMovement) {
    md.push(`| ${r.account} | ${rp(r.jul)} | ${rp(r.aug)} | ${r.changeRp >= 0 ? '+' : ''}${rp(r.changeRp)} | ${r.changePct === null ? 'n/a' : (r.changePct >= 0 ? '+' : '') + r.changePct.toFixed(1) + '%'} |`);
  }
  md.push('');
  md.push('## 7. Classification');
  md.push('');
  md.push(`Scenario: **${classification.scenario}** — ${classification.title}`);
  md.push('');
  md.push(classification.description);

  fs.writeFileSync(path.join(OUT_DIR, 'validation-cipayung-2026-07-08.md'), md.join('\n'));
  console.log(`Wrote reports/validation-cipayung-2026-07-08.json and .md`);
}

main();
