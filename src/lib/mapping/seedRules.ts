export interface MappingRuleSeed {
  account_pattern: string; // '%' wildcard, case-insensitive
  normalized_account: string;
  pnl_group: string;
  analysis_group: string;
  subcategory: string | null;
  mapping_priority: number;
}

/**
 * Seed mapping rules. Specific literal labels from the pilot P&L sheet come first
 * (low priority number = matched first) so the exact source wording maps precisely.
 * Generic keyword rules follow so future uploads with different-but-similar wording
 * (new outlets, new months) still auto-classify without manual work.
 */
export const SEED_RULES: MappingRuleSeed[] = [
  // ---- REVENUE (leaf components only — the gross "Pendapatan Kotor" rollup and
  // "Penjualan Bersih" net rollup are reconciliation-only and derived, not stored) ----
  { account_pattern: '%pendapatan produk%offline%', normalized_account: 'REVENUE_OFFLINE', pnl_group: 'REVENUE', analysis_group: 'REVENUE', subcategory: 'OFFLINE', mapping_priority: 10 },
  { account_pattern: '%pendapatan produk%online%harga normal%', normalized_account: 'REVENUE_ONLINE', pnl_group: 'REVENUE', analysis_group: 'REVENUE', subcategory: 'ONLINE', mapping_priority: 10 },
  { account_pattern: '%pendapatan adjustment harga online%', normalized_account: 'REVENUE_ONLINE_ADJUSTMENT', pnl_group: 'REVENUE', analysis_group: 'REVENUE', subcategory: 'ONLINE', mapping_priority: 10 },
  { account_pattern: '%pendapatan konsinyasi%', normalized_account: 'REVENUE_CONSIGNMENT', pnl_group: 'REVENUE', analysis_group: 'REVENUE', subcategory: 'CONSIGNMENT', mapping_priority: 10 },

  // ---- PROMO / DISCOUNT ----
  { account_pattern: '%promo%discount%', normalized_account: 'PROMO_DISCOUNT', pnl_group: 'SALES_DEDUCTION', analysis_group: 'PROMO', subcategory: null, mapping_priority: 10 },

  // ---- COGS (pure product cost, online commission carved out separately) ----
  { account_pattern: '%hpp%offline%', normalized_account: 'COGS_OFFLINE', pnl_group: 'COGS', analysis_group: 'COGS', subcategory: 'HPP_OFFLINE', mapping_priority: 10 },
  { account_pattern: '%hpp%online%', normalized_account: 'COGS_ONLINE', pnl_group: 'COGS', analysis_group: 'COGS', subcategory: 'HPP_ONLINE', mapping_priority: 10 },
  { account_pattern: '%hpp%mitra%', normalized_account: 'COGS_KONSINYASI', pnl_group: 'COGS', analysis_group: 'COGS', subcategory: 'HPP_KONSINYASI', mapping_priority: 10 },
  { account_pattern: '%over budget return%', normalized_account: 'COGS_RETURN_EXPIRED', pnl_group: 'COGS', analysis_group: 'COGS', subcategory: 'HPP_RETURN_EXPIRED', mapping_priority: 10 },
  { account_pattern: '%hpp bahan baku%', normalized_account: 'COGS_BAHAN_BAKU', pnl_group: 'COGS', analysis_group: 'COGS', subcategory: 'HPP_BAHAN_BAKU', mapping_priority: 10 },
  { account_pattern: '%hpp promo%', normalized_account: 'COGS_PROMO', pnl_group: 'COGS', analysis_group: 'COGS', subcategory: 'HPP_PROMO', mapping_priority: 10 },

  // ---- ONLINE COMMISSION / PLATFORM FEE ----
  { account_pattern: '%komisi%online%', normalized_account: 'ONLINE_COMMISSION', pnl_group: 'ONLINE_COST', analysis_group: 'ONLINE_COST', subcategory: 'COMMISSION', mapping_priority: 10 },
  { account_pattern: '%komisi penjualan%', normalized_account: 'ONLINE_COMMISSION', pnl_group: 'ONLINE_COST', analysis_group: 'ONLINE_COST', subcategory: 'COMMISSION', mapping_priority: 15 },

  // ---- OPEX: Manpower ----
  { account_pattern: '%biaya gaji karyawan%', normalized_account: 'OPEX_GAJI_KARYAWAN', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'MANPOWER', mapping_priority: 10 },
  { account_pattern: '%angsuran thr%', normalized_account: 'OPEX_THR', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'MANPOWER', mapping_priority: 10 },
  { account_pattern: '%tunjangan karyawan%', normalized_account: 'OPEX_TUNJANGAN', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'MANPOWER', mapping_priority: 10 },

  // ---- OPEX: Rent ----
  { account_pattern: '%angsuran sewa%', normalized_account: 'OPEX_SEWA', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'RENT', mapping_priority: 10 },

  // ---- OPEX: Marketing ----
  { account_pattern: '%biaya marketing tools%', normalized_account: 'OPEX_MARKETING_TOOLS', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'MARKETING', mapping_priority: 10 },
  { account_pattern: '%biaya iklan%promosi%', normalized_account: 'OPEX_IKLAN_PROMOSI', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'MARKETING', mapping_priority: 10 },

  // ---- OPEX: Utilities ----
  { account_pattern: '%biaya listrik%air%', normalized_account: 'OPEX_LISTRIK_AIR', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'UTILITIES', mapping_priority: 10 },
  { account_pattern: '%biaya internet%telepon%', normalized_account: 'OPEX_INTERNET_TELEPON', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'UTILITIES', mapping_priority: 10 },

  // ---- OPEX: Administration ----
  { account_pattern: '%biaya adm%umum%', normalized_account: 'OPEX_ADM_UMUM', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'ADMINISTRATION', mapping_priority: 10 },
  { account_pattern: '%biaya adm penjualan non tunai%', normalized_account: 'OPEX_ADM_NON_TUNAI', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'ADMINISTRATION', mapping_priority: 9 },

  // ---- OPEX: Maintenance ----
  { account_pattern: '%pemeliharaan bangunan%', normalized_account: 'OPEX_MAINTENANCE_BUILDING', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'MAINTENANCE', mapping_priority: 10 },
  { account_pattern: '%pemeliharaan peralatan%', normalized_account: 'OPEX_MAINTENANCE_EQUIPMENT', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'MAINTENANCE', mapping_priority: 10 },

  // ---- OPEX: Supplies ----
  { account_pattern: '%biaya pos sistem%', normalized_account: 'OPEX_POS_SYSTEM', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'SUPPLIES', mapping_priority: 10 },
  { account_pattern: '%biaya atk%', normalized_account: 'OPEX_ATK', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'SUPPLIES', mapping_priority: 10 },

  // ---- OPEX: Franchise / Management fee ----
  { account_pattern: '%royalti fee%', normalized_account: 'OPEX_ROYALTI_FEE', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'FRANCHISE_FEE', mapping_priority: 10 },
  { account_pattern: '%management fee%', normalized_account: 'OPEX_MANAGEMENT_FEE', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'FRANCHISE_FEE', mapping_priority: 10 },

  // ---- OPEX: Other ----
  { account_pattern: '%pajak reklame%', normalized_account: 'OPEX_PAJAK_REKLAME', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'OTHER_OPEX', mapping_priority: 10 },
  { account_pattern: '%pajak pph final%', normalized_account: 'OPEX_PPH_FINAL', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'OTHER_OPEX', mapping_priority: 10 },
  { account_pattern: '%pajak daerah%', normalized_account: 'OPEX_PAJAK_DAERAH', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'OTHER_OPEX', mapping_priority: 10 },
  { account_pattern: '%biaya kebersihan%', normalized_account: 'OPEX_KEBERSIHAN', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'OTHER_OPEX', mapping_priority: 10 },
  { account_pattern: '%biaya operasional lainnya%', normalized_account: 'OPEX_LAINNYA', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'OTHER_OPEX', mapping_priority: 10 },

  // ---- Generic fallback keyword rules (broader net for future/other outlets) ----
  { account_pattern: '%penjualan%', normalized_account: 'REVENUE_GENERIC', pnl_group: 'REVENUE', analysis_group: 'REVENUE', subcategory: null, mapping_priority: 60 },
  { account_pattern: '%sales%', normalized_account: 'REVENUE_GENERIC', pnl_group: 'REVENUE', analysis_group: 'REVENUE', subcategory: null, mapping_priority: 60 },
  { account_pattern: '%omzet%', normalized_account: 'REVENUE_GENERIC', pnl_group: 'REVENUE', analysis_group: 'REVENUE', subcategory: null, mapping_priority: 60 },
  { account_pattern: '%diskon%', normalized_account: 'PROMO_GENERIC', pnl_group: 'SALES_DEDUCTION', analysis_group: 'PROMO', subcategory: null, mapping_priority: 55 },
  { account_pattern: '%voucher%', normalized_account: 'PROMO_GENERIC', pnl_group: 'SALES_DEDUCTION', analysis_group: 'PROMO', subcategory: null, mapping_priority: 55 },
  { account_pattern: '%subsidi%', normalized_account: 'PROMO_GENERIC', pnl_group: 'SALES_DEDUCTION', analysis_group: 'PROMO', subcategory: null, mapping_priority: 55 },
  { account_pattern: '%campaign%', normalized_account: 'PROMO_GENERIC', pnl_group: 'SALES_DEDUCTION', analysis_group: 'PROMO', subcategory: null, mapping_priority: 55 },
  { account_pattern: '%hpp%', normalized_account: 'COGS_GENERIC', pnl_group: 'COGS', analysis_group: 'COGS', subcategory: 'OTHER_COGS', mapping_priority: 65 },
  { account_pattern: '%cost of goods%', normalized_account: 'COGS_GENERIC', pnl_group: 'COGS', analysis_group: 'COGS', subcategory: 'OTHER_COGS', mapping_priority: 65 },
  { account_pattern: '%gofood%', normalized_account: 'ONLINE_COST_GOFOOD', pnl_group: 'ONLINE_COST', analysis_group: 'ONLINE_COST', subcategory: 'COMMISSION', mapping_priority: 20 },
  { account_pattern: '%grabfood%', normalized_account: 'ONLINE_COST_GRABFOOD', pnl_group: 'ONLINE_COST', analysis_group: 'ONLINE_COST', subcategory: 'COMMISSION', mapping_priority: 20 },
  { account_pattern: '%grab%', normalized_account: 'ONLINE_COST_GRAB', pnl_group: 'ONLINE_COST', analysis_group: 'ONLINE_COST', subcategory: 'COMMISSION', mapping_priority: 25 },
  { account_pattern: '%shopeefood%', normalized_account: 'ONLINE_COST_SHOPEEFOOD', pnl_group: 'ONLINE_COST', analysis_group: 'ONLINE_COST', subcategory: 'COMMISSION', mapping_priority: 20 },
  { account_pattern: '%shopee%', normalized_account: 'ONLINE_COST_SHOPEE', pnl_group: 'ONLINE_COST', analysis_group: 'ONLINE_COST', subcategory: 'COMMISSION', mapping_priority: 25 },
  { account_pattern: '%tiktok%', normalized_account: 'ONLINE_COST_TIKTOK', pnl_group: 'ONLINE_COST', analysis_group: 'ONLINE_COST', subcategory: 'COMMISSION', mapping_priority: 20 },
  { account_pattern: '%marketplace%', normalized_account: 'ONLINE_COST_MARKETPLACE', pnl_group: 'ONLINE_COST', analysis_group: 'ONLINE_COST', subcategory: 'COMMISSION', mapping_priority: 30 },
  { account_pattern: '%platform fee%', normalized_account: 'ONLINE_COST_PLATFORM_FEE', pnl_group: 'ONLINE_COST', analysis_group: 'ONLINE_COST', subcategory: 'COMMISSION', mapping_priority: 30 },
  { account_pattern: '%merchant fee%', normalized_account: 'ONLINE_COST_MERCHANT_FEE', pnl_group: 'ONLINE_COST', analysis_group: 'ONLINE_COST', subcategory: 'COMMISSION', mapping_priority: 30 },
  { account_pattern: '%service fee%', normalized_account: 'ONLINE_COST_SERVICE_FEE', pnl_group: 'ONLINE_COST', analysis_group: 'ONLINE_COST', subcategory: 'COMMISSION', mapping_priority: 30 },
  { account_pattern: '%affiliate%', normalized_account: 'ONLINE_COST_AFFILIATE', pnl_group: 'ONLINE_COST', analysis_group: 'ONLINE_COST', subcategory: 'AFFILIATE', mapping_priority: 30 },
  { account_pattern: '%komisi%', normalized_account: 'ONLINE_COST_GENERIC', pnl_group: 'ONLINE_COST', analysis_group: 'ONLINE_COST', subcategory: 'COMMISSION', mapping_priority: 70 },
  { account_pattern: '%gaji%', normalized_account: 'OPEX_GAJI_GENERIC', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'MANPOWER', mapping_priority: 60 },
  { account_pattern: '%salary%', normalized_account: 'OPEX_GAJI_GENERIC', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'MANPOWER', mapping_priority: 60 },
  { account_pattern: '%listrik%', normalized_account: 'OPEX_UTILITIES_GENERIC', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'UTILITIES', mapping_priority: 60 },
  { account_pattern: '%sewa%', normalized_account: 'OPEX_RENT_GENERIC', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'RENT', mapping_priority: 60 },
  { account_pattern: '%rent%', normalized_account: 'OPEX_RENT_GENERIC', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'RENT', mapping_priority: 60 },
  { account_pattern: '%marketing%', normalized_account: 'OPEX_MARKETING_GENERIC', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'MARKETING', mapping_priority: 65 },
  { account_pattern: '%maintenance%', normalized_account: 'OPEX_MAINTENANCE_GENERIC', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'MAINTENANCE', mapping_priority: 60 },
  { account_pattern: '%transport%', normalized_account: 'OPEX_TRANSPORT_GENERIC', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'TRANSPORT_DELIVERY', mapping_priority: 60 },
  { account_pattern: '%delivery%', normalized_account: 'OPEX_DELIVERY_GENERIC', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'TRANSPORT_DELIVERY', mapping_priority: 60 },
  { account_pattern: '%supplies%', normalized_account: 'OPEX_SUPPLIES_GENERIC', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'SUPPLIES', mapping_priority: 60 },
  { account_pattern: '%atk%', normalized_account: 'OPEX_SUPPLIES_GENERIC', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'SUPPLIES', mapping_priority: 60 },
  { account_pattern: '%administrasi%', normalized_account: 'OPEX_ADMIN_GENERIC', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'ADMINISTRATION', mapping_priority: 60 },
  { account_pattern: '%biaya operasional%', normalized_account: 'OPEX_GENERIC', pnl_group: 'OPEX', analysis_group: 'OPEX', subcategory: 'OTHER_OPEX', mapping_priority: 70 },
];
