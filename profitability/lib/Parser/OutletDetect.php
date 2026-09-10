<?php

namespace App\Parser;

/** Ported 1:1 from src/lib/parser/outletDetect.ts. */
final class OutletDetect
{
    public static function detectOutletName(string $filename): string
    {
        $base = preg_replace('/\.(xlsx|xls|csv)$/i', '', $filename);
        $base = preg_replace('/^\s*\d+[.)]\s*/', '', $base); // leading "08. "
        $base = trim(preg_replace('/\(\d+\)\s*$/', '', $base)); // trailing "(1)"
        // trailing period-range like "Jan-Agustus'26", "Januari - Agustus 2026"
        $base = trim(preg_replace('/\s+[A-Za-z]+\s*[-\x{2013}]\s*[A-Za-z]+\s*\'?\d{2,4}\s*$/iu', '', $base));
        $base = preg_replace('/_+/', ' ', $base);
        $base = trim(preg_replace('/\s+/', ' ', $base));
        return $base !== '' ? $base : 'Unknown Outlet';
    }

    public static function slugifyCode(string $name): string
    {
        $slug = mb_strtolower($name);
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
        $slug = preg_replace('/(^-|-$)/', '', $slug);
        return mb_substr($slug, 0, 60);
    }

    public static function sanitizeFilename(string $filename): string
    {
        $clean = preg_replace('/[\/\\\\?%*:|"<>]/', '_', $filename);
        return mb_substr($clean, 0, 200);
    }
}
