<?php
/**
 * index.php — обёртка для статического HTML с nonce-based CSP
 * ----------------------------------------------------------------------------
 * Если у вас статичный skyline-2026.html, но хостинг поддерживает PHP —
 * переименуйте его в skyline-2026.php (или подключите как index.php),
 * и используйте этот файл как шаблон.
 *
 * Что делает:
 *   1. Генерирует CSP nonce на каждый запрос.
 *   2. Шлёт strict CSP + все security headers.
 *   3. Читает HTML лендинга и подставляет nonce во все inline <script>.
 *   4. Шлёт session cookie и CSRF-токен в <meta>.
 *   5. Выводит итоговый HTML.
 *
 * Альтернатива для чистой статики без PHP:
 *   - Cloudflare Worker (см. cloudflare-worker.js)
 *   - nginx + $request_id + sub_filter
 *   - SSI (server-side includes)
 */

declare(strict_types=1);

session_name('SKYLINESESSID');
session_set_cookie_params([
    'lifetime' => 1800, 'path' => '/', 'domain' => '',
    'secure'   => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
                  || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https'),
    'httponly' => true, 'samesite' => 'Strict',
]);
session_start();

// --- NONCE (URL-safe base64, 18 байт = 24 символа) ---
$nonce = rtrim(strtr(base64_encode(random_bytes(18)), '+/', '-_'), '=');

// --- CSRF-токен (сессионный) ---
if (empty($_SESSION['csrf_token']) || (time() - ($_SESSION['csrf_created'] ?? 0) > 1800)) {
    $_SESSION['csrf_token']  = bin2hex(random_bytes(32));
    $_SESSION['csrf_created'] = time();
}
$csrf = $_SESSION['csrf_token'];

// --- HEADERS (strict CSP) ---
header('Strict-Transport-Security: max-age=63072000; includeSubDomains; preload');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: geolocation=(self https://yandex.ru), camera=(), microphone=(), display-capture=(), fullscreen=(self), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=()');
header('Cross-Origin-Opener-Policy: same-origin');
header('Cross-Origin-Embedder-Policy: require-corp');
header('Cross-Origin-Resource-Policy: same-origin');
header('X-Permitted-Cross-Domain-Policies: none');
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

header("Content-Security-Policy: default-src 'self'; "
    . "script-src 'self' 'nonce-{$nonce}' 'strict-dynamic'; "
    . "style-src 'self' 'nonce-{$nonce}'; "
    . "img-src 'self' data: https:; "
    . "font-src 'self'; "
    . "connect-src 'self' https://api.telegram.org; "
    . "frame-src https://yandex.ru; "
    . "object-src 'none'; "
    . "base-uri 'self'; "
    . "form-action 'self'; "
    . "frame-ancestors 'none'; "
    . "manifest-src 'self'; "
    . "worker-src 'self'; "
    . "child-src 'self'; "
    . "upgrade-insecure-requests");

// --- Читаем исходный HTML ---
$html = file_get_contents(__DIR__ . '/skyline-2026.html');

// 1. Инжектим nonce во все inline <script>, у которых его нет.
//    Не трогаем <script src="..."> (для них 'self' достаточно).
$html = preg_replace_callback(
    '/<script(?![^>]*\bsrc=)([^>]*)>/i',
    function ($m) use ($nonce) {
        $attrs = $m[1];
        if (preg_match('/\bnonce=/i', $attrs)) return $m[0];
        return "<script{$attrs} nonce=\"{$nonce}\">";
    },
    $html
);

// 2. Вставляем <meta name="csrf-token"> + nonce в <head>
$meta_block = "<meta name=\"csrf-token\" content=\"{$csrf}\">\n"
            . "  <meta name=\"csp-nonce\" content=\"{$nonce}\">\n";
$html = preg_replace('/<head([^>]*)>/i', '<head$1>' . "\n" . $meta_block, $html, 1);

// 3. Подключаем CSRF-скрипт (тоже с nonce)
if (strpos($html, 'csrf.js') === false) {
    $html = preg_replace(
        '/<\/head>/i',
        "<script nonce=\"{$nonce}\" src=\"/security/snippets/csrf.js\" defer></script>\n</head>",
        $html,
        1
    );
}

// 4. Удаляем старый инлайн-<meta http-equiv="Content-Security-Policy"> из HTML,
//    потому что шлём настоящий заголовок.
$html = preg_replace(
    '/<meta\s+http-equiv=["\']Content-Security-Policy["\'][^>]*>\s*/i',
    '',
    $html
);

echo $html;
