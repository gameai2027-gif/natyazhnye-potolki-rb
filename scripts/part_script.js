/* ══════════════════════════════════════════════════════════════════════
   BASH-Site 2027 — JS (mobile-first)
   Все модули в try/catch IIFE. БЕЗ эмодзи.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var on = function (el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt || false); };

  // Theme toggle with bash-site-theme key
  (function themeModule() {
    try {
      var btn = $('#theme-toggle');
      if (!btn) return;
      function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        try { localStorage.setItem('bash-site-theme', theme); } catch (e) {}
        btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      }
      var stored = null;
      try { stored = localStorage.getItem('bash-site-theme'); } catch (e) {}
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(stored || (prefersDark ? 'dark' : 'light'));
      on(btn, 'click', function () {
        var cur = document.documentElement.getAttribute('data-theme');
        setTheme(cur === 'dark' ? 'light' : 'dark');
      });
    } catch (err) { console.error('themeModule:', err); }
  })();

  console.log('BASH-Site 2027 initialised');
})();
