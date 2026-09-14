# Technical Changelog — SkyLine

Технический changelog по коммитам и изменениям кода.
Пользовательский changelog — в [`../CHANGELOG.md`](../CHANGELOG.md).

Формат: [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/), версии — [SemVer](https://semver.org/lang/ru/).

---

## [3.0.0] — 2026-09-12

### Added
- `index.html` — переименован из `skyline-2026.html` (для GitHub Pages)
- Glassmorphism hero с `backdrop-filter: blur(20px)`
- Многошаговый калькулятор: 5 шагов, авто-переходы, валидация
- Theme toggle с `localStorage` и `prefers-color-scheme`
- Scroll-to-top кнопка на `IntersectionObserver`
- Ripple-эффект на кнопках и CTA
- JSON-LD: `LocalBusiness`, `Service`, `FAQPage`, `Review`, `BreadcrumbList`
- `manifest.json` — PWA Web App Manifest
- `favicon.svg` — векторная иконка
- `humans.txt` — команда проекта
- `CNAME` — кастомный домен для GitHub Pages
- `_config.yml` — Jekyll config (для GitHub Pages)
- `sitemap.xml` — карта сайта
- `robots.txt` (корневой и расширенный в `security/well-known/`)
- `security.txt` — RFC 9116
- CSP strict + soft варианты
- CSRF, honeypot, timestamp, rate-limiting в `lead.php`
- Шифрование ПДн at-rest (AES-256-GCM)
- Псевдонимизация IP в логах
- Журнал доступа к ПДн (152-ФЗ ст. 19)
- `README.md` — главный с бейджами и инструкциями
- `LICENSE` — MIT
- `.gitignore` — стандартный + backend-специфика
- `CHANGELOG.md` — пользовательский
- `CONTRIBUTING.md` — гайд для контрибьюторов
- `docs/DEPLOYMENT.md` — 4 варианта деплоя
- `docs/SEO-CHECKLIST.md` — 130+ пунктов SEO
- `docs/SECURITY.md` — описание security-мер
- `security/README.md` — описание security-пакета

### Changed
- Структура: header → hero с навигацией поверх → контент → footer
- Телефон кликабелен на всех устройствах, мобильная компактная кнопка
- Калькулятор: авто-переходы после выбора помещения и полотна
- CSS-псевдоэлементы для подсказок «Далее», «Нажмите Отправить заявку»

### Removed
- Устаревшие секции из v2.x
- Все эмодзи из контента (правило проекта)

### Security
- CSP strict с nonce, без `unsafe-inline`
- Trusted Types для script sinks
- HSTS (без preload — добавить после одобрения)
- Все security headers (см. `docs/SECURITY.md`)

---

## [2.5.0] — 2026-09-12

### Added
- Geo-SEO фокус на Иглинский район
- JSON-LD `Service` со структурой услуги
- Расширенный `LocalBusiness` с `areaServed` (РБ, Уфа, Иглино, районы)
- `openingHoursSpecification` в JSON-LD
- `priceRange` в JSON-LD
- Карточка с адресом в `<footer>` (microdata `PostalAddress`)
- Я.Карты iframe в контактах (с CSP-разрешением `frame-src https://yandex.ru`)

### Changed
- HERO H1: «Натяжные потолки в Иглино и Уфе — монтаж за 2 дня от SkyLine»
- Подзаголовок: конкретика по гео, цене, срокам, гарантии
- Trust-бейджи: 12 лет, 3500+ объектов, оплата после монтажа
- Добавлен блок «География работы» с 10+ населёнными пунктами РБ

---

## [2.0.0] — 2026-09-12

### Added
- 10 услуг (карточки): гладкие, матовые, сатиновые, тканевые, парящие, двухуровневые, фотопечать, подсветка, шумоизоляция, перегородки
- 8 кейсов портфолио с фото до/после, площадью, сроком, ценой
- 5 отзывов клиентов (Иглино, Уфа, Красноусольск, Стерлитамак)
- 8 FAQ с JSON-LD `FAQPage`
- Секция «О компании» с 4 карточками статистики
- Секция «Сертификаты и гарантии»

---

## [1.5.0] — 2026-09-12

### Added
- Многошаговый калькулятор (5 шагов)
- Расчёт цены в реальном времени с учётом опций
- Прогресс-бар между шагами
- Валидация полей на лету

---

## [1.0.0] — 2026-09-12

### Added
- Базовый лендинг с HERO секцией
- Контактная форма (имя, телефон, сообщение)
- Ссылка на политику обработки ПД (152-ФЗ)
- Согласие на обработку персональных данных
- Адаптивная вёрстка (мобильная + десктоп)
- Бургер-меню для мобильных
- Контактный телефон в шапке

---

[3.0.0]: https://github.com/BASH-Site/skyline-bashkortostan/releases/tag/v3.0.0
[2.5.0]: https://github.com/BASH-Site/skyline-bashkortostan/releases/tag/v2.5.0
[2.0.0]: https://github.com/BASH-Site/skyline-bashkortostan/releases/tag/v2.0.0
[1.5.0]: https://github.com/BASH-Site/skyline-bashkortostan/releases/tag/v1.5.0
[1.0.0]: https://github.com/BASH-Site/skyline-bashkortostan/releases/tag/v1.0.0
