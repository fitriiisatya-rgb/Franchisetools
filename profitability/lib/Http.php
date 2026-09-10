<?php

namespace App;

final class Http
{
    public static function jsonResponse($data, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function errorResponse(string $message, int $status = 400): never
    {
        self::jsonResponse(['error' => $message], $status);
    }

    public static function requireMethod(string $method): void
    {
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== $method) {
            self::errorResponse('Method not allowed', 405);
        }
    }

    /** Reads and JSON-decodes the request body; returns [] if empty/invalid. */
    public static function jsonBody(): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || $raw === '') {
            return [];
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }
}
