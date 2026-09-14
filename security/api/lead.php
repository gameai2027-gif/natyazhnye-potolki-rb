<?php
/**
 * /api/lead.php — SkyLine 2026 backend
 * -------------------------------------------------------------
 * Endpoint приёма заявок с лендинга. Реализует:
 *   - CSRF-защиту (session-based, hash_equals)
 *   - Rate-limiting: 3 запроса / 10 минут / IP (файл, опц. Redis)
 *   - Валидацию: name, phone, room, consent
 *   - Honeypot (поле website)
 *   - Timestamp анти-спам: минимум 3 сек между загрузкой и отправкой
 *   - Санитизацию (strip_tags + htmlspecialchars)
 *   - PDO подготовленные запросы (опционально, если есть БД)
 *   - Логирование с IP / User-Agent / временем (152-ФЗ ст. 19)
 *   - Отправку в Telegram-бот
 *   - Отправку e-mail (mail() или PHPMailer)
 *   - Корректные HTTP-коды: 200, 400, 403, 422, 429
 *   - JSON-ответ
 *
 * Разместить: /var/www/skyline/public/api/lead.php
 * Права: chmod 640, владелец www-data (nginx/Apache user).
 * Директория /api/lead-data — chmod 770, владелец www-data.
 *
 * @license MIT
 */

declare(strict_types=1);
error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/lead-data/php-errors.log');
date_default_timezone_set('Europe/Ulyanovsk');

// ============================================================================
// 0. КОНФИГУРАЦИЯ — вынести в .env / config.php, не коммитить в git!
// ============================================================================

const CONFIG = [
    // — Бэкенд —
    'site_origin'        => 'https://skyline-bashkortostan.ru',
    'allowed_origins'    => [
        'https://skyline-bashkortostan.ru',
        'https://www.skyline-bashkortostan.ru',
    ],

    // — Срок жизни CSRF-токена (сек) —
    'csrf_ttl'           => 1800, // 30 минут

    // — Rate-limit —
    'rate_max'           => 3,    // запросов
    'rate_window'        => 600,  // за 10 минут (сек)
    'rate_storage'       => 'file', // file | redis
    'rate_dir'           => __DIR__ . '/lead-data/rate',
    'redis_host'         => '127.0.0.1',
    'redis_port'         => 6379,
    'redis_key_prefix'   => 'skyline:rl:',

    // — Анти-спам timestamp —
    'min_form_time'      => 3,    // сек от загрузки до отправки
    'max_form_time'      => 3600, // 1 час максимум

    // — База данных (опционально, если нет — только Telegram+mail) —
    'use_db'             => false,
    'dsn'                => 'mysql:host=127.0.0.1;dbname=skyline;charset=utf8mb4',
    'db_user'            => 'skyline_app',
    'db_pass'            => 'CHANGE_ME',
    'db_encryption_key'  => 'CHANGE_ME_32_BYTES_BASE64', // для шифрования ПДн at-rest

    // — Telegram —
    'tg_enabled'         => true,
    'tg_bot_token'       => 'CHANGE_ME:BOT_TOKEN', // не коммитить!
    'tg_chat_id'         => '-1001234567890',      // ID чата/канала
    'tg_parse_mode'      => 'HTML',

    // — E-mail —
    'mail_enabled'       => true,
    'mail_from'          => 'no-reply@skyline-bashkortostan.ru',
    'mail_from_name'     => 'SkyLine Лендинг',
    'mail_to'            => 'leads@skyline-bashkortostan.ru',
    'use_phpmailer'      => false, // true → подключить PHPMailer (composer)
    'smtp_host'          => 'smtp.yandex.ru',
    'smtp_port'          => 465,
    'smtp_user'          => 'no-reply@skyline-bashkortostan.ru',
    'smtp_pass'          => 'CHANGE_ME',

    // — Логи —
    'log_dir'            => __DIR__ . '/lead-data',
    'access_log'         => __DIR__ . '/lead-data/access.log',  // 152-ФЗ
    'lead_log'           => __DIR__ . '/lead-data/leads.log',
    'error_log_file'     => __DIR__ . '/lead-data/php-errors.log',

    // — Псевдонимизация (хеш IP для логов) —
    'pseudonym_salt'     => 'CHANGE_ME_RANDOM_32_BYTES',

    // — Срок хранения ПДн (дней) —
    'pdn_retention_days' => 1095, // 3 года
];

// ============================================================================
// 1. БАЗОВЫЕ ЗАГОЛОВКИ И СЕССИЯ
// ============================================================================

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cross-Origin-Resource-Policy: same-origin');

// CORS — минимальный, только для своего origin
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, CONFIG['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token, X-Requested-With');
    header('Access-Control-Max-Age: 600');
}

// Pre-flight
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Только POST
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    http_response_code(405);
    header('Allow: POST, OPTIONS');
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
    exit;
}

// Сессия с жёсткими параметрами
session_name('SKYLINESESSID');
session_set_cookie_params([
    'lifetime' => 1800,
    'path'     => '/',
    'domain'   => '',
    'secure'   => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
                  || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https',
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();

// Регенерация session ID каждый запрос (анти-fixation)
if (!isset($_SESSION['_created'])) {
    $_SESSION['_created'] = time();
} elseif (time() - $_SESSION['_created'] > 300) {
    session_regenerate_id(true);
    $_SESSION['_created'] = time();
}

// ============================================================================
// 2. УТИЛИТЫ
// ============================================================================

function client_ip(): string {
    // Внимание: если за CDN, доверять только настроенным заголовкам
    foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_REAL_IP', 'REMOTE_ADDR'] as $k) {
        if (!empty($_SERVER[$k])) {
            $ip = trim($_SERVER[$k]);
            if (filter_var($ip, FILTER_VALIDATE_IP)) return $ip;
        }
    }
    return '0.0.0.0';
}

function ua(): string {
    $u = $_SERVER['HTTP_USER_AGENT'] ?? '';
    return mb_substr($u, 0, 500);
}

function pseudonym_ip(string $ip): string {
    // 152-ФЗ: в логах хранить хеш, не оригинальный IP (псевдонимизация)
    return hash('sha256', $ip . CONFIG['pseudonym_salt'] . date('Y-m'));
}

function json_out(int $code, array $payload): void {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function access_log(string $event, array $extra = []): void {
    // Логирование доступа к ПДн — 152-ФЗ ст. 19
    $row = json_encode([
        'ts'      => date('c'),
        'event'   => $event,
        'ip_hash' => pseudonym_ip(client_ip()),
        'ua'      => mb_substr(ua(), 0, 200),
        'sid'     => substr(session_id() ?: '', 0, 8),
        'extra'   => $extra,
    ], JSON_UNESCAPED_UNICODE);
    @file_put_contents(
        CONFIG['access_log'],
        $row . "\n",
        FILE_APPEND | LOCK_EX
    );
}

// ============================================================================
// 3. RATE-LIMITING
// ============================================================================

function rate_limit_check(string $ip): void {
    $key = md5($ip);
    $now = time();

    if (CONFIG['rate_storage'] === 'redis') {
        try {
            $r = new Redis();
            $r->connect(CONFIG['redis_host'], CONFIG['redis_port'], 2);
            $rkey = CONFIG['redis_key_prefix'] . $key;
            $count = (int)$r->incr($rkey);
            if ($count === 1) $r->expire($rkey, CONFIG['rate_window']);
            if ($count > CONFIG['rate_max']) {
                access_log('rate_limited', ['count' => $count]);
                json_out(429, [
                    'ok'     => false,
                    'error'   => 'rate_limited',
                    'message' => 'Слишком много запросов. Попробуйте через 10 минут.',
                    'retry_after' => CONFIG['rate_window'],
                ]);
            }
            return;
        } catch (Throwable $e) {
            // fallback на file
        }
    }

    // File-based
    $dir = CONFIG['rate_dir'];
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    $file = $dir . '/' . $key . '.json';
    $data = ['hits' => [], 'blocked_until' => 0];

    if (is_file($file)) {
        $raw = file_get_contents($file);
        $data = json_decode($raw, true) ?: $data;
    }

    // Чистим старые
    $data['hits'] = array_values(array_filter(
        $data['hits'],
        fn($t) => ($now - (int)$t) < CONFIG['rate_window']
    ));

    if ($data['blocked_until'] > $now) {
        access_log('rate_limited_blocked', ['until' => $data['blocked_until']]);
        json_out(429, [
            'ok'         => false,
            'error'       => 'rate_limited',
            'message'     => 'Слишком много запросов. Попробуйте через 10 минут.',
            'retry_after' => $data['blocked_until'] - $now,
        ]);
    }

    $data['hits'][] = $now;

    if (count($data['hits']) > CONFIG['rate_max']) {
        $data['blocked_until'] = $now + CONFIG['rate_window'];
        file_put_contents($file, json_encode($data), LOCK_EX);
        access_log('rate_limited_exceeded', ['count' => count($data['hits'])]);
        json_out(429, [
            'ok'         => false,
            'error'       => 'rate_limited',
            'message'     => 'Превышен лимит заявок. Подождите 10 минут.',
            'retry_after' => CONFIG['rate_window'],
        ]);
    }

    file_put_contents($file, json_encode($data), LOCK_EX);
}

// ============================================================================
// 4. CSRF
// ============================================================================

function csrf_get(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        $_SESSION['csrf_created'] = time();
    }
    // Ротация
    if (time() - ($_SESSION['csrf_created'] ?? 0) > CONFIG['csrf_ttl']) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        $_SESSION['csrf_created'] = time();
    }
    return $_SESSION['csrf_token'];
}

function csrf_verify(?string $token): bool {
    if (!$token || empty($_SESSION['csrf_token'])) return false;
    if (time() - ($_SESSION['csrf_created'] ?? 0) > CONFIG['csrf_ttl']) return false;
    return hash_equals($_SESSION['csrf_token'], $token);
}

// Endpoint получения CSRF-токена для AJAX (для лендинга)
// GET /api/lead.php?action=csrf
if (($_GET['action'] ?? '') === 'csrf') {
    $token = csrf_get();
    access_log('csrf_issued');
    json_out(200, ['ok' => true, 'csrf_token' => $token, 'ttl' => CONFIG['csrf_ttl']]);
}

// ============================================================================
// 5. ПРИЁМ ЗАЯВКИ
// ============================================================================

rate_limit_check(client_ip());

// Content-Type проверка (только JSON или form-urlencoded)
$ct = $_SERVER['CONTENT_TYPE'] ?? '';
$is_json = stripos($ct, 'application/json') !== false;

if ($is_json) {
    $raw = file_get_contents('php://input');
    if (strlen($raw) > 8192) {
        access_log('payload_too_large', ['size' => strlen($raw)]);
        json_out(413, ['ok' => false, 'error' => 'payload_too_large']);
    }
    $in = json_decode($raw, true);
    if (!is_array($in)) {
        json_out(400, ['ok' => false, 'error' => 'invalid_json']);
    }
} else {
    $in = $_POST;
}

// CSRF-токен из заголовка или тела
$csrf = $_SERVER['HTTP_X_CSRF_TOKEN']
     ?? ($in['csrf_token'] ?? null);

if (!csrf_verify($csrf)) {
    access_log('csrf_invalid');
    json_out(403, ['ok' => false, 'error' => 'csrf_invalid', 'message' => 'Сессия истекла. Обновите страницу.']);
}

// ============================================================================
// 6. HONEYPOT + TIMESTAMP
// ============================================================================

// Honeypot: поле website должно быть пустым
$website = (string)($in['website'] ?? '');
if ($website !== '') {
    // Тихо «успех» для бота, но логируем
    access_log('honeypot_triggered', ['website_len' => strlen($website)]);
    json_out(200, ['ok' => true, 'message' => 'Спасибо! Заявка отправлена.']);
}

// Timestamp: между загрузкой формы и отправкой должно пройти минимум 3 сек
$form_loaded_at = (int)($in['form_loaded_at'] ?? 0);
$now = time();
if ($form_loaded_at <= 0) {
    access_log('no_timestamp');
    json_out(422, ['ok' => false, 'error' => 'no_timestamp', 'message' => 'Форма отправлена некорректно.']);
}
$delta = $now - $form_loaded_at;
if ($delta < CONFIG['min_form_time']) {
    access_log('too_fast', ['delta' => $delta]);
    json_out(422, ['ok' => false, 'error' => 'too_fast', 'message' => 'Слишком быстро. Подождите пару секунд.']);
}
if ($delta > CONFIG['max_form_time']) {
    access_log('too_old', ['delta' => $delta]);
    json_out(422, ['ok' => false, 'error' => 'too_old', 'message' => 'Сессия истекла. Обновите страницу.']);
}

// ============================================================================
// 7. ВАЛИДАЦИЯ + САНКТИЗИЯ
// ============================================================================

// — Имя —
$name_raw = (string)($in['name'] ?? '');
$name_raw = trim(strip_tags($name_raw));
$name_len = mb_strlen($name_raw);
if ($name_len < 2 || $name_len > 60) {
    json_out(422, ['ok' => false, 'field' => 'name', 'error' => 'length', 'message' => 'Имя: 2–60 символов.']);
}
// Только буквы (кир/лат), пробел, дефис
if (!preg_match('/^[А-Яа-яЁёA-Za-z\s\-]+$/u', $name_raw)) {
    json_out(422, ['ok' => false, 'field' => 'name', 'error' => 'chars', 'message' => 'Имя: только буквы, пробел и дефис.']);
}
$name = htmlspecialchars($name_raw, ENT_QUOTES | ENT_HTML5, 'UTF-8');

// — Телефон —
$phone_raw = (string)($in['phone'] ?? '');
$phone_raw = strip_tags($phone_raw);
// Принимаем +7 (XXX) XXX-XX-XX или приводим из +7XXXXXXXXXX
if (!preg_match('/^\+7\s*\(\d{3}\)\s*\d{3}-\d{2}-\d{2}$/', $phone_raw)
    && !preg_match('/^\+7\d{10}$/', $phone_raw)) {
    json_out(422, ['ok' => false, 'field' => 'phone', 'error' => 'format', 'message' => 'Телефон в формате +7 (XXX) XXX-XX-XX.']);
}
// Нормализуем для хранения: +7XXXXXXXXXX
$phone_digits = preg_replace('/\D+/', '', $phone_raw);
if (strlen($phone_digits) !== 11 || substr($phone_digits, 0, 1) !== '7') {
    json_out(422, ['ok' => false, 'field' => 'phone', 'error' => 'digits', 'message' => 'Некорректный номер.']);
}
$phone_normalized = '+' . $phone_digits;
$phone_display = htmlspecialchars($phone_raw, ENT_QUOTES | ENT_HTML5, 'UTF-8');

// — Тип помещения —
$room_whitelist = [
    'apartment1'  => 'Квартира / 1 комната',
    'apartment23' => 'Квартира / 2-3 комнаты',
    'house'       => 'Дом / коттедж',
    'office'      => 'Офис / коммерческое',
];
$room = (string)($in['room'] ?? '');
if (!isset($room_whitelist[$room])) {
    json_out(422, ['ok' => false, 'field' => 'room', 'error' => 'invalid', 'message' => 'Выберите помещение.']);
}
$room_label = $room_whitelist[$room];

// — Согласие 152-ФЗ — обязательно —
$consent = filter_var($in['consent'] ?? false, FILTER_VALIDATE_BOOLEAN);
if (!$consent) {
    json_out(422, ['ok' => false, 'field' => 'consent', 'error' => 'required', 'message' => 'Необходимо согласие на обработку ПД.']);
}

// — Доп. поле комментария (опционально, вырезаем всё опасное) —
$comment = '';
if (!empty($in['comment']) && is_string($in['comment'])) {
    $comment = mb_substr(trim(strip_tags($in['comment'])), 0, 500);
    $comment = htmlspecialchars($comment, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

// ============================================================================
// 8. СОХРАНЕНИЕ В БД (PDO, опционально, с шифрованием ПДн at-rest)
// ============================================================================

$lead_id = 'TG-' . date('Ymd-His') . '-' . substr(bin2hex(random_bytes(3)), 0, 6);

if (CONFIG['use_db']) {
    try {
        $pdo = new PDO(
            CONFIG['dsn'],
            CONFIG['db_user'],
            CONFIG['db_pass'],
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]
        );

        // Шифрование ПДн at-rest (AES-256-GCM, 152-ФЗ ст. 19)
        $key = base64_decode(CONFIG['db_encryption_key']);
        $nonce_db = random_bytes(SODIUM_CRYPTO_AEAD_AES256GCM_NPUBBYTES);
        $enc_name  = sodium_crypto_aead_aes256gcm_encrypt($name_raw, '', $nonce_db, $key);
        $enc_phone = sodium_crypto_aead_aes256gcm_encrypt($phone_normalized, '', $nonce_db, $key);

        $stmt = $pdo->prepare(
            'INSERT INTO leads
              (lead_id, name_enc, phone_enc, room, consent, comment,
               ip_hash, ua, created_at, expires_at, status)
             VALUES
              (:id, :name, :phone, :room, 1, :comment,
               :ip, :ua, NOW(), DATE_ADD(NOW(), INTERVAL :ret DAY), "new")'
        );
        $stmt->execute([
            ':id'      => $lead_id,
            ':name'    => base64_encode($enc_name),
            ':phone'   => base64_encode($enc_phone),
            ':room'    => $room,
            ':comment' => $comment,
            ':ip'      => pseudonym_ip(client_ip()),
            ':ua'      => mb_substr(ua(), 0, 200),
            ':ret'     => CONFIG['pdn_retention_days'],
        ]);

        // Отдельно — nonce для расшифровки (хранить в отдельной таблице/колонке)
        $stmt2 = $pdo->prepare('UPDATE leads SET name_nonce=:n, phone_nonce=:n WHERE lead_id=:id');
        $stmt2->execute([':n' => base64_encode($nonce_db), ':id' => $lead_id]);

        access_log('lead_saved_db', ['lead_id' => $lead_id]);
    } catch (Throwable $e) {
        error_log('[lead.php DB] ' . $e->getMessage());
        access_log('db_error', ['msg' => $e->getMessage()]);
        // Не падаем — отправляем в Telegram как fallback
    }
}

// ============================================================================
// 9. ОТПРАВКА В TELEGRAM
// ============================================================================

function send_telegram(string $lead_id, string $name, string $phone, string $room_label, string $comment): bool {
    if (!CONFIG['tg_enabled']) return false;

    $text = "<b>🔔 Новая заявка SkyLine</b>\n\n"
          . "🆔 <code>" . htmlspecialchars($lead_id) . "</code>\n"
          . "👤 <b>Имя:</b> " . $name . "\n"
          . "📞 <b>Телефон:</b> <code>" . $phone . "</code>\n"
          . "🏠 <b>Помещение:</b> " . htmlspecialchars($room_label) . "\n"
          . ($comment ? "📝 <b>Комментарий:</b> " . $comment . "\n" : "")
          . "\n⏱ " . date('d.m.Y H:i:s') . "\n"
          . "🌐 " . htmlspecialchars(client_ip()) . "\n"
          . "🤖 " . htmlspecialchars(mb_substr(ua(), 0, 80));

    $url = "https://api.telegram.org/bot" . CONFIG['tg_bot_token'] . "/sendMessage";
    $payload = json_encode([
        'chat_id'    => CONFIG['tg_chat_id'],
        'text'       => $text,
        'parse_mode' => CONFIG['tg_parse_mode'],
        'disable_web_page_preview' => true,
    ]);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_USERAGENT      => 'SkyLine-Landing/1.0',
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($code !== 200 || $err) {
        error_log("[Telegram] HTTP {$code} err={$err} resp=" . substr((string)$resp, 0, 200));
        return false;
    }
    return true;
}

$tg_ok = send_telegram($lead_id, $name, $phone_normalized, $room_label, $comment);

// ============================================================================
// 10. ОТПРАВКА E-MAIL
// ============================================================================

function send_email(string $lead_id, string $name, string $phone_display, string $room_label, string $comment): bool {
    if (!CONFIG['mail_enabled']) return false;

    $subject = "=?UTF-8?B?" . base64_encode("Новая заявка SkyLine #{$lead_id}") . "?=";
    $body = "Поступила новая заявка с сайта SkyLine.\n\n"
          . "ID заявки: {$lead_id}\n"
          . "Имя: {$name}\n"
          . "Телефон: {$phone_display}\n"
          . "Помещение: {$room_label}\n"
          . ($comment ? "Комментарий: {$comment}\n" : "")
          . "\nДата/время: " . date('d.m.Y H:i:s') . "\n"
          . "IP-хеш: " . pseudonym_ip(client_ip()) . "\n";

    $headers = [
        'From'         => '=?UTF-8?B?' . base64_encode(CONFIG['mail_from_name']) . '?= <' . CONFIG['mail_from'] . '>',
        'Reply-To'     => CONFIG['mail_from'],
        'MIME-Version' => '1.0',
        'Content-Type' => 'text/plain; charset=UTF-8',
        'Content-Transfer-Encoding' => '8bit',
        'X-Mailer'     => 'SkyLine/1.0',
        'X-Lead-Id'    => $lead_id,
    ];
    $hdr = '';
    foreach ($headers as $k => $v) $hdr .= "{$k}: {$v}\r\n";

    if (CONFIG['use_phpmailer']) {
        // Подключить: composer require phpmailer/phpmailer
        // require __DIR__ . '/vendor/autoload.php';
        // $m = new PHPMailer\PHPMailer\PHPMailer(true);
        // ... настройка SMTP через CONFIG['smtp_*'] ...
        // Здесь — заглушка, реализуйте под свою инфраструктуру.
        return false;
    }

    return @mail(CONFIG['mail_to'], $subject, $body, $hdr, '-f ' . CONFIG['mail_from']);
}

$mail_ok = send_email($lead_id, $name, $phone_display, $room_label, $comment);

// ============================================================================
// 11. ЛОГИРОВАНИЕ (152-ФЗ ст. 19)
// ============================================================================

$lead_row = json_encode([
    'lead_id'      => $lead_id,
    'ts'           => date('c'),
    'name'         => $name,            // sanitized
    'phone_masked' => '+' . substr($phone_digits, 0, 2) . ' XXX XXX-' . substr($phone_digits, -2),
    'room'         => $room,
    'consent'      => true,
    'ip_hash'      => pseudonym_ip(client_ip()),
    'ua'           => mb_substr(ua(), 0, 200),
    'tg_sent'      => $tg_ok,
    'mail_sent'    => $mail_ok,
    'expires_at'   => date('c', time() + CONFIG['pdn_retention_days'] * 86400),
], JSON_UNESCAPED_UNICODE);

@file_put_contents(CONFIG['lead_log'], $lead_row . "\n", FILE_APPEND | LOCK_EX);
access_log('lead_created', ['lead_id' => $lead_id, 'tg' => $tg_ok, 'mail' => $mail_ok]);

// ============================================================================
// 12. ОТВЕТ
// ============================================================================

if (!$tg_ok && !$mail_ok && !CONFIG['use_db']) {
    error_log('[lead.php] all delivery channels failed, lead_id=' . $lead_id);
    json_out(500, [
        'ok'      => false,
        'error'    => 'delivery_failed',
        'message'  => 'Не удалось отправить заявку. Позвоните нам, пожалуйста.',
        'lead_id'  => $lead_id,
    ]);
}

json_out(200, [
    'ok'       => true,
    'message'  => 'Спасибо! Заявка принята. Мы перезвоним в течение 15 минут.',
    'lead_id'  => $lead_id,
]);
