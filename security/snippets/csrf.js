/**
 * security/csrf.js — клиентская часть CSRF + усиленная анти-бот защита
 * ----------------------------------------------------------------------------
 * Подключить ПЕРЕД основным inline-скриптом лендинга, внутри <head>:
 *
 *   <script nonce="{NONCE}" src="/security/csrf.js" defer></script>
 *   <script nonce="{NONCE}">
 *     document.addEventListener('DOMContentLoaded', () => SkyLineSec.init());
 *   </script>
 *
 * Что делает:
 *   1. На загрузке — запрашивает CSRF-токен с бэкенда (GET /api/lead.php?action=csrf)
 *      и встраивает в <meta name="csrf-token">.
 *   2. Подставляет токен во все <form method="POST"> в скрытое поле
 *      и в заголовок X-CSRF-Token при fetch().
 *   3. Записывает form_loaded_at в скрытое поле (анти-спам timestamp).
 *   4. Засекает время фокуса на первом поле; если разница < 3 сек — submit блокируется.
 *   5. Подмешивает honeypot-чек: при движении мыши ставит флаг is_human.
 *   6. Перехватывает submit формы и отправляет через fetch (Content-Type: application/json).
 *   7. Опционально: инжектит Cloudflare Turnstile (если есть sitekey).
 */

(function (global) {
  'use strict';

  const SEC = {
    token: null,
    tokenTtl: 1800,
    formFocusAt: 0,
    formLoadedAt: 0,
    isHuman: false,
    mouseMoves: 0,
    config: {
      csrfEndpoint: '/api/lead.php?action=csrf',
      submitEndpoint: '/api/lead',
      minFocusTime: 3000,        // мс между фокусом и submit
      minMouseMoves: 2,          // минимум движений мыши для is_human
      turnstileSitekey: '',      // оставить пустым, если не используется
      turnstileContainerId: 'turnstile-box',
    },
  };

  // ---------- УТИЛИТЫ ----------

  function setMeta(name, content) {
    let m = document.querySelector(`meta[name="${name}"]`);
    if (!m) {
      m = document.createElement('meta');
      m.setAttribute('name', name);
      document.head.appendChild(m);
    }
    m.setAttribute('content', content);
  }

  function getMeta(name) {
    const m = document.querySelector(`meta[name="${name}"]`);
    return m ? m.getAttribute('content') : null;
  }

  async function fetchCsrfToken() {
    try {
      const r = await fetch(SEC.config.csrfEndpoint, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' },
      });
      if (!r.ok) throw new Error('csrf HTTP ' + r.status);
      const data = await r.json();
      if (data && data.csrf_token) {
        SEC.token = data.csrf_token;
        SEC.tokenTtl = data.ttl || 1800;
        setMeta('csrf-token', SEC.token);
        injectTokenIntoForms();
        scheduleRefresh();
        return SEC.token;
      }
    } catch (e) {
      console.warn('[SkyLineSec] CSRF fetch failed:', e.message);
    }
    return null;
  }

  function injectTokenIntoForms() {
    if (!SEC.token) return;
    document.querySelectorAll('form[method="POST"], form[method="post"]').forEach((f) => {
      let input = f.querySelector('input[name="csrf_token"]');
      if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'csrf_token';
        input.autocomplete = 'off';
        f.appendChild(input);
      }
      input.value = SEC.token;
    });
  }

  function scheduleRefresh() {
    // Обновить токен за 60 сек до истечения
    setTimeout(fetchCsrfToken, (SEC.tokenTtl - 60) * 1000);
  }

  // ---------- TIMESTAMP АНТИ-СПАМ ----------

  function setFormLoadedAt() {
    SEC.formLoadedAt = Math.floor(Date.now() / 1000);
    const el = document.getElementById('form_loaded_at');
    if (el) el.value = String(SEC.formLoadedAt);
  }

  // ---------- MOUSE/KEYBOARD HUMANITY CHECK ----------

  function bindHumanitySignals() {
    document.addEventListener('mousemove', () => {
      SEC.mouseMoves++;
      if (SEC.mouseMoves >= SEC.config.minMouseMoves) SEC.isHuman = true;
    }, { passive: true, once: false });

    document.addEventListener('touchstart', () => {
      SEC.isHuman = true;
    }, { passive: true, once: true });

    document.addEventListener('scroll', () => {
      SEC.isHuman = true;
    }, { passive: true, once: true });

    // Засекаем время фокуса на первом поле формы
    const form = document.getElementById('calcForm');
    if (form) {
      const firstInput = form.querySelector('input:not([type=hidden]):not([name=website])');
      if (firstInput) {
        firstInput.addEventListener('focus', () => {
          SEC.formFocusAt = Date.now();
        }, { once: true });
      }
    }
  }

  // ---------- УСИЛЕНИЕ HONEYPOT ----------
  // honeypot-поле website уже есть в HTML. Дополнительно: JS-боты часто
  // заполняют все поля. Если JS включён — honeypot остаётся скрытым от глаз,
  // но виден в DOM. Дополнительно подмешиваем второе honeypot-поле email2.

  function addExtraHoneypot() {
    const form = document.getElementById('calcForm');
    if (!form) return;
    const hp = document.createElement('div');
    hp.setAttribute('aria-hidden', 'true');
    hp.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
    hp.innerHTML = '<label for="email2">Email (не заполнять)</label>' +
                   '<input type="email" id="email2" name="email2" tabindex="-1" autocomplete="off">';
    form.appendChild(hp);
  }

  // ---------- ОТПРАВКА ЧЕРЕЗ FETCH ----------

  function bindFormSubmit() {
    const form = document.getElementById('calcForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const errEl = document.getElementById('error');
      const okEl  = document.getElementById('success');
      if (errEl) errEl.style.display = 'none';
      if (okEl)  okEl.style.display  = 'none';

      // 1. Honeypot
      const website = (form.querySelector('[name="website"]') || {}).value;
      if (website) {
        // Бот — молча «успех»
        if (okEl) okEl.style.display = 'block';
        return false;
      }
      const email2 = (form.querySelector('[name="email2"]') || {}).value;
      if (email2) {
        if (okEl) okEl.style.display = 'block';
        return false;
      }

      // 2. Timestamp чек (клиент)
      const loadedAt = parseInt(document.getElementById('form_loaded_at').value, 10) || 0;
      const deltaSec = Math.floor(Date.now() / 1000) - loadedAt;
      if (deltaSec < 3) {
        if (errEl) {
          errEl.textContent = 'Подождите пару секунд перед отправкой.';
          errEl.style.display = 'block';
        }
        return false;
      }

      // 3. Focus time check (3 сек)
      if (SEC.formFocusAt && (Date.now() - SEC.formFocusAt) < SEC.config.minFocusTime) {
        if (errEl) {
          errEl.textContent = 'Заполните форму чуть медленнее.';
          errEl.style.display = 'block';
        }
        return false;
      }

      // 4. Humanity check (мышь/тач/скролл)
      if (!SEC.isHuman) {
        // Не блокируем жёстко — автозаполнение формы не двигает мышь.
        // Логируем флаг, бэкенд сам решит.
        console.warn('[SkyLineSec] is_human=false — отправка разрешена, флаг передан');
      }

      // 5. CSRF
      if (!SEC.token) {
        await fetchCsrfToken();
      }
      if (!SEC.token) {
        if (errEl) {
          errEl.textContent = 'Сессия истекла. Обновите страницу.';
          errEl.style.display = 'block';
        }
        return false;
      }

      // 6. Собираем payload
      const payload = {
        name:            (form.querySelector('[name="name"]') || {}).value || '',
        phone:           (form.querySelector('[name="phone"]') || {}).value || '',
        room:            (form.querySelector('[name="room"]') || {}).value || '',
        consent:         (form.querySelector('[name="consent"]') || {}).checked ? 'on' : 'off',
        website:         website || '',
        email2:          email2 || '',
        form_loaded_at:  loadedAt,
        csrf_token:      SEC.token,
        human:           SEC.isHuman ? 1 : 0,
        turnstile_token: global.__turnstileToken || '',
      };

      const btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Отправляем…'; }

      try {
        const r = await fetch(SEC.config.submitEndpoint, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': SEC.token,
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify(payload),
        });

        let data = {};
        try { data = await r.json(); } catch (_) {}

        if (r.ok && data.ok) {
          if (okEl) {
            okEl.style.display = 'block';
            okEl.setAttribute('role', 'status');
          }
          form.reset();
          setFormLoadedAt();
        } else if (r.status === 429) {
          if (errEl) {
            errEl.textContent = data.message || 'Слишком много заявок. Попробуйте позже.';
            errEl.style.display = 'block';
          }
        } else if (r.status === 403) {
          if (errEl) {
            errEl.textContent = data.message || 'Сессия истекла. Обновите страницу и попробуйте снова.';
            errEl.style.display = 'block';
          }
          // CSRF истёк — перевыпустим
          await fetchCsrfToken();
        } else if (r.status === 422) {
          if (errEl) {
            errEl.textContent = data.message || 'Проверьте введённые данные.';
            errEl.style.display = 'block';
            if (data.field) {
              const f = form.querySelector(`[name="${data.field}"]`);
              if (f) { f.focus(); f.setAttribute('aria-invalid', 'true'); }
            }
          }
        } else {
          if (errEl) {
            errEl.textContent = data.message || 'Ошибка отправки. Позвоните нам, пожалуйста.';
            errEl.style.display = 'block';
          }
        }
      } catch (netErr) {
        if (errEl) {
          errEl.textContent = 'Нет соединения. Проверьте интернет и попробуйте снова.';
          errEl.style.display = 'block';
        }
      } finally {
        if (btn) { btn.disabled = false; if (btn.dataset.label) btn.textContent = btn.dataset.label; }
      }
    });
  }

  // ---------- TURNSTILE (ОПЦИОНАЛЬНО) ----------

  function loadTurnstile() {
    if (!SEC.config.turnstileSitekey) return;
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);

    s.onload = () => {
      if (window.turnstile) {
        window.turnstile.render('#' + SEC.config.turnstileContainerId, {
          sitekey: SEC.config.turnstileSitekey,
          callback: (token) => { global.__turnstileToken = token; },
          'error-callback': () => { global.__turnstileToken = ''; },
          theme: 'light',
        });
      }
    };
  }

  // ---------- ИНИЦИАЛИЗАЦИЯ ----------

  SEC.init = function () {
    setFormLoadedAt();
    bindHumanitySignals();
    addExtraHoneypot();
    bindFormSubmit();
    loadTurnstile();
    fetchCsrfToken();
  };

  // Авто-инициализация после DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', SEC.init);
  } else {
    SEC.init();
  }

  global.SkyLineSec = SEC;
})(window);
