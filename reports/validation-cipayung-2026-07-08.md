# Debug Validation Report — L&R Bakery Cipayung (Jan–Aug 2026)

Development-only. Not linked from the management dashboard. Regenerate with `npx tsx src/scripts/validationReport.ts`.

Generated: 2026-09-10T02:26:21.196Z

## 1. Account reference table (every leaf account -> category -> source cell)

| analysis_group | subcategory | account_name | source_sheet | source_row | periods_present |
|---|---|---|---|---|---|
| COGS | HPP_BAHAN_BAKU | HPP Bahan Baku Langsung | PNL | 16 | 8 |
| COGS | HPP_KONSINYASI | HPP 70% Mitra (konsinyasi) | PNL | 14 | 9 |
| COGS | HPP_OFFLINE | HPP 60% Amorcakes Offline | PNL | 11 | 9 |
| COGS | HPP_ONLINE | HPP 60% Amorcakes Online | PNL | 12 | 9 |
| COGS | HPP_PROMO | HPP Promo | PNL | 17 | 9 |
| COGS | HPP_RETURN_EXPIRED | Over Budget Return Expired (hitungan Terlampir) | PNL | 15 | 9 |
| ONLINE_COST | COMMISSION | Komisi Penjualan Online | PNL | 13 | 9 |
| OPEX | ADMINISTRATION | Biaya Adm & Umum | PNL | 30 | 9 |
| OPEX | ADMINISTRATION | Biaya Adm Penjualan Non Tunai | PNL | 41 | 9 |
| OPEX | FRANCHISE_FEE | Management Fee | PNL | 44 | 9 |
| OPEX | FRANCHISE_FEE | Royalti Fee | PNL | 43 | 9 |
| OPEX | MAINTENANCE | Biaya Pemeliharaan Bangunan | PNL | 33 | 9 |
| OPEX | MAINTENANCE | Biaya Pemeliharaan Peralatan | PNL | 34 | 9 |
| OPEX | MANPOWER | Angsuran THR | PNL | 22 | 9 |
| OPEX | MANPOWER | Biaya Gaji Karyawan 10 | PNL | 21 | 9 |
| OPEX | MANPOWER | Biaya Tunjangan Karyawan | PNL | 23 | 9 |
| OPEX | MARKETING | Biaya Iklan & Promosi | PNL | 27 | 9 |
| OPEX | MARKETING | Biaya Marketing Tools | PNL | 26 | 9 |
| OPEX | OTHER_OPEX | Angsuran Pajak Reklame | PNL | 32 | 9 |
| OPEX | OTHER_OPEX | Biaya Kebersihan | PNL | 39 | 9 |
| OPEX | OTHER_OPEX | Biaya Operasional Lainnya | PNL | 40 | 9 |
| OPEX | OTHER_OPEX | Biaya Pajak Daerah | PNL | 37 | 9 |
| OPEX | OTHER_OPEX | Biaya Pajak PPh Final | PNL | 35 | 9 |
| OPEX | RENT | Angsuran Sewa | PNL | 24 | 9 |
| OPEX | SUPPLIES | Biaya ATK | PNL | 38 | 9 |
| OPEX | SUPPLIES | Biaya POS Sistem | PNL | 36 | 9 |
| OPEX | UTILITIES | Biaya Internet dan Telepon | PNL | 31 | 9 |
| OPEX | UTILITIES | Biaya Listrik dan Air | PNL | 29 | 9 |
| REVENUE | CONSIGNMENT | Pendapatan Konsinyasi | PNL | 6 | 9 |
| REVENUE | OFFLINE | Pendapatan Produk amorcakes offline | PNL | 3 | 9 |
| REVENUE | ONLINE | Pendapatan Adjustment Harga Online | PNL | 5 | 9 |
| REVENUE | ONLINE | Pendapatan Produk amorcakes Online (pengakuan harga normal) | PNL | 4 | 9 |
| PROMO | - | Promo/Discount | PNL | 7 | 9 |

**Mutual-exclusivity check**: each account_name above maps to exactly one source_row and exactly one category (REVENUE / PROMO / COGS / ONLINE_COST / OPEX). No row number appears twice across categories, confirmed by GROUP BY category+account_name+source_sheet returning one row per physical source cell.

## 2. Reconciliation checks (engine vs source subtotal, all periods)

| period | check_name | source_value | computed_value | variance | status |
|---|---|---|---|---|---|
| 2025-12 | GROSS_PROFIT_SOURCE | 87.241.423 | 87.241.423 | 0.0000% | OK |
| 2025-12 | NET_SALES | 355.778.480 | 355.778.480 | 0.0000% | OK |
| 2025-12 | OPERATING_PROFIT_SOURCE | 34.803.520 | 34.803.520 | 0.0000% | OK |
| 2025-12 | REVENUE_GROSS | 438.676.000 | 438.676.000 | 0.0000% | OK |
| 2025-12 | TOTAL_OPEX_SOURCE | 52.437.904 | 52.437.904 | 0.0000% | OK |
| 2026-01 | GROSS_PROFIT_SOURCE | 69.969.302 | 69.969.302 | 0.0000% | OK |
| 2026-01 | NET_SALES | 278.796.370 | 278.796.370 | 0.0000% | OK |
| 2026-01 | OPERATING_PROFIT_SOURCE | 22.964.810 | 22.964.810 | 0.0000% | OK |
| 2026-01 | REVENUE_GROSS | 335.694.650 | 335.694.650 | 0.0000% | OK |
| 2026-01 | TOTAL_OPEX_SOURCE | 47.004.492 | 47.004.492 | 0.0000% | OK |
| 2026-02 | GROSS_PROFIT_SOURCE | 52.863.072 | 52.863.072 | 0.0000% | OK |
| 2026-02 | NET_SALES | 210.808.123 | 210.808.123 | 0.0000% | OK |
| 2026-02 | OPERATING_PROFIT_SOURCE | 9.818.074 | 9.818.074 | 0.0000% | OK |
| 2026-02 | REVENUE_GROSS | 249.628.400 | 249.628.400 | 0.0000% | OK |
| 2026-02 | TOTAL_OPEX_SOURCE | 43.044.998 | 43.044.998 | 0.0000% | OK |
| 2026-03 | GROSS_PROFIT_SOURCE | 62.291.410 | 62.291.410 | 0.0000% | OK |
| 2026-03 | NET_SALES | 276.998.560 | 276.998.560 | 0.0000% | OK |
| 2026-03 | OPERATING_PROFIT_SOURCE | 17.444.707 | 17.444.707 | 0.0000% | OK |
| 2026-03 | REVENUE_GROSS | 343.823.400 | 343.823.400 | 0.0000% | OK |
| 2026-03 | TOTAL_OPEX_SOURCE | 44.846.703 | 44.846.703 | 0.0000% | OK |
| 2026-04 | GROSS_PROFIT_SOURCE | 60.161.962 | 60.161.962 | 0.0000% | OK |
| 2026-04 | NET_SALES | 238.494.330 | 238.494.330 | 0.0000% | OK |
| 2026-04 | OPERATING_PROFIT_SOURCE | 17.693.057 | 17.693.057 | 0.0000% | OK |
| 2026-04 | REVENUE_GROSS | 283.429.450 | 283.429.450 | 0.0000% | OK |
| 2026-04 | TOTAL_OPEX_SOURCE | 42.468.905 | 42.468.905 | 0.0000% | OK |
| 2026-05 | GROSS_PROFIT_SOURCE | 79.034.958 | 79.034.958 | 0.0000% | OK |
| 2026-05 | NET_SALES | 327.304.161 | 327.304.161 | 0.0000% | OK |
| 2026-05 | OPERATING_PROFIT_SOURCE | 23.301.662 | 23.301.662 | 0.0000% | OK |
| 2026-05 | REVENUE_GROSS | 389.451.025 | 389.451.025 | 0.0000% | OK |
| 2026-05 | TOTAL_OPEX_SOURCE | 55.733.296 | 55.733.296 | 0.0000% | OK |
| 2026-06 | GROSS_PROFIT_SOURCE | 96.213.331 | 96.213.331 | 0.0000% | OK |
| 2026-06 | NET_SALES | 403.126.272 | 403.126.272 | 0.0000% | OK |
| 2026-06 | OPERATING_PROFIT_SOURCE | 35.652.577 | 35.652.577 | 0.0000% | OK |
| 2026-06 | REVENUE_GROSS | 489.727.575 | 489.727.575 | 0.0000% | OK |
| 2026-06 | TOTAL_OPEX_SOURCE | 60.560.753 | 60.560.753 | 0.0000% | OK |
| 2026-07 | GROSS_PROFIT_SOURCE | 76.599.784 | 76.599.784 | 0.0000% | OK |
| 2026-07 | NET_SALES | 336.581.689 | 336.581.689 | 0.0000% | OK |
| 2026-07 | OPERATING_PROFIT_SOURCE | 23.942.103 | 23.942.103 | 0.0000% | OK |
| 2026-07 | REVENUE_GROSS | 410.702.875 | 410.702.875 | 0.0000% | OK |
| 2026-07 | TOTAL_OPEX_SOURCE | 52.657.681 | 52.657.681 | 0.0000% | OK |
| 2026-08 | GROSS_PROFIT_SOURCE | 77.053.515 | 77.053.515 | 0.0000% | OK |
| 2026-08 | NET_SALES | 343.037.963 | 343.037.963 | 0.0000% | OK |
| 2026-08 | OPERATING_PROFIT_SOURCE | 22.288.502 | 22.288.502 | 0.0000% | OK |
| 2026-08 | REVENUE_GROSS | 414.723.725 | 414.723.725 | 0.0000% | OK |
| 2026-08 | TOTAL_OPEX_SOURCE | 54.765.014 | 54.765.014 | 0.0000% | OK |

## 3. Mapping rules actually used for this outlet's data

| rule_id | pattern | normalized_account | pnl_group | analysis_group | subcategory | priority | distinct_accounts_matched | tx_rows_matched |
|---|---|---|---|---|---|---|---|---|
| 23 | `%biaya adm penjualan non tunai%` | OPEX_ADM_NON_TUNAI | OPEX | OPEX | ADMINISTRATION | 9 | 1 | 9 |
| 1 | `%pendapatan produk%offline%` | REVENUE_OFFLINE | REVENUE | REVENUE | OFFLINE | 10 | 1 | 9 |
| 2 | `%pendapatan produk%online%harga normal%` | REVENUE_ONLINE | REVENUE | REVENUE | ONLINE | 10 | 1 | 9 |
| 3 | `%pendapatan adjustment harga online%` | REVENUE_ONLINE_ADJUSTMENT | REVENUE | REVENUE | ONLINE | 10 | 1 | 9 |
| 4 | `%pendapatan konsinyasi%` | REVENUE_CONSIGNMENT | REVENUE | REVENUE | CONSIGNMENT | 10 | 1 | 9 |
| 5 | `%promo%discount%` | PROMO_DISCOUNT | SALES_DEDUCTION | PROMO | - | 10 | 1 | 9 |
| 6 | `%hpp%offline%` | COGS_OFFLINE | COGS | COGS | HPP_OFFLINE | 10 | 1 | 9 |
| 7 | `%hpp%online%` | COGS_ONLINE | COGS | COGS | HPP_ONLINE | 10 | 1 | 9 |
| 8 | `%hpp%mitra%` | COGS_KONSINYASI | COGS | COGS | HPP_KONSINYASI | 10 | 1 | 9 |
| 9 | `%over budget return%` | COGS_RETURN_EXPIRED | COGS | COGS | HPP_RETURN_EXPIRED | 10 | 1 | 9 |
| 10 | `%hpp bahan baku%` | COGS_BAHAN_BAKU | COGS | COGS | HPP_BAHAN_BAKU | 10 | 1 | 8 |
| 11 | `%hpp promo%` | COGS_PROMO | COGS | COGS | HPP_PROMO | 10 | 1 | 9 |
| 12 | `%komisi%online%` | ONLINE_COMMISSION | ONLINE_COST | ONLINE_COST | COMMISSION | 10 | 1 | 9 |
| 14 | `%biaya gaji karyawan%` | OPEX_GAJI_KARYAWAN | OPEX | OPEX | MANPOWER | 10 | 1 | 9 |
| 15 | `%angsuran thr%` | OPEX_THR | OPEX | OPEX | MANPOWER | 10 | 1 | 9 |
| 16 | `%tunjangan karyawan%` | OPEX_TUNJANGAN | OPEX | OPEX | MANPOWER | 10 | 1 | 9 |
| 17 | `%angsuran sewa%` | OPEX_SEWA | OPEX | OPEX | RENT | 10 | 1 | 9 |
| 18 | `%biaya marketing tools%` | OPEX_MARKETING_TOOLS | OPEX | OPEX | MARKETING | 10 | 1 | 9 |
| 19 | `%biaya iklan%promosi%` | OPEX_IKLAN_PROMOSI | OPEX | OPEX | MARKETING | 10 | 1 | 9 |
| 20 | `%biaya listrik%air%` | OPEX_LISTRIK_AIR | OPEX | OPEX | UTILITIES | 10 | 1 | 9 |
| 21 | `%biaya internet%telepon%` | OPEX_INTERNET_TELEPON | OPEX | OPEX | UTILITIES | 10 | 1 | 9 |
| 22 | `%biaya adm%umum%` | OPEX_ADM_UMUM | OPEX | OPEX | ADMINISTRATION | 10 | 1 | 9 |
| 24 | `%pemeliharaan bangunan%` | OPEX_MAINTENANCE_BUILDING | OPEX | OPEX | MAINTENANCE | 10 | 1 | 9 |
| 25 | `%pemeliharaan peralatan%` | OPEX_MAINTENANCE_EQUIPMENT | OPEX | OPEX | MAINTENANCE | 10 | 1 | 9 |
| 26 | `%biaya pos sistem%` | OPEX_POS_SYSTEM | OPEX | OPEX | SUPPLIES | 10 | 1 | 9 |
| 27 | `%biaya atk%` | OPEX_ATK | OPEX | OPEX | SUPPLIES | 10 | 1 | 9 |
| 28 | `%royalti fee%` | OPEX_ROYALTI_FEE | OPEX | OPEX | FRANCHISE_FEE | 10 | 1 | 9 |
| 29 | `%management fee%` | OPEX_MANAGEMENT_FEE | OPEX | OPEX | FRANCHISE_FEE | 10 | 1 | 9 |
| 30 | `%pajak reklame%` | OPEX_PAJAK_REKLAME | OPEX | OPEX | OTHER_OPEX | 10 | 1 | 9 |
| 31 | `%pajak pph final%` | OPEX_PPH_FINAL | OPEX | OPEX | OTHER_OPEX | 10 | 1 | 9 |
| 32 | `%pajak daerah%` | OPEX_PAJAK_DAERAH | OPEX | OPEX | OTHER_OPEX | 10 | 1 | 9 |
| 33 | `%biaya kebersihan%` | OPEX_KEBERSIHAN | OPEX | OPEX | OTHER_OPEX | 10 | 1 | 9 |
| 34 | `%biaya operasional lainnya%` | OPEX_LAINNYA | OPEX | OPEX | OTHER_OPEX | 10 | 1 | 9 |

## 4. July vs August 2026 — full metric table

| metric | July 2026 | August 2026 | Rp change | % change |
|---|---|---|---|---|
| Revenue | 410.702.875 | 414.723.725 | +4.020.850 | +0.98% |
| Promo | 74.121.186 | 71.685.762 | -2.435.424 | -3.29% |
| Net Revenue | 336.581.689 | 343.037.963 | +6.456.274 | +1.92% |
| COGS | 226.431.608 | 228.473.482 | +2.041.874 | +0.90% |
| Gross Profit | 110.150.081 | 114.564.481 | +4.414.400 | +4.01% |
| Online Cost | 33.550.297 | 37.510.966 | +3.960.669 | +11.81% |
| OPEX | 52.657.681 | 54.765.014 | +2.107.333 | +4.00% |
| Operating Profit | 23.942.103 | 22.288.502 | -1.653.602 | -6.91% |
| GP Margin | 26.82% | 27.62% | 0.80 pt | - |
| Operating Margin | 5.83% | 5.37% | -0.46 pt | - |

## 5. Profit bridge (exact, no residual)

Previous (July) Operating Profit: Rp23.942.103

| step | Rp impact | running total |
|---|---|---|
| Dampak Perubahan Omzet | +4.020.850 | 27.962.953 |
| Dampak HPP | -2.041.874 | 25.921.080 |
| Dampak Promo | +2.435.424 | 28.356.504 |
| Dampak Komisi Online | -3.960.669 | 24.395.835 |
| Dampak OPEX | -2.107.333 | 22.288.502 |
| **Current (August) Operating Profit** | | **22.288.502** |

## 6. Top OPEX account movements (July -> August, ranked by negative profit impact first)

| account | July | August | Rp change | % change |
|---|---|---|---|---|
| Biaya Tunjangan Karyawan | 525.000 | 2.475.272 | +1.950.272 | +371.5% |
| Biaya Operasional Lainnya | 766.592 | 1.772.117 | +1.005.525 | +131.2% |
| Management Fee | 13.463.268 | 13.721.519 | +258.251 | +1.9% |
| Biaya Kebersihan | 717.800 | 862.200 | +144.400 | +20.1% |
| Royalti Fee | 3.365.817 | 3.430.380 | +64.563 | +1.9% |
| Biaya Adm & Umum | 78.000 | 130.000 | +52.000 | +66.7% |
| Biaya Adm Penjualan Non Tunai | 560.709 | 570.824 | +10.115 | +1.8% |
| Biaya Pemeliharaan Peralatan | 821.000 | 829.000 | +8.000 | +1.0% |
| Angsuran Pajak Reklame | 2.166.667 | 2.166.667 | +0 | +0.0% |
| Angsuran Sewa | 8.333.333 | 8.333.333 | +0 | +0.0% |
| Angsuran THR | 1.208.333 | 1.208.333 | +0 | +0.0% |
| Biaya POS Sistem | 250.000 | 250.000 | +0 | +0.0% |
| Biaya Pajak Daerah | 0 | 0 | +0 | n/a |
| Biaya Pajak PPh Final | 0 | 0 | +0 | n/a |
| Biaya Pemeliharaan Bangunan | 0 | 0 | +0 | n/a |
| Biaya Internet dan Telepon | 365.745 | 363.126 | -2.619 | -0.7% |
| Biaya ATK | 396.915 | 390.621 | -6.294 | -1.6% |
| Biaya Listrik dan Air | 5.227.500 | 5.003.500 | -224.000 | -4.3% |
| Biaya Gaji Karyawan 10 | 12.829.502 | 12.541.921 | -287.581 | -2.2% |
| Biaya Marketing Tools | 432.000 | 0 | -432.000 | -100.0% |
| Biaya Iklan & Promosi | 1.149.500 | 716.201 | -433.299 | -37.7% |

## 7. Classification

Scenario: **SALES_GROWTH_NOT_CONVERTED** — Sales Growth Tidak Diikuti Profit Growth

Omzet naik 1.0%, tetapi profit turun 6.9%. Kenaikan penjualan belum berhasil dikonversi menjadi pertumbuhan laba, terutama akibat dampak komisi online sebesar -Rp4jt.