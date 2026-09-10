<?php

namespace App\Mapping;

use App\Db;

/** Ported 1:1 from src/lib/mapping/classify.ts. */
final class Classifier
{
    /** @var array<int, array{id:int, account_pattern:string, normalized_account:string, pnl_group:string, analysis_group:string, subcategory:?string, regex:string}>|null */
    private static ?array $cachedRules = null;

    public static function ensureSeedRules(): void
    {
        $pdo = Db::get();
        $count = (int) $pdo->query('SELECT COUNT(*) as c FROM account_mapping')->fetch()['c'];
        if ($count > 0) {
            return;
        }
        $insert = $pdo->prepare(
            'INSERT INTO account_mapping (account_pattern, normalized_account, pnl_group, analysis_group, subcategory, mapping_priority, match_type, source)
             VALUES (:account_pattern, :normalized_account, :pnl_group, :analysis_group, :subcategory, :mapping_priority, \'contains\', \'seed\')'
        );
        $pdo->beginTransaction();
        foreach (SeedRules::all() as $r) {
            $insert->execute($r);
        }
        $pdo->commit();
    }

    private static function patternToRegex(string $pattern): string
    {
        $segments = explode('%', mb_strtolower($pattern));
        $escaped = array_map(static fn ($s) => preg_quote($s, '/'), $segments);
        return '/^' . implode('.*', $escaped) . '$/isu';
    }

    /** @return array<int, array{id:int, account_pattern:string, normalized_account:string, pnl_group:string, analysis_group:string, subcategory:?string, mapping_priority:int, regex:string}> */
    public static function loadRules(bool $forceReload = false): array
    {
        if (self::$cachedRules !== null && !$forceReload) {
            return self::$cachedRules;
        }
        $pdo = Db::get();
        $rows = $pdo->query('SELECT * FROM account_mapping ORDER BY mapping_priority ASC, id ASC')->fetchAll();
        self::$cachedRules = array_map(static function ($r) {
            $r['regex'] = self::patternToRegex($r['account_pattern']);
            return $r;
        }, $rows);
        return self::$cachedRules;
    }

    /**
     * @return array{mappingId: ?int, normalizedAccount: string, pnlGroup: string, analysisGroup: string, subcategory: ?string}
     */
    public static function classifyAccount(string $accountName): array
    {
        $rules = self::loadRules();
        $haystack = trim(preg_replace('/\s+/', ' ', mb_strtolower($accountName)));
        foreach ($rules as $rule) {
            if (@preg_match($rule['regex'], $haystack) === 1) {
                return [
                    'mappingId' => (int) $rule['id'],
                    'normalizedAccount' => $rule['normalized_account'],
                    'pnlGroup' => $rule['pnl_group'],
                    'analysisGroup' => $rule['analysis_group'],
                    'subcategory' => $rule['subcategory'],
                ];
            }
        }
        return [
            'mappingId' => null,
            'normalizedAccount' => mb_substr(mb_strtoupper(trim($accountName)), 0, 60),
            'pnlGroup' => 'UNMAPPED',
            'analysisGroup' => 'UNMAPPED',
            'subcategory' => null,
        ];
    }
}
