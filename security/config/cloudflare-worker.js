/**
 * Cloudflare Worker — SkyLine 2026 security headers + nonce CSP
 *
 * Разместить в Cloudflare Dashboard → Workers & Pages → Create Worker
 * Привязать к маршруту: skyline-bashkortostan.ru/* (zone)
 *
 * Worker инжектирует nonce в HTML <script> и в CSP-заголовок.
 */

const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(self https://yandex.ru), camera=(), microphone=(), display-capture=(), fullscreen=(self), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'X-DNS-Prefetch-Control': 'off',
};

function b64u(bytes) {
  // URL-safe base64 без padding (подходит для CSP nonce)
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateNonce() {
  const buf = new Uint8Array(18);
  crypto.getRandomValues(buf);
  return b64u(buf);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. ACME-challenge проксируем напрямую (не трогать)
    if (url.pathname.startsWith('/.well-known/acme-challenge/')) {
      return fetch(request);
    }

    // 2. Генерируем nonce
    const nonce = await generateNonce();

    // 3. Строим CSP strict
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
      `style-src 'self' 'nonce-${nonce}'`,
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://api.telegram.org",
      "frame-src https://yandex.ru",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "manifest-src 'self'",
      "worker-src 'self'",
      "child-src 'self'",
      "upgrade-insecure-requests",
    ].join('; ');

    // 4. /csp-report — приём отчётов
    if (url.pathname === '/csp-report') {
      // Здесь можно писать в KV: env.CSP_REPORTS.put(...)
      return new Response('{"ok":true}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 5. Проксируем запрос к origin
    const response = await fetch(request);
    const newHeaders = new Headers(response.headers);

    // Применяем security headers (перезаписываем, если уже есть)
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
      newHeaders.set(k, v);
    }
    newHeaders.set('Content-Security-Policy', csp);
    newHeaders.set('Report-To', '{"group":"csp-endpoint","max_age":10886400,"endpoints":[{"url":"https://skyline-bashkortostan.ru/csp-report"}]}');

    // Убираем лишнее
    newHeaders.delete('X-Powered-By');
    newHeaders.delete('Server');

    // 6. Для HTML — инжектим nonce во все inline <script> без nonce
    const ct = newHeaders.get('Content-Type') || '';
    if (ct.includes('text/html')) {
      let html = await response.text();
      // Добавляем nonce в <script> без атрибута nonce
      html = html.replace(/<script(?![^>]*nonce=)([^>]*)>/gi, `<script nonce="${nonce}"$1>`);
      // Инжектим CSRF-метатеги в <head> (если их нет)
      const csrfMeta = `  <meta name="csp-nonce" content="${nonce}">\n  <meta name="csrf-token" content="${nonce}">\n`;
      if (!/name="csp-nonce"/.test(html)) {
        html = html.replace(/<head([^>]*)>/i, `<head$1>\n${csrfMeta}`);
      }
      // Пересчитываем Content-Length
      newHeaders.set('Content-Length', new TextEncoder().encode(html).length);
      return new Response(html, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};
