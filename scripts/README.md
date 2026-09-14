# /scripts — reserved for future scripts

Эта папка зарезервирована для вспомогательных скриптов проекта SkyLine.

## Планируется

- `scripts/screenshot.mjs` — генерация preview.png для README (Playwright)
- `scripts/sitemap-gen.js` — генерация sitemap.xml из index.html
- `scripts/og-image-gen.mjs` — генерация og-image.jpg (Playwright)
- `scripts/favicon-gen.sh` — генерация favicon-набора из SVG (ImageMagick / rsvg-convert)
- `scripts/validate-html.sh` — валидация HTML через W3C API
- `scripts/audit.sh` — Lighthouse + securityheaders.com + SSL Labs
- `scripts/deploy.sh` — деплой на VPS через rsync + ssh
- `scripts/cron-cleanup.php` — удаление ПДн старше 3 лет (152-ФЗ)

## Настройка

Скрипты на Node.js требуют Node.js 18+ и npm-пакеты:

```bash
npm init -y
npm install --save-dev playwright lighthouse
```

Скрипты на bash требуют Linux/macOS и утилиты: `curl`, `jq`, `rsync`, `ssh`.

## Лицензия

MIT. См. [LICENSE](../LICENSE).
