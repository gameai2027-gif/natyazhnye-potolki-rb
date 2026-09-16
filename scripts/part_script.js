/* ══════════════════════════════════════════════════════════════════════
   SkyLine 2027 — JS (mobile-first)
   Все модули в try/catch IIFE. БЕЗ эмодзи.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ══════ Утилиты ══════
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var on = function (el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt || false); };
  var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ══════════════════════════════════════════════════════════════════════
  // 1. МОБИЛЬНОЕ МЕНЮ
  // ══════════════════════════════════════════════════════════════════════
  (function menuModule() {
    try {
      var burger = $('#burger');
      var menu = $('#menu');
      var backdrop = $('#menu-backdrop');
      var lastFocus = null;

      function openMenu() {
        if (!menu) return;
        lastFocus = document.activeElement;
        menu.hidden = false;
        backdrop.hidden = false;
        // reflow
        void menu.offsetHeight;
        menu.setAttribute('data-open', 'true');
        menu.setAttribute('aria-hidden', 'false');
        backdrop.setAttribute('data-open', 'true');
        burger.setAttribute('aria-expanded', 'true');
        burger.setAttribute('aria-label', 'Закрыть меню');
        document.body.classList.add('no-scroll');
        // focus first link
        var firstLink = $('.menu__link', menu);
        if (firstLink) setTimeout(function () { firstLink.focus(); }, 100);
      }
      function closeMenu(returnFocus) {
        menu.setAttribute('data-open', 'false');
        menu.setAttribute('aria-hidden', 'true');
        backdrop.setAttribute('data-open', 'false');
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Открыть меню');
        document.body.classList.remove('no-scroll');
        setTimeout(function () {
          menu.hidden = true;
          backdrop.hidden = true;
        }, 350);
        if (returnFocus !== false && lastFocus) lastFocus.focus();
      }

      on(burger, 'click', function () {
        if (menu.getAttribute('data-open') === 'true') closeMenu(); else openMenu();
      });
      on(backdrop, 'click', function () { closeMenu(); });
      $$('.menu__link', menu).forEach(function (link) {
        on(link, 'click', function () { closeMenu(); });
      });

      // ESC — закрытие
      on(document, 'keydown', function (e) {
        if (e.key === 'Escape' && menu.getAttribute('data-open') === 'true') closeMenu();
      });

      // Swipe-right для закрытия
      var startX = 0, startY = 0, swiping = false;
      on(menu, 'touchstart', function (e) {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        swiping = true;
      }, { passive: true });
      on(menu, 'touchmove', function (e) {
        if (!swiping) return;
        var dx = e.touches[0].clientX - startX;
        var dy = Math.abs(e.touches[0].clientY - startY);
        if (dx > 0 && dx > dy) {
          menu.style.transform = 'translateX(' + dx + 'px)';
          if (dx > 120) { closeMenu(); swiping = false; }
        }
      }, { passive: true });
      on(menu, 'touchend', function () {
        if (swiping) {
          swiping = false;
          menu.style.transform = '';
        }
      }, { passive: true });

      // Focus trap
      on(menu, 'keydown', function (e) {
        if (e.key !== 'Tab') return;
        var focusable = $$('a[href], button:not([disabled])', menu).filter(function (el) {
          return el.offsetParent !== null;
        });
        if (!focusable.length) return;
        var first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      });
    } catch (err) { console.error('menuModule:', err); }
  })();

  // ══════════════════════════════════════════════════════════════════════
  // 2. BOTTOM-SHEETS
  // ══════════════════════════════════════════════════════════════════════
  (function sheetModule() {
    try {
      var sheets = {
        policy: { sheet: $('#sheet-policy'), backdrop: $('#policy-backdrop') },
        offer: { sheet: $('#sheet-offer'), backdrop: $('#offer-backdrop') }
      };
      var lastFocus = null;

      function openSheet(name) {
        var s = sheets[name];
        if (!s) return;
        lastFocus = document.activeElement;
        s.sheet.hidden = false;
        s.backdrop.hidden = false;
        void s.sheet.offsetHeight;
        s.sheet.setAttribute('data-open', 'true');
        s.backdrop.setAttribute('data-open', 'true');
        document.body.classList.add('no-scroll');
        var closeBtn = $('.sheet__close', s.sheet);
        if (closeBtn) setTimeout(function () { closeBtn.focus(); }, 150);
      }
      function closeSheet(name) {
        var s = sheets[name];
        if (!s) return;
        s.sheet.setAttribute('data-open', 'false');
        s.backdrop.setAttribute('data-open', 'false');
        document.body.classList.remove('no-scroll');
        setTimeout(function () {
          s.sheet.hidden = true;
          s.backdrop.hidden = true;
        }, 320);
        if (lastFocus) lastFocus.focus();
      }

      // Триггеры
      $$('.sheet-trigger').forEach(function (trig) {
        on(trig, 'click', function () {
          var name = trig.getAttribute('data-sheet');
          if (name) openSheet(name);
        });
      });
      // Закрытие
      Object.keys(sheets).forEach(function (name) {
        var s = sheets[name];
        on(s.backdrop, 'click', function () { closeSheet(name); });
        var closeBtn = $('.sheet__close', s.sheet);
        if (closeBtn) on(closeBtn, 'click', function () { closeSheet(name); });
        // ESC
        on(s.sheet, 'keydown', function (e) {
          if (e.key === 'Escape') closeSheet(name);
        });
        // Focus trap
        on(s.sheet, 'keydown', function (e) {
          if (e.key !== 'Tab') return;
          var focusable = $$('a[href], button:not([disabled]), input:not([disabled])', s.sheet).filter(function (el) {
            return el.offsetParent !== null;
          });
          if (!focusable.length) return;
          var first = focusable[0], last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        });
        // Swipe-down для закрытия
        var startY = 0, startTop = 0, swiping = false;
        on(s.sheet, 'touchstart', function (e) {
          if (s.sheet.scrollTop > 0) return;
          if (e.touches.length !== 1) return;
          startY = e.touches[0].clientY;
          startTop = 0;
          swiping = true;
        }, { passive: true });
        on(s.sheet, 'touchmove', function (e) {
          if (!swiping) return;
          var dy = e.touches[0].clientY - startY;
          if (dy > 0) {
            startTop = dy;
            s.sheet.style.transform = 'translateY(' + dy + 'px)';
            s.sheet.style.transition = 'none';
          }
        }, { passive: true });
        on(s.sheet, 'touchend', function () {
          if (!swiping) return;
          swiping = false;
          s.sheet.style.transition = '';
          s.sheet.style.transform = '';
          if (startTop > 100) closeSheet(name);
        }, { passive: true });
      });
    } catch (err) { console.error('sheetModule:', err); }
  })();

  // ══════════════════════════════════════════════════════════════════════
  // 3. АККОРДЕОН ЦЕН
  // ══════════════════════════════════════════════════════════════════════
  (function pricesModule() {
    try {
      $$('.price-row').forEach(function (row) {
        var head = $('.price-row__head', row);
        var body = $('.price-row__body', row);
        if (!head || !body) return;
        on(head, 'click', function () {
          var open = row.getAttribute('data-open') === 'true';
          // закрыть остальные
          $$('.price-row').forEach(function (other) {
            if (other !== row) {
              other.setAttribute('data-open', 'false');
              var oh = $('.price-row__head', other);
              var ob = $('.price-row__body', other);
              if (oh) oh.setAttribute('aria-expanded', 'false');
              if (ob) ob.style.maxHeight = '';
            }
          });
          // переключить
          row.setAttribute('data-open', open ? 'false' : 'true');
          head.setAttribute('aria-expanded', open ? 'false' : 'true');
          if (!open) {
            body.style.maxHeight = body.scrollHeight + 'px';
          } else {
            body.style.maxHeight = '';
          }
        });
      });
      // открыть первый по умолчанию
      var first = $('.price-row');
      if (first) {
        first.setAttribute('data-open', 'true');
        var head = $('.price-row__head', first);
        var body = $('.price-row__body', first);
        if (head) head.setAttribute('aria-expanded', 'true');
        if (body) setTimeout(function () { body.style.maxHeight = body.scrollHeight + 'px'; }, 100);
      }
    } catch (err) { console.error('pricesModule:', err); }
  })();

  // ══════════════════════════════════════════════════════════════════════
  // 4. АККОРДЕОН FAQ
  // ══════════════════════════════════════════════════════════════════════
  (function faqModule() {
    try {
      $$('.faq-item').forEach(function (item) {
        var q = $('.faq-q', item);
        var a = $('.faq-a', item);
        if (!q || !a) return;
        on(q, 'click', function () {
          var open = item.getAttribute('data-open') === 'true';
          // закрыть остальные
          $$('.faq-item').forEach(function (other) {
            if (other !== item) {
              other.setAttribute('data-open', 'false');
              var oq = $('.faq-q', other);
              var oa = $('.faq-a', other);
              if (oq) oq.setAttribute('aria-expanded', 'false');
              if (oa) oa.style.maxHeight = '';
            }
          });
          item.setAttribute('data-open', open ? 'false' : 'true');
          q.setAttribute('aria-expanded', open ? 'false' : 'true');
          if (!open) a.style.maxHeight = a.scrollHeight + 'px';
          else a.style.maxHeight = '';
        });
      });
    } catch (err) { console.error('faqModule:', err); }
  })();

  // ══════════════════════════════════════════════════════════════════════
  // 5. КАЛЬКУЛЯТОР (inline, live-расчёт)
  // ══════════════════════════════════════════════════════════════════════
  (function calcModule() {
    try {
      var form = $('#calc-form');
      if (!form) return;
      var room = $('#room');
      var areaSlider = $('#area');
      var areaNum = $('#area-val');
      var canvas = $('#canvas');
      var opts = $$('input[name="opt"]', form);
      var name = $('#name');
      var phone = $('#phone');
      var consent = $('#consent');
      var submit = $('#calc-submit');
      var priceEl = $('#calc-price');
      var successEl = $('#calc-success');
      var phoneErr = $('#phone-err');
      var loadedAt = $('#form_loaded_at');
      var live = $('#calc-live');

      // timestamp — honeypot anti-spam
      loadedAt.value = Date.now();

      // Маска телефона +7 (___) ___-__-__
      function formatPhone(val) {
        var digits = val.replace(/\D/g, '');
        if (digits.charAt(0) === '8') digits = '7' + digits.slice(1);
        if (digits.charAt(0) === '9') digits = '7' + digits;
        digits = digits.substring(0, 11);
        var p = digits.substring(1);
        var out = '+7';
        if (p.length > 0) out += ' (' + p.substring(0, 3);
        if (p.length >= 3) out += ') ' + p.substring(3, 6);
        if (p.length >= 6) out += '-' + p.substring(6, 8);
        if (p.length >= 8) out += '-' + p.substring(8, 10);
        return out;
      }
      on(phone, 'input', function () {
        var pos = phone.selectionStart;
        var before = phone.value;
        var formatted = formatPhone(before);
        phone.value = formatted;
        // восстановить позицию курсора
        if (pos !== null && before.length < formatted.length) {
          phone.selectionStart = phone.selectionEnd = pos + (formatted.length - before.length);
        }
        validatePhone(false);
      });
      function validatePhone(showErr) {
        var digits = phone.value.replace(/\D/g, '');
        if (digits.length === 0) {
          if (showErr) { phoneErr.textContent = 'Укажите телефон'; phoneErr.setAttribute('data-show', 'true'); phone.setAttribute('aria-invalid', 'true'); }
          return false;
        }
        if (digits.length !== 11) {
          if (showErr) { phoneErr.textContent = 'Номер должен содержать 11 цифр'; phoneErr.setAttribute('data-show', 'true'); phone.setAttribute('aria-invalid', 'true'); }
          return false;
        }
        phoneErr.textContent = ''; phoneErr.setAttribute('data-show', 'false');
        phone.removeAttribute('aria-invalid');
        return true;
      }
      on(phone, 'blur', function () { validatePhone(true); });

      // Синхронизация слайдера и числа
      on(areaSlider, 'input', function () { areaNum.value = areaSlider.value; recalc(); });
      on(areaNum, 'input', function () {
        var v = parseInt(areaNum.value, 10);
        if (isNaN(v)) v = 10;
        v = Math.max(10, Math.min(200, v));
        areaSlider.value = v;
        recalc();
      });
      on(areaNum, 'blur', function () {
        var v = parseInt(areaNum.value, 10);
        if (isNaN(v) || v < 10) v = 10;
        if (v > 200) v = 200;
        areaNum.value = v;
        areaSlider.value = v;
        recalc();
      });
      on(room, 'change', recalc);
      on(canvas, 'change', recalc);
      opts.forEach(function (cb) { on(cb, 'change', recalc); });

      // Расчёт цены
      function recalc() {
        try {
          var sel = canvas.selectedOptions[0];
          var basePrice = parseFloat(sel.getAttribute('data-price')) || 490;
          var roomSel = room.selectedOptions[0];
          var roomMult = parseFloat(roomSel.getAttribute('data-mult')) || 1.0;
          var area = parseInt(areaSlider.value, 10) || 18;
          var baseSum = basePrice * roomMult * area;

          var extra = 0;
          opts.forEach(function (cb) {
            if (!cb.checked) return;
            var val = parseFloat(cb.value) || 0;
            var type = cb.getAttribute('data-type');
            if (type === 'area') extra += val * area;
            else if (type === 'meter') extra += val * Math.sqrt(area); // условный периметр ~ √площади
          });

          var total = Math.round(baseSum + extra);
          // форматируем с разделителями
          var formatted = total.toLocaleString('ru-RU') + ' ₽';
          // debounce-анимация
          if (priceEl.textContent !== '≈ ' + formatted) {
            priceEl.classList.remove('update');
            void priceEl.offsetWidth;
            priceEl.classList.add('update');
            priceEl.textContent = '≈ ' + formatted;
          }
        } catch (e) { /* ignore */ }
      }

      // Debounce 100ms
      var debouncedRecalc = (function () {
        var t = null;
        return function () {
          clearTimeout(t);
          t = setTimeout(recalc, 100);
        };
      })();
      // Перевешиваем на все inputs (debounce-версия)
      [room, areaSlider, areaNum, canvas].forEach(function (el) {
        on(el, 'input', debouncedRecalc);
      });
      opts.forEach(function (cb) { on(cb, 'change', debouncedRecalc); });

      // Сабмит
      on(form, 'submit', function (e) {
        e.preventDefault();
        // honeypot + timestamp
        var hp = form.querySelector('[name="website"]');
        if (hp && hp.value) return; // бот
        var ts = parseInt(loadedAt.value, 10);
        var now = Date.now();
        if (now - ts < 3000) return; // слишком быстро — бот

        // валидация
        var nameOk = name.value.trim().length >= 2;
        var phoneOk = validatePhone(true);
        var consentOk = consent.checked;
        if (!nameOk) { name.focus(); name.setAttribute('aria-invalid', 'true'); return; }
        if (!phoneOk) { phone.focus(); return; }
        if (!consentOk) { consent.focus(); consent.setAttribute('aria-invalid', 'true'); return; }

        submit.disabled = true;
        submit.textContent = 'Отправляем...';

        // Имитация отправки (без бэкенда)
        setTimeout(function () {
          try {
            var data = {
              name: name.value.trim(),
              phone: phone.value,
              room: room.value,
              area: areaSlider.value,
              canvas: canvas.value,
              options: opts.filter(function (c) { return c.checked; }).map(function (c) { return c.getAttribute('data-label'); }),
              price: priceEl.textContent.replace('≈ ', ''),
              timestamp: new Date().toISOString()
            };
            // В реальном проекте: POST на /api/lead
            // fetch('/api/lead', { method: 'POST', headers: {'Content-Type':'application/json', 'X-CSRF-Token': csrf}, body: JSON.stringify(data) })
            console.log('Lead submitted:', data);
          } catch (e) { /* ignore */ }

          successEl.setAttribute('data-show', 'true');
          submit.textContent = 'Записаться на бесплатный замер';
          submit.disabled = false;
          // Сброс
          form.reset();
          loadedAt.value = Date.now();
          setTimeout(function () {
            successEl.setAttribute('data-show', 'false');
            successEl.style.display = '';
          }, 8000);
          recalc();
        }, 600);
      });

      // первый расчёт
      recalc();
    } catch (err) { console.error('calcModule:', err); }
  })();

  // ══════════════════════════════════════════════════════════════════════
  // 6. КАРУСЕЛИ (портфолио + отзывы) с точками-индикаторами
  // ══════════════════════════════════════════════════════════════════════
  (function carouselModule() {
    function initCarousel(carouselId, dotsId) {
      try {
        var carousel = document.getElementById(carouselId);
        var dotsContainer = document.getElementById(dotsId);
        if (!carousel) return;
        var slides = $$('article', carousel);
        if (!slides.length) return;
        // создать точки
        dotsContainer.innerHTML = '';
        slides.forEach(function (slide, i) {
          var dot = document.createElement('button');
          dot.className = 'carousel-dots__dot';
          dot.setAttribute('role', 'tab');
          dot.setAttribute('aria-label', 'Слайд ' + (i + 1) + ' из ' + slides.length);
          dot.setAttribute('data-active', i === 0 ? 'true' : 'false');
          on(dot, 'click', function () {
            var target = slide.offsetLeft - (carousel.offsetWidth - slide.offsetWidth) / 2;
            carousel.scrollTo({ left: target, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
          });
          dotsContainer.appendChild(dot);
        });
        var dots = $$('.carousel-dots__dot', dotsContainer);

        // IntersectionObserver — подсветка активной точки
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting && entry.intersectionRatio > 0.55) {
              var idx = slides.indexOf(entry.target);
              if (idx !== -1) {
                dots.forEach(function (d, i) { d.setAttribute('data-active', i === idx ? 'true' : 'false'); });
              }
            }
          });
        }, { root: carousel, threshold: [0, 0.55, 0.85], rootMargin: '0px -10% 0px -10%' });
        slides.forEach(function (s) { io.observe(s); });

        // клавиатура
        on(carousel, 'keydown', function (e) {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          e.preventDefault();
          var activeIdx = dots.findIndex(function (d) { return d.getAttribute('data-active') === 'true'; });
          if (activeIdx < 0) activeIdx = 0;
          var nextIdx = e.key === 'ArrowRight' ? Math.min(activeIdx + 1, slides.length - 1) : Math.max(activeIdx - 1, 0);
          var slide = slides[nextIdx];
          var target = slide.offsetLeft - (carousel.offsetWidth - slide.offsetWidth) / 2;
          carousel.scrollTo({ left: target, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        });
      } catch (err) { console.error('carouselModule ' + carouselId + ':', err); }
    }
    initCarousel('portfolio-carousel', 'portfolio-dots');
    initCarousel('reviews-carousel', 'reviews-dots');
  })();

  // ══════════════════════════════════════════════════════════════════════
  // 7. HEADER — скрытие при scroll-down
  // ══════════════════════════════════════════════════════════════════════
  (function headerModule() {
    try {
      var header = $('#header');
      var bottomBar = $('#bottom-bar');
      if (!header) return;
      var lastY = 0;
      var ticking = false;
      var calcSection = $('#calc');
      var contactsSection = $('#contacts');
      var bottomBarLinks = $$('[data-bottom-bar-hide]', bottomBar);

      function onScroll() {
        var y = window.pageYOffset || document.documentElement.scrollTop;
        if (y > lastY && y > 80) {
          // скролл вниз — скрыть header
          header.setAttribute('data-hidden', 'true');
        } else {
          header.setAttribute('data-hidden', 'false');
        }
        lastY = y;
        ticking = false;

        // bottom-bar: скрываем когда в зоне калькулятора или контактов
        var bbHide = false;
        if (calcSection) {
          var rect = calcSection.getBoundingClientRect();
          if (rect.top < window.innerHeight * 0.6 && rect.bottom > 0) bbHide = true;
        }
        if (contactsSection) {
          var rect2 = contactsSection.getBoundingClientRect();
          if (rect2.top < window.innerHeight * 0.7 && rect2.bottom > 0) bbHide = true;
        }
        if (bottomBar) bottomBar.setAttribute('data-hidden', bbHide ? 'true' : 'false');
      }
      on(window, 'scroll', function () {
        if (!ticking) {
          window.requestAnimationFrame(onScroll);
          ticking = true;
        }
      }, { passive: true });
      onScroll();
    } catch (err) { console.error('headerModule:', err); }
  })();

  // ══════════════════════════════════════════════════════════════════════
  // 8. SCROLL-TO-TOP
  // ══════════════════════════════════════════════════════════════════════
  (function scrollTopModule() {
    try {
      var btn = $('#scroll-top');
      if (!btn) return;
      var ticking = false;
      function onScroll() {
        var y = window.pageYOffset || document.documentElement.scrollTop;
        btn.setAttribute('data-show', y > 600 ? 'true' : 'false');
        ticking = false;
      }
      on(window, 'scroll', function () {
        if (!ticking) {
          window.requestAnimationFrame(onScroll);
          ticking = true;
        }
      }, { passive: true });
      on(btn, 'click', function () {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      });
      onScroll();
    } catch (err) { console.error('scrollTopModule:', err); }
  })();

  // ══════════════════════════════════════════════════════════════════════
  // 9. THEME TOGGLE (в бургер-меню)
  // ══════════════════════════════════════════════════════════════════════
  (function themeModule() {
    try {
      var toggle = $('#theme-toggle');
      var iconSun = $('.icon-sun');
      var iconMoon = $('.icon-moon');
      if (!toggle) return;

      function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        try { localStorage.setItem('skyline-theme', theme); } catch (e) { /* ignore */ }
        toggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
        if (iconSun) iconSun.style.display = theme === 'dark' ? 'none' : '';
        if (iconMoon) iconMoon.style.display = theme === 'dark' ? '' : 'none';
        var meta = $('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', theme === 'dark' ? '#0A0E14' : '#F5F1EA');
      }

      // начальное состояние
      var stored = null;
      try { stored = localStorage.getItem('skyline-theme'); } catch (e) { /* ignore */ }
      if (!stored && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        stored = 'dark';
      }
      setTheme(stored || 'light');

      on(toggle, 'click', function () {
        var current = document.documentElement.getAttribute('data-theme');
        setTheme(current === 'dark' ? 'light' : 'dark');
      });
    } catch (err) { console.error('themeModule:', err); }
  })();

  // ══════════════════════════════════════════════════════════════════════
  // 10. SMOOTH SCROLL для якорей + sticky-header offset
  // ══════════════════════════════════════════════════════════════════════
  (function smoothScrollModule() {
    try {
      $$('a[href^="#"]').forEach(function (link) {
        on(link, 'click', function (e) {
          var href = link.getAttribute('href');
          if (!href || href === '#' || href.length < 2) return;
          var target = document.getElementById(href.slice(1));
          if (!target) return;
          e.preventDefault();
          var headerH = 56; // header height
          var top = target.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop) - headerH - 16;
          window.scrollTo({ top: top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
          // фокус на target для скрин-ридеров
          setTimeout(function () {
            target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
          }, 400);
        });
      });
    } catch (err) { console.error('smoothScrollModule:', err); }
  })();

  // ══════════════════════════════════════════════════════════════════════
  // 11. REVEAL animations (только opacity, IntersectionObserver)
  // ══════════════════════════════════════════════════════════════════════
  (function revealModule() {
    try {
      if (prefersReducedMotion) return;
      // только на десктопе, как в UX spec
      if (!window.matchMedia('(min-width: 1024px)').matches) return;
      if (!('IntersectionObserver' in window)) return;

      $$('.section__head, .about__stat, .service-item, .price-row').forEach(function (el) {
        el.classList.add('reveal');
      });

      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-revealed', 'true');
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: '-10% 0px', threshold: 0.1 });

      $$('.reveal').forEach(function (el) { io.observe(el); });
    } catch (err) { console.error('revealModule:', err); }
  })();

  // ══════════════════════════════════════════════════════════════════════
  // 12. HEADER nav / phone: показывать на десктопе
  // ══════════════════════════════════════════════════════════════════════
  (function desktopHeaderModule() {
    try {
      function update() {
        var desktop = window.matchMedia('(min-width: 1024px)').matches;
        var nav = $('.header__nav');
        var phone = $('.header__phone');
        var burger = $('#burger');
        if (nav) nav.style.display = desktop ? 'flex' : 'none';
        if (phone) phone.style.display = desktop ? 'inline-flex' : 'none';
        if (burger) burger.style.display = desktop ? 'none' : 'inline-flex';
      }
      update();
      on(window, 'resize', update);
    } catch (err) { console.error('desktopHeaderModule:', err); }
  })();

  // ══════════════════════════════════════════════════════════════════════
  // 13. Размер аккордеона на resize
  // ══════════════════════════════════════════════════════════════════════
  (function resizeModule() {
    try {
      var t;
      on(window, 'resize', function () {
        clearTimeout(t);
        t = setTimeout(function () {
          // пересчитать открытые аккордеоны
          $$('.price-row[data-open="true"] .price-row__body').forEach(function (body) {
            body.style.maxHeight = body.scrollHeight + 'px';
          });
          $$('.faq-item[data-open="true"] .faq-a').forEach(function (a) {
            a.style.maxHeight = a.scrollHeight + 'px';
          });
        }, 150);
      });
    } catch (err) { console.error('resizeModule:', err); }
  })();

  console.log('SkyLine 2027 initialised');
})();
