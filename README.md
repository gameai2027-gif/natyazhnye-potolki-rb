# SkyLine — Натяжные потолки в Иглино и Уфе

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?logo=javascript&logoColor=black)
![WCAG AA](https://img.shields.io/badge/WCAG-2.1_AA-0050CC)
![Security](https://img.shields.io/badge/Security-A%2B-brightgreen)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

> Лендинг компании SkyLine — натяжные потолки в Республике Башкортостан
> (с. Иглино, г. Уфа и районы республики). Создан веб-студией **BASH-Site**, г. Уфа.

---

## Скриншот

![Превью лендинга SkyLine](preview.png)

> Файл `preview.png` не входит в репозиторий по умолчанию. Положите сюда
> снимок главной страницы (1280x800 или 1920x1080) перед публикацией.

---

## Возможности

- **Glassmorphism hero** — полупрозрачная стеклянная карточка с blur-фоном, адаптивная вёрстка.
- **Многошаговый калькулятор стоимости** — 5 шагов: помещение, площадь, тип полотна, опции, форма заявки. Авто-переходы между шагами, валидация на лету, итоговая цена в реальном времени.
- **Theme toggle** — переключатель светлой/тёмной темы с сохранением выбора в `localStorage` и учётом `prefers-color-scheme`.
- **Scroll-to-top** — плавная кнопка «наверх» с появлением по `IntersectionObserver`.
- **Ripple-эффект** — материальная анимация нажатия на кнопках и CTA.
- **JSON-LD разметка** — `LocalBusiness`, `Service`, `FAQPage`, `BreadcrumbList`, `Review` для расширенных сниппетов в Яндекс и Google.
- **WCAG 2.1 AA** — семантический HTML5, ARIA-атрибуты, фокус-стили, контраст текста ≥ 4.5:1, поддержка клавиатуры.
- **CSP strict** — nonce-based Content Security Policy без `unsafe-inline` (см. `security/config/csp-strict.txt`).
- **SEO-оптимизация** — мета-теги, Open Graph, Twitter Card, canonical, hreflang, sitemap.xml, robots.txt.
- **Адаптивность** — мобильная вёрстка с бургер-меню, touch-friendly таргеты (≥ 44px).
- **Производительность** — inline-критичный CSS, lazy-loading изображений, `font-display: swap`, preload ключевых ресурсов.
- **Service Worker ready** — структура подготовлена для подключения офлайн-кэширования.
- **152-ФЗ compliance** — чекбокс согласия на обработку ПД, ссылка на политику, журнал доступа к ПДн.
- **Анти-спам** — honeypot-поле + timestamp + CSRF-токен + rate-limiting на бэке.
- **Telegram-уведомления** — каждая заявка падает в чат менеджера через Bot API.
- **Гео-SEO** — фокус на Иглинский район, Уфу и республику Башкортостан.

---

## Технологии

- **HTML5** — семантическая разметка (`<header>`, `<main>`, `<section>`, `<article>`, `<footer>`).
- **CSS3** — custom properties (переменные), Grid, Flexbox, `clamp()`, `backdrop-filter`, `:focus-visible`.
- **Vanilla JavaScript (ES6+)** — без зависимостей и фреймворков. Модули, `class`, `async/await`, optional chaining.
- **Intersection Observer API** — для scroll-анимаций и lazy-loading.
- **Web Storage API** — сохранение темы и пользовательских настроек.
- **Service Worker ready** — заготовка под PWA (см. `scripts/` для будущих скриптов).
- **JSON-LD** — структурированные данные по схеме schema.org.
- **PHP 8.2+** — backend формы заявок (см. `security/api/lead.php`).
- **nginx / Apache** — конфиги сервера с security headers и CSP (см. `security/config/`).

---

## Структура проекта

```
skyline-bashkortostan/
├── README.md                      # Этот файл
├── LICENSE                        # MIT License
├── .gitignore                     # Исключения для git
├── CHANGELOG.md                   # История версий (корневой)
├── CONTRIBUTING.md                # Гайд для контрибьюторов
├── index.html                     # Главная (и единственная) страница
├── CNAME                          # Кастомный домен для GitHub Pages
├── _config.yml                    # Конфиг Jekyll (для GitHub Pages)
├── favicon.svg                    # Иконка сайта
├── manifest.json                  # Web App Manifest (PWA)
├── robots.txt                     # Robots для поисковых ботов
├── sitemap.xml                    # Карта сайта
├── humans.txt                     # Команда проекта
├── preview.png                    # Скриншот для README (не в git)
├── /img/                          # Изображения (hero, портфолио, кейсы)
│   ├── hero.jpg
│   ├── p1.jpg ... p6.jpg
│   └── ...
├── /docs/                         # Документация проекта
│   ├── DEPLOYMENT.md              # Подробный гайд деплоя
│   ├── SEO-CHECKLIST.md           # Чек-лист SEO на 40-50 пунктов
│   ├── SECURITY.md                # Описание security-мер
│   └── CHANGELOG.md               # Технический чейнджлог
├── /security/                     # Security-пакет (серверная часть)
│   ├── README.md                  # Описание содержимого
│   ├── /config/                   # Конфиги сервера
│   │   ├── nginx-skyline.conf     # nginx site config
│   │   ├── .htaccess              # Apache config
│   │   ├── csp-strict.txt         # CSP strict (prod)
│   │   └── csp-soft.txt           # CSP soft (dev/staging)
│   ├── /api/                      # PHP backend
│   │   └── lead.php               # Приём заявок с формы
│   └── /well-known/               # .well-known файлы
│       ├── robots.txt             # Расширенный robots для прод-сервера
│       └── security.txt           # RFC 9116 security contact
└── /scripts/                      # Вспомогательные скрипты (пусто, reserved)
```

---

## Быстрый старт

### Требования

- Современный браузер (Chrome 100+, Firefox 100+, Safari 15+, Edge 100+)
- Для локального сервера: Python 3, Node.js 18+ или любой статический сервер

### Запуск локально

```bash
# Клонировать репозиторий
git clone https://github.com/BASH-Site/skyline-bashkortostan.git
cd skyline-bashkortostan

# Вариант 1: Python (проще всего)
python3 -m http.server 8080

# Вариант 2: Node.js
npx serve -p 8080

# Вариант 3: PHP (если хотите тестировать backend)
php -S localhost:8080
```

Откройте `http://localhost:8080` в браузере.

> **Важно:** форма заявки не будет работать без backend (см. `docs/DEPLOYMENT.md`).
> Для статического деплоя на GitHub Pages подключите Netlify Forms или Formspree.

---

## Деплой

Подробные инструкции — в [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

### Кратко: 4 варианта

| Вариант | Цена | PHP | Forms | Идеально для |
|---------|------|-----|-------|--------------|
| **GitHub Pages** | Бесплатно | Нет | Нет | Демо, статика |
| **Netlify** | Бесплатно | Нет | Да (Forms) | Старт, MVP |
| **Vercel** | Бесплатно | Нет | Да (через API) | Старт, edge-кэш |
| **Свой хостинг** | от 200 ₽/мес | Да | Да (PHP) | Продакшн, 152-ФЗ |

**Рекомендация для продакшена:** свой VPS с nginx + PHP-FPM + MySQL +
Let's Encrypt + Cloudflare. Это даёт полный контроль над security headers,
CSP, rate-limiting и журналом доступа к ПДн (152-ФЗ).

---

## Настройка перед публикацией

Перед запуском в продакшен **обязательно** замените заглушки:

### Контакты и реквизиты

- [ ] `ИНН` / `ОГРНИП` / `ОГРН` — в JSON-LD `LocalBusiness` и в `<footer>`
- [ ] `skyline-bashkortostan.ru` — домен во всех файлах (CNAME, robots.txt, sitemap.xml, manifest.json, JSON-LD, security.txt, nginx.conf, .htaccess)
- [ ] `8-919-144-28-23` — телефон в `tel:` ссылках и JSON-LD (если меняется)
- [ ] E-mail `info@skyline-bashkortostan.ru` — в контактах и security.txt
- [ ] Адрес: `РБ, с. Иглино, ул. Советская, 4` — проверить в JSON-LD и `<address>`
- [ ] Часы работы — в JSON-LD `openingHoursSpecification`

### Соцсети

- [ ] Telegram-канал компании (ссылка в `<header>` и `<footer>`)
- [ ] WhatsApp Business
- [ ] ВКонтакте (если есть)
- [ ] Яндекс.Карты — ссылка на карточку
- [ ] 2GIS — ссылка на карточку

### Backend

- [ ] `security/api/lead.php` — заменить `CHANGE_ME` в CONFIG (bot token, SMTP, DB credentials)
- [ ] Создать `.env` или `config.php` (НЕ коммитить!) и вынести туда секреты
- [ ] Указать корректный `tg_chat_id` менеджера
- [ ] Настроить SMTP (Yandex.Mail для бизнеса / Mail.ru / свой)
- [ ] Создать БД MySQL и таблицу `leads` (см. комментарии в `lead.php`)

### Аналитика

- [ ] Яндекс.Метрика — счетчик в `<head>` (с учётом CSP!)
- [ ] Google Analytics 4 — если нужен (с учётом 152-ФЗ и GDPR)
- [ ] Яндекс.Вебмастер — добавить сайт, подтвердить права
- [ ] Google Search Console — добавить, подтвердить
- [ ] Sitemap.xml — отправить в обе панели вебмастера

### SSL/TLS

- [ ] Выпустить сертификат Let's Encrypt (или купить коммерческий)
- [ ] Включить HSTS (только после тестов!)
- [ ] Подать заявку на HSTS preload list (hstspreload.org) — после 2+ недель стабильной работы
- [ ] Включить OCSP stapling

### Дополнительно

- [ ] `preview.png` — скриншот для README (1280x800)
- [ ] `og-image.jpg` (1200x630) — для Open Graph
- [ ] Favicon-набор (16x16, 32x32, 180x180, 192x192, 512x512) — сгенерировать из favicon.svg
- [ ] Карта сайта `sitemap.xml` — обновить после деплоя

---

## SEO

Что уже сделано в лендинге:

- Семантический HTML5 с корректной иерархией заголовков (H1 → H6)
- Мета-теги: `description`, `keywords`, `author`, `robots`
- Open Graph теги (`og:title`, `og:description`, `og:image`, `og:url`)
- Twitter Card (`summary_large_image`)
- `canonical` URL
- JSON-LD: `LocalBusiness`, `Service`, `FAQPage`, `Review`, `BreadcrumbList`
- `sitemap.xml` и `robots.txt`
- `manifest.json` для PWA
- Атрибуты `alt` на всех изображениях
- Friendly URLs (одностраничник с якорями)
- Mobile-friendly (responsive)

Что нужно доработать после деплоя — см. [`docs/SEO-CHECKLIST.md`](docs/SEO-CHECKLIST.md).

---

## Безопасность

Подробное описание — в [`docs/SECURITY.md`](docs/SECURITY.md) и [`security/README.md`](security/README.md).

### Краткая сводка мер

- **CSP strict** — nonce-based, без `unsafe-inline`, `object-src 'none'`, `frame-ancestors 'none'`
- **Security headers** — HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, COOP/COEP/CORP
- **CSRF protection** — session-based токен, `hash_equals`, TTL 30 мин, ротация
- **Honeypot** — скрытое поле `website`, недоступное людям
- **Timestamp анти-спам** — минимум 3 сек между загрузкой и отправкой формы
- **Rate-limiting** — 3 запроса / 10 минут / IP (file-based или Redis)
- **Валидация и санитизация** — `strip_tags` + `htmlspecialchars` + whitelist для `room`
- **152-ФЗ compliance** — чекбокс согласия, журнал доступа, шифрование ПДн at-rest (AES-256-GCM), псевдонимизация IP в логах, срок хранения 3 года
- **SSL/TLS 1.3 / 1.2** — без legacy-протоколов, OCSP stapling, HSTS preload
- **Изоляция PHP** — выполнение только в `/api/`, запрет прямого доступа к `.php` вне `/api/`
- **Запрет скрытых файлов** — `.git`, `.env`, `.htaccess` недоступны извне

---

## Лицензия

MIT License. См. [`LICENSE`](LICENSE).

Copyright (c) 2026 BASH-Site, веб-студия, г. Уфа.

---

## Контакты

**Веб-студия BASH-Site**
- Город: Уфа, Республика Башкортостан
- Сайт: https://bash-site.ru (заглушка — заменить на реальный)
- E-mail: hello@bash-site.ru (заглушка)
- Telegram: @bash_site (заглушка)

**Заказчик: SkyLine**
- Адрес: РБ, с. Иглино, ул. Советская, 4
- Телефон: 8-919-144-28-23
- E-mail: info@skyline-bashkortostan.ru (заглушка)

---

## Благодарности

- [Google Fonts](https://fonts.google.com/) — шрифты (Manrope, Inter)
- [schema.org](https://schema.org/) — словарь структурированных данных
- [RFC 9116](https://www.rfc-editor.org/rfc/rfc9116) — стандарт security.txt
- [Mozilla Developer Network](https://developer.mozilla.org/) — документация по Web API
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) — гайдлайны по безопасности
- [Let's Encrypt](https://letsencrypt.org/) — бесплатные SSL-сертификаты
- [Cloudflare](https://www.cloudflare.com/) — CDN и DDoS-защита

---

> Проект подготовлен веб-студией **BASH-Site** (г. Уфа) для компании SkyLine.
> Версия: 3.0.0 (2026). Лицензия: MIT.
