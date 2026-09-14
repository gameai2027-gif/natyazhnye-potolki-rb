# Security Package — SkyLine

Папка `security/` содержит серверную часть проекта SkyLine:
конфиги сервера, PHP-backend для приёма заявок, well-known файлы.

> Подробное описание мер — в [`../docs/SECURITY.md`](../docs/SECURITY.md).
> Гайд деплоя — в [`../docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md).

---

## Оглавление

- [Структура папки](#структура-папки)
- [config/](#config)
- [api/](#api)
- [well-known/](#well-known)
- [Дополнительно (snippets, доки)](#дополнительно)
- [Чек-лист размещения на сервере](#чек-лист-размещения-на-сервере)
- [Что НЕ коммитить в git](#что-не-коммитить-в-git)

---

## Структура папки

```
security/
├── README.md                          # Этот файл
├── /config/                           # Конфиги сервера
│   ├── nginx-skyline.conf             # nginx site config (production)
│   ├── .htaccess                      # Apache config (для shared-хостинга)
│   ├── csp-strict.txt                 # CSP strict (production, nonce-based)
│   ├── csp-soft.txt                   # CSP soft (dev/staging, unsafe-inline)
│   └── cloudflare-worker.js           # Cloudflare Worker (опционально, для CDN)
├── /api/                              # PHP backend
│   └── lead.php                       # Приём заявок с формы
├── /well-known/                       # Файлы для /.well-known/ на сервере
│   ├── robots.txt                     # Расширенный robots для прод-сервера
│   └── security.txt                   # RFC 9116 — security contact
├── /snippets/                         # Снippets (не деплоятся как есть)
│   ├── index.php                      # Заглушка для выдачи CSRF-токена в HTML
│   └── csrf.js                        # Клиентский JS для CSRF (fetch + inject)
├── DEPLOY-CHECKLIST.md                # Чек-лист деплоя (памятка)
├── SSL-TLS.md                         # SSL/TLS подробности
└── 152-FZ-MEMO.md                     # Памятка по 152-ФЗ
```

---

## config/

### nginx-skyline.conf

Готовый `server`-block для nginx с:
- HTTP → HTTPS редирект (80 порт)
- HTTPS на 443, TLS 1.3 + 1.2
- OCSP stapling
- HSTS, всеми security headers
- CSP strict с nonce (через `$request_id`)
- Rate-limiting на `/api/lead` (3r/m)
- Запрет PHP вне `/api/`
- Запрет скрытых файлов
- Кэш статики 1 год + immutable
- Gzip / Brotli
- Кастомные страницы ошибок
- Логи CSP-нарушений в JSON

**Размещение:**
```bash
cp security/config/nginx-skyline.conf /etc/nginx/sites-available/skyline.conf
ln -s /etc/nginx/sites-available/skyline.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### .htaccess

Аналог nginx-конфига для Apache (shared-хостинги):
- HTTPS принудительно
- www → non-www
- Security headers (mod_headers)
- Gzip (mod_deflate)
- Cache (mod_expires)
- Запрет PHP вне `/api/`
- Запрет скрытых файлов
- mod_evasive (памятка для rate-limiting)
- PHP security настройки (mod_php)

**Размещение:** `/var/www/skyline/public/.htaccess`

### csp-strict.txt

CSP strict (production):
- `default-src 'self'`
- `script-src 'self' 'nonce-{NONCE}' 'strict-dynamic'`
- `style-src 'self' 'nonce-{NONCE}'`
- `object-src 'none'`
- `frame-ancestors 'none'`
- `form-action 'self'`
- `upgrade-insecure-requests`
- `require-trusted-types-for 'script'`
- `trusted-types default`

Используется в nginx-конфиге через `$request_id` как nonce.

### csp-soft.txt

CSP soft (dev / staging):
- `unsafe-inline` для script-src и style-src
- Report-Only режим
- `report-uri /csp-report`

Используется для отладки перед переключением на strict.

### cloudflare-worker.js

Cloudflare Worker (опционально):
- Добавляет security headers на edge
- CSP с nonce (генерация в Worker)
- Блокировка bad bots
- Rate-limiting на edge

---

## api/

### lead.php

PHP 8.2+ backend для приёма заявок с формы.

**Возможности:**
- CSRF-защита (session-based, `hash_equals`, TTL 30 мин)
- Rate-limiting: 3 запроса / 10 минут / IP (file или Redis)
- Honeypot (поле `website`)
- Timestamp анти-спам (минимум 3 сек, максимум 1 час)
- Валидация: name (2-60 символов, буквы), phone (+7XXXXXXXXXX), room (whitelist), consent (boolean)
- Санитизация: `strip_tags` + `htmlspecialchars`
- PDO подготовленные запросы (опционально, при `use_db=true`)
- Шифрование ПДн at-rest: AES-256-GCM (libsodium)
- Псевдонимизация IP: `sha256(ip + salt + month)`
- Журнал доступа к ПДн (152-ФЗ ст. 19)
- Отправка в Telegram (Bot API)
- Отправка e-mail (`mail()` или PHPMailer)
- Корректные HTTP-коды: 200, 400, 403, 405, 413, 422, 429, 500
- JSON-ответ

**Размещение:**
```bash
mkdir -p /var/www/skyline/public/api
cp security/api/lead.php /var/www/skyline/public/api/lead.php
chmod 640 /var/www/skyline/public/api/lead.php
chown www-data:www-data /var/www/skyline/public/api/lead.php

mkdir -p /var/www/skyline/public/api/lead-data/rate
chown -R www-data:www-data /var/www/skyline/public/api/lead-data
chmod 770 /var/www/skyline/public/api/lead-data
```

**Эндпоинты:**
- `GET /api/lead.php?action=csrf` — получить CSRF-токен
- `POST /api/lead.php` — отправить заявку

**Тело запроса (JSON):**
```json
{
  "name": "Иван",
  "phone": "+7 (919) 144-28-23",
  "room": "apartment1",
  "consent": true,
  "comment": "Позвонить после 18:00",
  "website": "",
  "form_loaded_at": 1726000000,
  "csrf_token": "abc123..."
}
```

**Ответ (200):**
```json
{
  "ok": true,
  "message": "Спасибо! Заявка принята. Мы перезвоним в течение 15 минут.",
  "lead_id": "TG-20260912-150000-a1b2c3"
}
```

**Конфиг:** все `CHANGE_ME` в массиве `CONFIG` должны быть заменены перед деплоем.
Секреты вынести в `config.local.php` (вне git, см. `.gitignore`).

---

## well-known/

Файлы для размещения в `/.well-known/` на сервере:
`https://skyline-bashkortostan.ru/.well-known/<filename>`

### robots.txt

Расширенная версия `robots.txt` для прод-сервера:
- `Host:` для Яндекса
- `Sitemap:` абсолютный URL
- `User-agent: *` — общий доступ
- `Disallow:` для `/api/`, `/security/`, `/lead-data/`, `/*.php$`, `/*.log$`, `/*.json$`, `/*.env$`
- Блокировка парсеров: AhrefsBot, SemrushBot, MJ12bot, DotBot, PetalBot, BLEXBot, DataForSeoBot, SeznamBot
- Разрешение поисковикам: Yandex, Googlebot, Bingbot, DuckDuckBot
- `Crawl-delay: 1` для всех

> В корне репозитория есть упрощённый `robots.txt` для статических хостингов
> (GitHub Pages). Этот расширенный — для прод-сервера.

### security.txt

[RFC 9116](https://www.rfc-editor.org/rfc/rfc9116) — стандарт contact-файла для bug reports:

- `Contact:` — e-mail, Telegram, телефон
- `Encryption:` — PGP-ключ (URL)
- `Preferred-Languages:` — ru, en
- `Canonical:` — канонический URL файла
- `Policy:` — ссылка на responsible disclosure политику
- `Expires:` — срок действия (2027-01-01)

---

## Дополнительно

### snippets/

Вспомогательные снippets — не деплоятся как есть, используйте как референс:

- **index.php** — заглушка для серверной генерации HTML с CSRF-токеном и nonce в CSP. Если у вас чистая статика — не нужен. Если PHP-фронт — подставьте токен в `<input name="csrf_token">` и `nonce` в `<script nonce="...">`.
- **csrf.js** — клиентский JS для получения CSRF-токена с `/api/lead.php?action=csrf` и инъекции в форму. Используйте, если лендинг статичный, а backend — PHP.

### Документация в папке security/

- **DEPLOY-CHECKLIST.md** — чек-лист деплоя (быстрая памятка)
- **SSL-TLS.md** — подробности по SSL/TLS (cipher suites, OCSP, HSTS)
- **152-FZ-MEMO.md** — памятка по 152-ФЗ (что нужно и что нельзя)

---

## Чек-лист размещения на сервере

- [ ] `nginx-skyline.conf` скопирован в `/etc/nginx/sites-available/`, симлинк в `sites-enabled/`
- [ ] В конфиге заменён домен `skyline-bashkortostan.ru` на ваш
- [ ] В конфиге указаны пути к SSL-сертификатам (Let's Encrypt или commercial)
- [ ] `.htaccess` скопирован в `/var/www/skyline/public/.htaccess` (если Apache)
- [ ] `lead.php` скопирован в `/var/www/skyline/public/api/lead.php`
- [ ] Создана папка `/var/www/skyline/public/api/lead-data/` с правами 770 для www-data
- [ ] Создана папка `/var/www/skyline/public/api/lead-data/rate/` для rate-limiting
- [ ] Создан `config.local.php` с реальными секретами (вне git!)
- [ ] Все `CHANGE_ME` в `lead.php`/`config.local.php` заменены
- [ ] `robots.txt` скопирован в `/var/www/skyline/public/robots.txt` (или использован корневой)
- [ ] `security.txt` скопирован в `/var/www/skyline/public/.well-known/security.txt`
- [ ] Создана БД MySQL и таблица `leads` (если `use_db=true`)
- [ ] Настроен Telegram-бот, получен `bot_token` и `chat_id`
- [ ] Настроен SMTP (если `mail_enabled=true`)
- [ ] Настроен cron для удаления старых ПДн (152-ФЗ)
- [ ] `nginx -t` проходит
- [ ] `systemctl reload nginx`
- [ ] Тестовая заявка отправлена и получена (Telegram + e-mail)
- [ ] `https://skyline-bashkortostan.ru/api/lead.php?action=csrf` возвращает JSON

---

## Что НЕ коммитить в git

См. [`.gitignore`](../.gitignore):

- `/security/api/lead-data/` — данные заявок, логи, rate-limiting state
- `/security/api/lead-data/*` — все файлы внутри
- `config.local.php` — секреты (через `.env` или `config.local.php`)
- `*.pem`, `*.key`, `*.crt` — SSL-сертификаты и ключи
- `*.log` — любые логи

**Никогда не коммитить:**
- `tg_bot_token` — токен Telegram-бота
- `db_pass` — пароль БД
- `db_encryption_key` — ключ шифрования ПДн
- `pseudonym_salt` — соль для хеширования IP
- `smtp_pass` — пароль SMTP

Если случайно закоммитили секрет — считайте, что он скомпрометирован.
Перевыпустите: токен бота, пароль БД, ключ шифрования, соль.
Затем сделайте `git rebase -i` и `git push --force` (если ещё не запушили),
либо обратитесь к GitHub Support для удаления из истории.

---

> Документация: [DEPLOYMENT.md](../docs/DEPLOYMENT.md) | [SECURITY.md](../docs/SECURITY.md) | [SEO-CHECKLIST.md](../docs/SEO-CHECKLIST.md)
