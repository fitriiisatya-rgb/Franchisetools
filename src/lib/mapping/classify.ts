import { db } from '@/lib/db';
import { SEED_RULES } from './seedRules';

export interface MappingRuleRow {
  id: number;
  account_pattern: string;
  normalized_account: string;
  pnl_group: string;
  analysis_group: string;
  subcategory: string | null;
  mapping_priority: number;
}

export function ensureSeedRules() {
  const count = (db.prepare('SELECT COUNT(*) as c FROM account_mapping').get() as { c: number }).c;
  if (count > 0) return;
  const insert = db.prepare(`
    INSERT INTO account_mapping (account_pattern, normalized_account, pnl_group, analysis_group, subcategory, mapping_priority, match_type, source)
    VALUES (@account_pattern, @normalized_account, @pnl_group, @analysis_group, @subcategory, @mapping_priority, 'contains', 'seed')
  `);
  const tx = db.transaction((rules: typeof SEED_RULES) => {
    for (const r of rules) insert.run(r);
  });
  tx(SEED_RULES);
}

function patternToRegex(pattern: string): RegExp {
  const segments = pattern.toLowerCase().split('%');
  const escaped = segments.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp('^' + escaped + '$', 'is');
}

let cachedRules: (MappingRuleRow & { regex: RegExp })[] | null = null;

export function loadRules(forceReload = false): (MappingRuleRow & { regex: RegExp })[] {
  if (cachedRules && !forceReload) return cachedRules;
  const rows = db
    .prepare('SELECT * FROM account_mapping ORDER BY mapping_priority ASC, id ASC')
    .all() as MappingRuleRow[];
  cachedRules = rows.map((r) => ({ ...r, regex: patternToRegex(r.account_pattern) }));
  return cachedRules;
}

export interface ClassificationResult {
  mappingId: number | null;
  normalizedAccount: string;
  pnlGroup: string;
  analysisGroup: string;
  subcategory: string | null;
}

export function classifyAccount(accountName: string): ClassificationResult {
  const rules = loadRules();
  const haystack = accountName.toLowerCase().replace(/\s+/g, ' ').trim();
  for (const rule of rules) {
    if (rule.regex.test(haystack)) {
      return {
        mappingId: rule.id,
        normalizedAccount: rule.normalized_account,
        pnlGroup: rule.pnl_group,
        analysisGroup: rule.analysis_group,
        subcategory: rule.subcategory,
      };
    }
  }
  return {
    mappingId: null,
    normalizedAccount: accountName.trim().toUpperCase().slice(0, 60),
    pnlGroup: 'UNMAPPED',
    analysisGroup: 'UNMAPPED',
    subcategory: null,
  };
}
