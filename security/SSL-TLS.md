# ============================================================================
# SSL/TLS рекомендации — SkyLine 2026
# ============================================================================

1. ПРОТОКОЛЫ
   • Минимум: TLS 1.2.
   • Рекомендуется: TLS 1.3 (один RTT, forward secrecy по умолчанию).
   • Запретить: SSLv3, TLS 1.0, TLS 1.1 (POODLE, BEAST, устаревшие шифры).
   • В nginx: ssl_protocols TLSv1.2 TLSv1.3;
   • В Apache: SSLProtocol -all +TLSv1.2 +TLSv1.3

2. CIPHER SUITES (TLS 1.3 не настраивается, TLS 1.2 — современный набор)
   nginx:
     ssl_ciphers 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305';
   Apache:
     SSLCipherSuite TLSv1.3 TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256
     SSLCipherSuite ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256

   Запретить: CBC, RC4, 3DES, MD5, SHA1, NULL, EXP, LOW, MEDIUM.

3. SESSION RESUMPTION
   • ssl_session_cache shared:SSL:50m;
   • ssl_session_timeout 1d;
   • ssl_session_tickets off;  (forward secrecy, не использовать stateless tickets)

4. OCSP STAPLING
   nginx:
     ssl_stapling on;
     ssl_stapling_verify on;
     resolver 1.1.1.1 8.8.8.8 valid=300s;
     resolver_timeout 5s;
   Apache:
     SSLUseStapling On
     SSLStaplingCache shmcb:/var/run/ocsp(128000)

5. HSTS PRELOAD
   • Заголовок: Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
   • Подать домен на https://hstspreload.org ПОСЛЕ подтверждения что:
     - HTTPS работает на основном домене и всех поддоменах
     - Редирект с HTTP на HTTPS настроен корректно (301)
     - max-age >= 31536000 (1 год), мы ставим 2 года (63072000)
     - includeSubDomains указан
   • После одобрения — domain попадает в список Chrome/Firefox, удаление
     занимает недели → не подавать, пока не уверены в стабильности.

6. СЕРТИФИКАТЫ
   • Let's Encrypt (free, 90 дней) или ZeroSSL.
   • RSA 2048-bit (минимум) или ECDSA P-256 (рекомендуется).
   • Авто-renewal: certbot renew --deploy-hook "systemctl reload nginx"
   • CAA-запись в DNS:
     skyline-bashkortostan.ru.  CAA 0 issue "letsencrypt.org"
     skyline-bashkortostan.ru.  CAA 0 iodef "mailto:security@skyline-bashkortostan.ru"

7. ПРОВЕРКА
   • https://www.ssllabs.com/ssltest/ — цель A+.
   • https://www.immuniweb.com/ssl/ — аудит конфигурации.
   • https://tools.letsdebug.net/ — диагностика ACME.

8. CRLF / HEADER INJECTION
   • В nginx: ignore_invalid_headers on; (по умолчанию)
   • underscore_in_headers off; (запретить нестандартные заголовки с подчёркиванием)

9. HTTP/2 ИЛИ HTTP/3
   • Включить http2 (listen 443 ssl http2;).
   • HTTP/3 (QUIC) — опционально, если nginx собран с QUIC.

10. SSH ДЛЯ АДМИНА (НЕ СВЯЗАНО С TLS, НО ВАЖНО)
    • Запретить пароли: PasswordAuthentication no
    • Только ключи ed25519.
    • Сменить порт (опц.), Fail2ban на 22 порт.
