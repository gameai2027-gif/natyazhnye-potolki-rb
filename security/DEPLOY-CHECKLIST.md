# ============================================================================
# SkyLine 2026 — Deployment Security Checklist
# 38 пунктов. Все должны быть ✓ перед публикацией.
# ============================================================================

## TLS / HTTPS
 1. [ ] Сертификат установлен, валиден ≥ 30 дней, auto-renewal включён (certbot).
 2. [ ] TLS 1.2 минимум, TLS 1.3 желательно; SSL 2/3, TLS 1.0/1.1 отключены.
 3. [ ] Cipher suite — только ECDHE + GCM/ChaCha20, без CBC/RC4/3DES.
 4. [ ] HSTS заголовок присутствует: max-age=63072000; includeSubDomains; preload.
 5. [ ] HTTP → HTTPS редирект настроен как 301 на 80 порту.
 6. [ ] Домен подан на hstspreload.org (после проверки п. 4-5).
 7. [ ] OCSP stapling включён и работает (openssl s_client -connect ... -status).
 8. [ ] SSL Labs grade A+ (https://www.ssllabs.com/ssltest/).
 9. [ ] CAA-запись в DNS ограничивает выпуск сертификатов.

## HTTP Security Headers
10. [ ] X-Content-Type-Options: nosniff.
11. [ ] X-Frame-Options: DENY (и CSP frame-ancestors 'none').
12. [ ] Referrer-Policy: strict-origin-when-cross-origin.
13. [ ] Permissions-Policy: всё запрещено, кроме geolocation для yandex.ru.
14. [ ] Cross-Origin-Opener-Policy: same-origin.
15. [ ] Cross-Origin-Embedder-Policy: require-corp.
16. [ ] Cross-Origin-Resource-Policy: same-origin.
17. [ ] X-Permitted-Cross-Domain-Policies: none.
18. [ ] Server signature / X-Powered-By скрыты (server_tokens off, expose_php=Off).
19. [ ] CSP strict (nonce-based, без 'unsafe-inline') активен и тестируется через
       Content-Security-Policy-Report-Only минимум 3 дня перед включением.

## Конфигурация сервера
20. [ ] nginx: limit_req_zone + limit_conn_zone для /api/lead.
21. [ ] client_max_body_size 1m (форма < 8 KB, запас для логов).
22. [ ] Запрет прямого доступа к /.git, /.env, /.htaccess, /vendor, /tmp.
23. [ ] Запрет выполнения PHP вне /api/ (deny для всех остальных *.php).
24. [ ] Кастомные страницы ошибок без трассировки стека (err.html, 429.html, 500.html).
25. [ ] Запрет HTTP-методов кроме GET/HEAD/POST/OPTIONS.
26. [ ] Gzip/Brotli включён для текстовых типов; картинки — без сжатия.
27. [ ] Кэш: HTML — no-cache, статика — immutable + 1 year.

## Форма / бэкенд
28. [ ] /api/lead.php доступен только через POST (405 на остальных).
29. [ ] CSRF-токен генерируется, проверяется через hash_equals, TTL 30 мин.
30. [ ] Rate-limiting: 3 запроса / 10 минут / IP (файл или Redis).
31. [ ] Honeypot-поле website проверяется на сервере (пустое = OK).
32. [ ] Honeypot-поле email2 (JS-инжект) проверяется на сервере.
33. [ ] Timestamp form_loaded_at: минимум 3 сек, максимум 1 час.
34. [ ] Валидация: name (regex кир/лат, 2-60), phone (regex +7XXXXXXXXXX),
       room (whitelist), consent (обязателен).
35. [ ] Санитизация: strip_tags + htmlspecialchars для вывода; PDO prepared для БД.
36. [ ] JSON-ответы с корректными кодами 200/400/403/422/429/500.
37. [ ] Подключение к Telegram через HTTPS, верификация SSL_PEER.
38. [ ] E-mail отправляется с DKIM/SPF; домен имеет DMARC-запись.

## Логи / 152-ФЗ
39. [ ] /lead-data/ вне webroot или защищён .htaccess / nginx deny.
40. [ ] access.log пишет IP-хеш (SHA-256 + salt), не оригинальный IP.
41. [ ] leads.log пишет masked phone: +7 XXX XXX-XX.
42. [ ] Шифрование ПДн at-rest (AES-256-GCM), ключ вне webroot.
43. [ ] Cron pdn-cleanup.php удаляет записи старше 1095 дней (3 года).
44. [ ] Согласие оператора указано (ИНН, адрес, цель, срок, отзыв) в чекбоксе.
45. [ ] Политика конфиденциальности опубликована на /privacy-policy.html.

## Файлы
46. [ ] robots.txt с правильным Sitemap, запрет /api/, /security/, *.log.
47. [ ] security.txt в /.well-known/ и в корне (fallback).
48. [ ] sitemap.xml сгенерирован и доступен.
49. [ ] .env файл НЕ в git (.gitignore), права chmod 600.

## Мониторинг
50. [ ] CSP violation reporting: /csp-report пишет в /var/log/nginx/csp-violations.log.
51. [ ] fail2ban: бан IP по 5×429 в /api/lead за 10 мин.
52. [ ] Uptime-мониторинг (UptimeRobot / Better Stack) на HTTPS + проверка формы.
53. [ ] Алерты на security@ при 5xx всплесках.

## Финальный smoke-test
54. [ ] curl -I https://skyline-bashkortostan.ru | grep -E "Strict-Transport|Content-Security|X-Frame"
55. [ ] OWASP ZAP базовое сканирование — 0 High, 0 Medium.
56. [ ] Mozilla Observatory — цель A+ (https://observatory.mozilla.org).
57. [ ] securityheaders.com — минимум A.
58. [ ] Тест формы вручную: пустые поля → 422, без CSRF → 403, 4× подряд → 429.
59. [ ] Проверка:honeypot заполнен → 200 + в логе honeypot_triggered.
60. [ ] Проверка: Telegram-бот получил тестовую заявку, e-mail тоже пришёл.

## После деплоя
61. [ ] Подать домен в Яндекс.Вебмастер и Google Search Console.
62. [ ] Подать домен в Яндекс.Метрику / настроить цели на успешную отправку.
63. [ ] Настроить бэкап /lead-data/ ежедневно (зашифрованный tar в S3).
64. [ ] Документировать процедуру восстановления из бэкапа.
