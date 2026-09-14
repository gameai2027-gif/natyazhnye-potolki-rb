# Security — SkyLine

Описание всех security-мер, реализованных в проекте SkyLine.

> Конкретные конфиги и код — в [`security/`](../security/) (см. [`security/README.md`](../security/README.md)).

---

## Оглавление

- [Уровень безопасности](#уровень-безопасности)
- [1. Content Security Policy (CSP)](#1-content-security-policy-csp)
- [2. Security Headers](#2-security-headers)
- [3. CSRF-защита](#3-csrf-защита)
- [4. Honeypot + Timestamp](#4-honeypot--timestamp)
- [5. Rate-limiting](#5-rate-limiting)
- [6. Валидация и санитизация](#6-валиддация-и-санитизация)
- [7. 152-ФЗ compliance](#7-152-фз-compliance)
- [8. SSL/TLS](#8-ssltls)
- [9. Изоляция PHP](#9-изоляция-php)
- [10. Запрет скрытых файлов](#10-запрет-скрытых-файлов)
- [11. Reporting API](#11-reporting-api)
- [12. Audit-чек-лист](#12-audit-чек-лист)

---

## Уровень безопасности

Цель — оценка **A+** на [securityheaders.com](https://securityheaders.com) и
[Observatory Mozilla](https://observatory.mozilla.org/), **A+** на
[SSL Labs](https://www.ssllabs.com/ssltest/), соответствие 152-ФЗ.

---

## 1. Content Security Policy (CSP)

### Стратегия

Два варианта CSP, см. [`security/config/csp-strict.txt`](../security/config/csp-strict.txt)
и [`security/config/csp-soft.txt`](../security/config/csp-soft.txt).

**Strict (production):**
- `default-src 'self'` — базовый white-list
- `script-src 'self' 'nonce-{NONCE}' 'strict-dynamic'` — только свои скрипты с nonce
- `style-src 'self' 'nonce-{NONCE}'` — только свои стили с nonce
- `img-src 'self' data: https:` — свои изображения + data: URI + любые HTTPS
- `font-src 'self'` — только свои шрифты
- `connect-src 'self' https://api.telegram.org` — AJAX только на свой домен и Telegram API
- `frame-src https://yandex.ru` — только Я.Карты в iframe
- `object-src 'none'` — запрет Flash/Java/plugins
- `base-uri 'self'` — защита от `<base>` hijack
- `form-action 'self'` — форма только на свой origin
- `frame-ancestors 'none'` — полный запрет встраивания (clickjacking)
- `manifest-src 'self'`
- `worker-src 'self'` — Service Worker только свой
- `child-src 'self'`
- `media-src 'self'`
- `upgrade-insecure-requests` — апгрейд HTTP → HTTPS
- `require-trusted-types-for 'script'` — блокировка небезопасных DOM sinks
- `trusted-types default` — Trusted Types policy

**Soft (dev/staging):**
- `unsafe-inline` для script-src и style-src — для отладки
- Report-Only режим — не блокирует, только репортит нарушения
- Используется перед переключением на strict

### Nonce

Nonce генерируется на каждый запрос:
- nginx: `set $csp_nonce $request_id;` (16 hex-байт, достаточно)
- Apache/PHP: `bin2hex(random_bytes(16))` и подстановка в `Content-Security-Policy` header и в `<script nonce="...">`

В HTML каждый inline-`<script>` получает `nonce="..."`. JSON-LD блоки `<script type="application/ld+json">` также требуют nonce в strict режиме.

### Reporting

- `Report-To` header — эндпоинт `/csp-report` для приёма отчётов от браузеров
- `report-uri /csp-report` — для старых браузеров
- Логи CSP-нарушений: `/var/log/nginx/csp-violations.log`

---

## 2. Security Headers

Все заголовки добавляются через `add_header ... always` в nginx или `Header always set` в Apache.

| Header | Значение | Назначение |
|--------|---------|------------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | HSTS — принудительный HTTPS на 2 года |
| `X-Content-Type-Options` | `nosniff` | Анти-MIME-sniffing |
| `X-Frame-Options` | `DENY` | Анти-clickjacking (дубль для старых браузеров) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Минимизация утечки referrer |
| `Permissions-Policy` | `geolocation=(self https://yandex.ru), camera=(), microphone=(), ...` | Запрет всех API кроме нужных |
| `Cross-Origin-Opener-Policy` | `same-origin` | Изоляция процессов браузера |
| `Cross-Origin-Embedder-Policy` | `require-corp` | Запрет кросс-origin ресурсов без CORP |
| `Cross-Origin-Resource-Policy` | `same-origin` | Ресурсы только свои |
| `X-Permitted-Cross-Domain-Policies` | `none` | Запрет Adobe Flash/PDF embed |
| `X-DNS-Prefetch-Control` | `off` | Отключить DNS prefetching |
| `Content-Security-Policy` | см. раздел 1 | См. раздел 1 |
| `Server` | (удалить) | Скрыть версию сервера |
| `X-Powered-By` | (удалить) | Скрыть версию PHP |

### HSTS preload

**Важно:** `preload` в HSTS включать **только после** одобрения на
[hstspreload.org](https://hstspreload.org). До этого — `max-age=63072000; includeSubDomains`
без preload. После одобрения — добавить preload и не снимать его (практически необратимо).

---

## 3. CSRF-защита

Реализовано в [`security/api/lead.php`](../security/api/lead.php).

### Механизм

- **Session-based токен:** `bin2hex(random_bytes(32))` — 64 hex-символа
- **TTL:** 30 минут (`csrf_ttl = 1800`)
- **Ротация:** каждые 30 мин новый токен
- **Сравнение:** `hash_equals()` (константное время — защита от timing-атак)
- **Передача:** заголовок `X-CSRF-Token` или поле `csrf_token` в теле
- **Эндпоинт получения:** `GET /api/lead.php?action=csrf` возвращает `{ csrf_token, ttl }`

### Сессия

- Имя: `SKYLINESESSID`
- Cookie: `Secure`, `HttpOnly`, `SameSite=Strict`
- Lifetime: 1800 сек
- Регенерация session ID каждые 5 минут (анти-fixation)

### SameSite=Strict

Блокирует CSRF на уровне браузера: cookie не отправляется при cross-site запросах.
Дополнительно к токену — двойная защита.

---

## 4. Honeypot + Timestamp

### Honeypot

- Скрытое поле `website` в форме (CSS `display: none` + `aria-hidden`)
- Люди его не видят, боты заполняют все поля
- Если `website` не пустое — возвращаем `200 OK` (тихий успех для бота),
  но заявку не сохраняем, логируем в `access.log` как `honeypot_triggered`

### Timestamp

- Поле `form_loaded_at` (timestamp в секундах) заполняется при загрузке формы через JS
- Минимум: 3 секунды между загрузкой и отправкой (`min_form_time`)
- Максимум: 1 час (`max_form_time`)
- Если < 3 сек — бот, возвращаем `422 too_fast`
- Если > 1 часа — истёкшая сессия, возвращаем `422 too_old`

---

## 5. Rate-limiting

### nginx-уровень (пред-фильтр)

```nginx
limit_req_zone $binary_remote_addr zone=lead_limit:10m rate=3r/m;
limit_req zone=lead_limit burst=3 nodelay;
```
3 запроса в минуту на IP, с burst=3 (разрешить всплеск).

### PHP-уровень (точный контроль)

В `lead.php`:
- **Хранилище:** file (по умолчанию) или Redis
- **Лимит:** 3 запроса / 10 минут / IP (`rate_max=3`, `rate_window=600`)
- **Блокировка:** при превышении — бан на 10 минут, возврат `429 rate_limited`
- **Логи:** `rate_limited`, `rate_limited_blocked`, `rate_limited_exceeded` в `access.log`
- **Заголовок ответа:** `Retry-After: <seconds>`

### Защита от перебора

- Session ID регенерируется каждые 5 минут
- CSRF-токен ротируется каждые 30 мин
- Ограничение размера тела запроса: 8192 байт (JSON) и `client_max_body_size 1m` в nginx
- Таймауты: `client_body_timeout 30s`, `client_header_timeout 30s`, `fastcgi_read_timeout 30s`

---

## 6. Валидация и санитизация

### Имя

- `trim()` + `strip_tags()`
- Длина: 2-60 символов
- Regex: `/^[А-Яа-яЁёA-Za-z\s\-]+$/u` (только буквы, пробел, дефис)
- Вывод: `htmlspecialchars($val, ENT_QUOTES | ENT_HTML5, 'UTF-8')`

### Телефон

- Принимает: `+7 (XXX) XXX-XX-XX` или `+7XXXXXXXXXX`
- Нормализация: `+7XXXXXXXXXX` (только цифры)
- Проверка: 11 цифр, начинается с `7`
- Вывод: `htmlspecialchars` (sanitized)

### Тип помещения (room)

- Whitelist: `apartment1`, `apartment23`, `house`, `office`
- Если не в списке — `422 invalid`

### Согласие (consent)

- `filter_var($val, FILTER_VALIDATE_BOOLEAN)` — строго boolean
- Если `false` — `422 required` (152-ФЗ требует явного согласия)

### Комментарий

- Опционально
- `trim() + strip_tags()`
- Обрезка до 500 символов
- `htmlspecialchars` для вывода

### Универсальные меры

- Все входные данные — `(string)` cast
- `$_POST` или `json_decode(file_get_contents('php://input'))` — никаких `$_REQUEST`
- Проверка `Content-Type`: только `application/json` или `application/x-www-form-urlencoded`
- Размер тела: max 8192 байт (защита от перегрузки)
- PDO подготовленные запросы (если используется БД) — никаких конкатенаций SQL

---

## 7. 152-ФЗ compliance

Федеральный закон РФ от 27.07.2006 № 152-ФЗ «О персональных данных».

### Что сделано

- **Явное согласие:** чекбокс «Согласен на обработку персональных данных» обязателен
- **Ссылка на Политику обработки ПД** — в форме, под чекбоксом
- **Журнал доступа к ПДн** (ст. 19): `access.log` в `/api/lead-data/`
  - Каждое событие: timestamp, event, IP-hash, UA, session ID
  - События: `csrf_issued`, `honeypot_triggered`, `too_fast`, `too_old`, `lead_saved_db`, `lead_created`, и т.д.
- **Псевдонимизация IP** (ст. 19): в логах хранится `sha256(ip + salt + month)`, не оригинальный IP
- **Шифрование ПДн at-rest** (ст. 19): AES-256-GCM через `sodium_crypto_aead_aes256gcm_encrypt`
  - Шифруются: имя, телефон
  - Ключ шифрования — в `config.local.php` (вне git)
  - Nonce хранится отдельно в БД
- **Срок хранения:** 3 года (1095 дней, `pdn_retention_days`)
  - После истечения — автоматическое удаление (через cron-задачу, нужно настроить)
- **Передача третьим лицам:** только с согласия, через Telegram-бота (менеджер SkyLine)
- **Права субъекта ПДн:** возможность удаления по запросу (через e-mail в Политике)
- **Уведомление Роскомнадзора:** если обрабатываете > 100 000 субъектов — уведомление обязательно
  (для SkyLine, скорее всего, не требуется)

### Что нужно сделать дополнительно

- [ ] Создать отдельную страницу `/privacy-policy.html` с текстом Политики обработки ПД
- [ ] В Политике указать: цели обработки, перечень ПДн, сроки, третьи лица, права субъекта
- [ ] Уведомить Роскомнадзор (если нужно — см. критерии)
- [ ] Назначить ответственного за обработку ПДн
- [ ] Создать регламент реагирования на инциденты
- [ ] Настроить автоматическое удаление ПДн после истечения срока (cron)

---

## 8. SSL/TLS

### Конфигурация

- **Протоколы:** TLS 1.3 + TLS 1.2 (минимум)
- **Cipher suites (TLS 1.3):** `TLS_AES_128_GCM_SHA256`, `TLS_AES_256_GCM_SHA384`, `TLS_CHACHA20_POLY1305_SHA256`
- **Cipher suites (TLS 1.2):** только ECDHE-варианты с GCM или CHACHA20
- **Forward secrecy:** `ssl_session_tickets off` (без stateless resumption)
- **Session cache:** `shared:SSL:50m`, timeout 1d
- **OCSP stapling:** включён
- **Resolver:** `1.1.1.1 8.8.8.8` (Cloudflare + Google)

### Сертификаты

- **Let's Encrypt** (бесплатно) — рекомендуется для старта
- **Commercial cert** (Sectigo, DigiCert) — для enterprise
- Auto-renewal через `certbot renew` в cron
- Wildcard — если нужны поддомены (через DNS-01 challenge)

### HSTS

- `max-age=63072000` (2 года)
- `includeSubDomains` — после проверки, что все поддомены на HTTPS
- `preload` — только после одобрения hstspreload.org

### Проверка

- [SSL Labs](https://www.ssllabs.com/ssltest/) — цель A или A+
- [HTTPS Observatory](https://observatory.mozilla.org/) — цель A+
- Без слабых cipher suites (RC4, 3DES, MD5)
- Без старых протоколов (SSLv3, TLS 1.0, TLS 1.1)

---

## 9. Изоляция PHP

### Запрет выполнения PHP вне /api/

В nginx:
```nginx
location ~ \.php$ {
    deny all;  # по умолчанию запрещено
}
location ^~ /api/ {
    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass php_backend;
        # ...
    }
}
```

В Apache `.htaccess`:
```apache
RewriteCond %{REQUEST_URI} !^/api/
RewriteRule \.php$ - [F,L]
```

### Редирект /api/lead → /api/lead.php

Скрывает реальный путь к PHP-файлу, дружелюбный URL:
```nginx
location = /api/lead {
    rewrite ^/api/lead$ /api/lead.php last;
}
```

### PHP-настройки

- `display_errors = Off` (на проде!)
- `log_errors = On`
- `expose_php = Off` (скрыть версию PHP в `X-Powered-By`)
- `allow_url_include = Off`
- `max_execution_time = 30`
- `post_max_size = 1M`
- `upload_max_filesize = 1M`
- `session.cookie_httponly = 1`
- `session.cookie_secure = 1`
- `session.cookie_samesite = "Lax"` (или Strict)
- `session.use_strict_mode = 1`
- `session.use_only_cookies = 1`
- `opcache.enable = On`

---

## 10. Запрет скрытых файлов

В nginx:
```nginx
location ~ /\.(?!well-known) {
    deny all;
    access_log off;
    log_not_found off;
}
```

В Apache:
```apache
RewriteRule (^|/)\.(?!well-known) - [F,L]
```

Запрещает доступ к:
- `.git/`, `.gitignore`, `.gitconfig`
- `.env`, `.env.local`
- `.htaccess`, `.htpasswd`
- `.vscode/`, `.idea/`

**Исключение:** `.well-known/` (для ACME-challenge, security.txt).

### Запрет стандартных векторов атак

В Apache:
```apache
<FilesMatch "^(wp-login\.php|xmlrpc\.php|phpinfo\.php|admin|wp-admin)">
    Require all denied
</FilesMatch>
```

В `robots.txt`:
```
Disallow: /admin/
Disallow: /wp-admin/
Disallow: /wp-login.php
Disallow: /xmlrpc.php
Disallow: /phpinfo.php
Disallow: /cgi-bin/
```

---

## 11. Reporting API

### CSP reporting

В `Content-Security-Policy`:
- `report-uri /csp-report` (старые браузеры)
- `report-to csp-endpoint` (новые браузеры)

В `Report-To` header:
```json
{
  "group": "csp-endpoint",
  "max_age": 10886400,
  "endpoints": [{ "url": "https://skyline-bashkortostan.ru/csp-report" }]
}
```

Эндпоинт `/csp-report` в nginx — пишет в лог `/var/log/nginx/csp-violations.log`.

Анализируйте логи раз в неделю — найдёте попытки XSS или кривые скрипты.

---

## 12. Audit-чек-лист

### Перед запуском

- [ ] Все `CHANGE_ME` в `security/api/lead.php` заменены
- [ ] `config.local.php` создан и не в git
- [ ] HTTPS включён, редирект с HTTP работает (301)
- [ ] www → non-www редирект работает
- [ ] HSTS включён (без preload!)
- [ ] CSP strict включён, JSON-LD и скрипты с nonce
- [ ] Все security headers на месте (проверить через curl)
- [ ] `.well-known/security.txt` доступен
- [ ] `robots.txt` корректный
- [ ] `sitemap.xml` доступен
- [ ] Тестовая заявка отправлена, дошла в Telegram + e-mail
- [ ] Логи пишутся в `/api/lead-data/access.log`
- [ ] Rate-limiting работает (проверить 4 запросами подряд)

### После запуска

- [ ] [securityheaders.com](https://securityheaders.com/?q=skyline-bashkortostan.ru) — A+
- [ ] [SSL Labs](https://www.ssllabs.com/ssltest/) — A или A+
- [ ] [Observatory Mozilla](https://observatory.mozilla.org/) — A+
- [ ] [PageSpeed Insights](https://pagespeed.web.dev/) — Performance ≥ 90
- [ ] [W3C Validator](https://validator.w3.org/) — HTML валиден
- [ ] [Wave](https://wave.webaim.org/) — Accessibility A
- [ ] [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) — регулярно в CI/CD

### Регулярно

- [ ] Раз в неделю: анализ `csp-violations.log`, `access.log`
- [ ] Раз в месяц: обновление ОС и пакетов (`apt update && apt upgrade`)
- [ ] Раз в месяц: ротация логов (logrotate)
- [ ] Раз в квартал: penetration test (минимум — пробовать OWASP ZAP)
- [ ] Раз в квартал: аудит прав пользователей на сервере
- [ ] Раз в год: полный security audit

---

## Известные риски и митигация

| Риск | Митигация |
|------|-----------|
| XSS через форму | CSP strict + `htmlspecialchars` + `textContent` в JS |
| CSRF | Session-based токен + SameSite=Strict + hash_equals |
| Brute-force на форму | nginx rate-limit + PHP rate-limit + ban на 10 мин |
| Spam-боты | Honeypot + timestamp + CSP + reCAPTCHA (опционально) |
| SQL Injection | PDO подготовленные запросы, никаких конкатенаций |
| File Inclusion | `allow_url_include = Off`, whitelist для require |
| Information leak | `display_errors = Off`, `server_tokens off`, `expose_php = Off` |
| MITM | HSTS + TLS 1.3 + cert pinning (через HPKP, deprecated — не используем) |
| Clickjacking | `X-Frame-Options: DENY` + `frame-ancestors 'none'` |
| Session fixation | `session_regenerate_id(true)` каждые 5 мин |
| Session hijack | `Secure`, `HttpOnly`, `SameSite=Strict` cookies |

---

## Контакт для security-репортов

См. [`security/well-known/security.txt`](../security/well-known/security.txt).

- E-mail: `security@skyline-bashkortostan.ru`
- Telegram: `@skyline_security`
- Срок ответа: 5 рабочих дней
- Responsible disclosure: 90 дней до публикации

---

> Конкретные конфиги — в [security/README.md](../security/README.md).
> Гайд деплоя — в [DEPLOYMENT.md](DEPLOYMENT.md).
