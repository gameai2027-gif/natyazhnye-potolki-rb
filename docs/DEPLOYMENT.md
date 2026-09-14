# Развёртывание (Deployment) — SkyLine

Подробный гайд по развёртыванию лендинга SkyLine в продакшен.
4 варианта — от бесплатного статического до production-grade VPS.

---

## Оглавление

- [Вариант 1: GitHub Pages](#вариант-1-github-pages)
- [Вариант 2: Netlify](#вариант-2-netlify)
- [Вариант 3: Vercel](#вариант-3-vercel)
- [Вариант 4: Свой хостинг (VPS + nginx + PHP-FPM)](#вариант-4-свой-хостинг-vps--nginx--php-fpm)
- [Сравнение вариантов](#сравнение-вариантов)
- [Чек-лист перед деплоем](#чек-лист-перед-деплоем)
- [После деплоя](#после-деплоя)

---

## Вариант 1: GitHub Pages

**Цена:** Бесплатно
**PHP:** Нет (только статика)
**Forms:** Нет (нужен внешний сервис для формы)
**Идеально для:** Демо, статики, MVP

### Особенности

- Бесплатный HTTPS (Let's Encrypt через GitHub)
- Свой домен через CNAME
- Лимит: 100 GB/мес трафика, 1 GB размер репо
- Автоматический деплой из ветки `main` или `/docs`
- Jekyll-поддержка (но мы не используем)

### Пошаговая инструкция

1. **Создайте репозиторий на GitHub:**
   - Имя: `skyline-bashkortostan` (или `bash-site.github.io` для бесплатного домена)
   - Public (для бесплатного Pages)

2. **Запушьте код:**
   ```bash
   cd /path/to/skyline-bashkortostan
   git init
   git add .
   git commit -m "feat: initial commit SkyLine v3.0.0"
   git branch -M main
   git remote add origin https://github.com/BASH-Site/skyline-bashkortostan.git
   git push -u origin main
   ```

3. **Включите GitHub Pages:**
   - Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main` / `(root)`
   - Save

4. **Дождитесь деплоя** (2-5 минут). Сайт будет на:
   - `https://<username>.github.io/skyline-bashkortostan/`

5. **Кастомный домен** (опционально):
   - В корне репо уже есть `CNAME` с `skyline-bashkortostan.ru`
   - У регистратора домена добавьте A-запись на IP GitHub:
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`
   - И CNAME: `www.skyline-bashkortostan.ru` → `<username>.github.io`
   - В Settings → Pages → Custom domain → введите `skyline-bashkortostan.ru` → Save → Enforce HTTPS

6. **Форма заявок:** GitHub Pages не поддерживает PHP. Подключите:
   - **Netlify Forms** (нужен Netlify)
   - **Formspree** (бесплатно 50 заявок/мес)
   - **Getform** (бесплатно 50 заявок/мес)
   - В `index.html` измените `action` формы на URL внешнего сервиса

### Ограничения

- Нет PHP → backend `security/api/lead.php` не работает
- Нет CSP nonce (нельзя dynamic headers) → используйте мягкий CSP через `<meta>`
- Нет HSTS / security headers на уровне сервера (только через `<meta>`)
- Нет rate-limiting → форма уязвима к спаму (honeypot + timestamp спасают частично)

---

## Вариант 2: Netlify

**Цена:** Бесплатно (стартовый план)
**PHP:** Нет (Netlify Functions на Node.js)
**Forms:** Да (Netlify Forms)
**Идеально для:** Старт, MVP, статика с формой

### Особенности

- Бесплатный HTTPS (Let's Encrypt, авто)
- Свой домен
- Netlify Forms: 100 заявок/мес бесплатно
- Netlify Functions (serverless Node.js)
- Edge-кэш на CDN
- Авто-деплой из Git

### Пошаговая инструкция

1. **Создайте аккаунт на [netlify.com](https://www.netlify.com/)**

2. **New site from Git:**
   - Выберите GitHub
   - Авторизуйте Netlify
   - Выберите репозиторий `skyline-bashkortostan`

3. **Настройки деплоя:**
   - Branch: `main`
   - Build command: (пусто, статика)
   - Publish directory: `.` (корень репо)

4. **Включите Netlify Forms** — добавьте в `index.html` атрибуты:
   ```html
   <form name="lead" method="POST" data-netlify="true"
         netlify-honeypot="website" netlify-recaptcha="true">
     <input type="hidden" name="form-name" value="lead" />
     <p class="hidden">
       <label>Не заполняйте: <input name="website" /></label>
     </p>
     <!-- ... остальная форма ... -->
   </form>
   ```

5. **Деплой:**
   - Нажмите Deploy site
   - Получите URL: `https://<random-name>.netlify.app`

6. **Кастомный домен:**
   - Site settings → Domain management → Add custom domain
   - Введите `skyline-bashkortostan.ru`
   - У регистратора добавьте CNAME: `skyline-bashkortostan.ru` → `<random-name>.netlify.app`
   - (для apex домена используйте ALIAS/ANAME или A-запись)
   - Netlify сам выпустит SSL

7. **Security headers:**
   - Создайте файл `netlify.toml` в корне репо:
     ```toml
     [[headers]]
       for = "/*"
       [headers.values]
         X-Frame-Options = "DENY"
         X-Content-Type-Options = "nosniff"
         Referrer-Policy = "strict-origin-when-cross-origin"
         Permissions-Policy = "geolocation=(self https://yandex.ru)"
         Strict-Transport-Security = "max-age=63072000; includeSubDomains; preload"

     [[headers]]
       for = "/*.html"
       [headers.values]
         Cache-Control = "no-cache, must-revalidate"

     [[headers]]
       for = "/*.css"
       [headers.values]
         Cache-Control = "public, immutable, max-age=31536000"
     ```

8. **Netlify Functions для backend** (если нужен свой backend):
   - Создайте папку `netlify/functions/`
   - Файл `lead.js`:
     ```javascript
     exports.handler = async (event) => {
       // ... обработка заявки ...
       return { statusCode: 200, body: JSON.stringify({ ok: true }) };
     };
     ```

### Ограничения

- 100 заявок/мес на бесплатном плане
- 100 GB трафика/мес
- Нет PHP → форма через Netlify Forms или Netlify Functions
- Нет БД (нужна внешняя: Supabase, PlanetScale, Neon)

---

## Вариант 3: Vercel

**Цена:** Бесплатно (Hobby plan)
**PHP:** Нет (Vercel Functions на Node.js)
**Forms:** Да (через Vercel Functions)
**Идеально для:** Старт, edge-кэш, разработчики

### Особенности

- Бесплатный HTTPS
- Edge Network (быстрый отклик по всему миру)
- Vercel Functions (serverless)
- Авто-деплой из Git
- Свой домен

### Пошаговая инструкция

1. **Создайте аккаунт на [vercel.com](https://vercel.com/)**

2. **New Project:**
   - Import Git Repository
   - Выберите `skyline-bashkortostan`

3. **Настройки:**
   - Framework Preset: Other
   - Build command: (пусто)
   - Output directory: `.`

4. **Деплой** → получите `https://skyline-bashkortostan.vercel.app`

5. **Кастомный домен:**
   - Settings → Domains → Add
   - Введите `skyline-bashkortostan.ru`
   - Настройте DNS у регистратора:
     - A: `76.76.21.21`
     - CNAME: `www` → `cname.vercel-dns.com`
   - Vercel сам выпустит SSL

6. **Security headers:** создайте `vercel.json`:
   ```json
   {
     "headers": [
       {
         "source": "/(.*)",
         "headers": [
           { "key": "X-Frame-Options", "value": "DENY" },
           { "key": "X-Content-Type-Options", "value": "nosniff" },
           { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
           { "key": "Permissions-Policy", "value": "geolocation=(self https://yandex.ru)" },
           { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
           { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.telegram.org; frame-src https://yandex.ru; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests" }
         ]
       }
     ]
   }
   ```

7. **Vercel Functions для backend:**
   - Создайте папку `api/`
   - Файл `api/lead.js`:
     ```javascript
     export default function handler(req, res) {
       if (req.method !== 'POST') {
         return res.status(405).json({ ok: false, error: 'method_not_allowed' });
       }
       // ... обработка ...
       res.status(200).json({ ok: true, message: 'Заявка принята' });
     }
     ```

### Ограничения

- 100 GB трафика/мес на Hobby
- 100 GB-часов Functions/мес
- Нет PHP → только Node.js (или Python/Go/Ruby на выбор)
- Нет постоянной БД → используйте Vercel Postgres, Supabase, Neon

---

## Вариант 4: Свой хостинг (VPS + nginx + PHP-FPM)

**Цена:** от 200 ₽/мес (VPS) + домен ~200 ₽/год
**PHP:** Да (полная поддержка)
**Forms:** Да (свой PHP backend)
**Идеально для:** Продакшн, 152-ФЗ compliance, полный контроль

### Особенности

- Полный контроль над сервером и security
- Своя БД (MySQL/MariaDB/PostgreSQL)
- Свой backend (`security/api/lead.php` из коробки)
- Полные security headers и CSP с nonce
- Rate-limiting на nginx
- Журнал доступа к ПДн по 152-ФЗ

### Рекомендуемые хостинги

| Хостинг | Цена от | PHP | MySQL | nginx | Composer |
|---------|---------|-----|-------|-------|----------|
| **Timeweb Cloud** | 200 ₽/мес | + | + | + | + |
| **Beget VPS** | 250 ₽/мес | + | + | + | + |
| **Reg.ru VPS** | 250 ₽/мес | + | + | + | + |
| **FirstVDS** | 200 ₽/мес | + | + | + | + |
| **Hetzner Cloud** (EU) | 4 EUR/мес | + | + | + | + |
| **DigitalOcean** | 5 USD/мес | + | + | + | + |

### Пошаговая инструкция

#### Шаг 1: Подготовка VPS

1. Купите VPS с Ubuntu 22.04 LTS или Debian 12.
2. Подключитесь по SSH: `ssh root@<ip>`
3. Обновите систему:
   ```bash
   apt update && apt upgrade -y
   ```
4. Создайте пользователя (не работайте под root):
   ```bash
   adduser skyline
   usermod -aG sudo skyline
   ```
5. Скопируйте SSH-ключи и **отключите вход по паролю** в `/etc/ssh/sshd_config`:
   ```
   PasswordAuthentication no
   PermitRootLogin no
   ```
   Перезапустите: `systemctl restart sshd`

#### Шаг 2: Установка стека (LEMP)

```bash
# nginx + PHP 8.2 + MySQL 8 + certbot
apt install -y nginx mysql-server php8.2-fpm php8.2-mysql php8.2-curl php8.2-mbstring php8.2-xml php8.2-sodium composer
```

#### Шаг 3: Настройка БД

```bash
mysql_secure_installation

mysql -u root -p
```

В MySQL:
```sql
CREATE DATABASE skyline CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'skyline_app'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON skyline.* TO 'skyline_app'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Создайте таблицу `leads` (схема в комментариях `security/api/lead.php`).

#### Шаг 4: Размещение файлов

```bash
mkdir -p /var/www/skyline/public
chown -R skyline:www-data /var/www/skyline
chmod -R 750 /var/www/skyline
```

Загрузите файлы проекта (через git или SCP):
```bash
cd /var/www/skyline/public
git clone https://github.com/BASH-Site/skyline-bashkortostan.git .
```

Создайте папку для данных заявок (НЕ в git):
```bash
mkdir -p /var/www/skyline/public/api/lead-data/rate
chown -R www-data:www-data /var/www/skyline/public/api/lead-data
chmod 770 /var/www/skyline/public/api/lead-data
```

#### Шаг 5: Секреты (config.local.php)

Создайте `/var/www/skyline/public/api/config.local.php` (вне git!):
```php
<?php
return [
    'tg_bot_token' => '123456:ABC-DEF...',
    'tg_chat_id' => '-1001234567890',
    'db_pass' => 'STRONG_PASSWORD_HERE',
    'db_encryption_key' => base64_encode(random_bytes(32)),
    'pseudonym_salt' => bin2hex(random_bytes(32)),
    'smtp_pass' => 'SMTP_PASSWORD',
];
```
```bash
chown www-data:www-data /var/www/skyline/public/api/config.local.php
chmod 640 /var/www/skyline/public/api/config.local.php
```

В `lead.php` подключите конфиг:
```php
$local = is_file(__DIR__ . '/config.local.php') ? require __DIR__ . '/config.local.php' : [];
const CONFIG = array_merge(BASE_CONFIG, $local);
```

#### Шаг 6: Настройка nginx

Скопируйте конфиг:
```bash
cp /var/www/skyline/public/security/config/nginx-skyline.conf /etc/nginx/sites-available/skyline.conf
ln -s /etc/nginx/sites-available/skyline.conf /etc/nginx/sites-enabled/
```

Отредактируйте `/etc/nginx/sites-available/skyline.conf` под себя
(замените `skyline-bashkortostan.ru` на свой домен, пути к сертификатам).

Проверьте и перезапустите:
```bash
nginx -t
systemctl reload nginx
```

#### Шаг 7: SSL-сертификат (Let's Encrypt)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d skyline-bashkortostan.ru -d www.skyline-bashkortostan.ru
```

Certbot сам изменит конфиг nginx и настроит авто-обновление.

#### Шаг 8: Деплой через Git (для удобства обновлений)

На сервере:
```bash
cd /var/www/skyline/public
git remote add deploy /home/skyline/skyline-bashkortostan.git
```

Локально (или через GitHub Actions) — push в `deploy` для обновления продакшена.

Или настройте веб-хук: GitHub → webhook → скрипт `git pull` на сервере.

#### Шаг 9: Проверка

- `https://skyline-bashkortostan.ru` — сайт открывается
- `https://skyline-bashkortostan.ru/robots.txt` — отдаётся
- `https://skyline-bashkortostan.ru/sitemap.xml` — отдаётся
- `https://skyline-bashkortostan.ru/.well-known/security.txt` — отдаётся
- `https://skyline-bashkortostan.ru/api/lead.php?action=csrf` — возвращает JSON с токеном
- Отправьте тестовую заявку — проверьте Telegram и e-mail

#### Шаг 10: Мониторинг и бэкапы

- **Бэкапы БД:** `mysqldump skyline > backup-$(date +%F).sql` через cron
- **Логи:** `/var/log/nginx/`, `/var/log/skyline/`
- **Мониторинг:** UptimeRobot (бесплатно), или Better Stack, или свой Prometheus+Grafana
- **Fail2ban:** защита от brute-force SSH
- **Unattended-upgrades:** авто-обновления security-патчей ОС

### Ограничения

- Нужно настраивать сервер самому (или платить админу)
- Ответственность за бэкапы и обновления на вас
- 152-ФЗ: нужно вести журнал доступа к ПДн (уже реализовано в `lead.php`)

---

## Сравнение вариантов

| Параметр | GitHub Pages | Netlify | Vercel | Свой VPS |
|----------|:---:|:---:|:---:|:---:|
| Цена | 0 ₽ | 0 ₽ | 0 ₽ | от 200 ₽/мес |
| HTTPS | + | + | + | + (Let's Encrypt) |
| Свой домен | + | + | + | + |
| PHP | - | - | - | + |
| Свой backend | - | + (Functions) | + (Functions) | + |
| БД | - | - | - | + |
| CSP nonce | - | + (через Edge) | - | + |
| Security headers | через meta | + | + | + |
| Rate-limiting | - | + (Edge) | + (Edge) | + (nginx) |
| 152-ФЗ журнал | - | частично | частично | + |
| Сложность | низкая | низкая | средняя | высокая |
| Время деплоя | 5 мин | 10 мин | 15 мин | 1-2 часа |

---

## Чек-лист перед деплоем

- [ ] Все `CHANGE_ME` в `security/api/lead.php` заменены на реальные значения
- [ ] `.env` / `config.local.php` создан и не в git (проверьте `git status`)
- [ ] Домен зарегистрирован и настроен DNS
- [ ] SSL-сертификат выпущен
- [ ] `robots.txt` и `sitemap.xml` содержат корректный домен
- [ ] JSON-LD содержит корректный домен, телефон, адрес, ИНН
- [ ] Open Graph и Twitter Card мета-теги заполнены
- [ ] `og-image.jpg` (1200x630) загружен
- [ ] Favicon-набор сгенерирован (16, 32, 180, 192, 512)
- [ ] Тестовая заявка отправлена и получена (Telegram + e-mail)
- [ ] Яндекс.Метрика установлена и получает события
- [ ] Яндекс.Вебмастер: сайт добавлен, права подтверждены
- [ ] Google Search Console: сайт добавлен, права подтверждены
- [ ] Sitemap отправлен в обе панели вебмастера
- [ ] Карточки в Яндекс.Бизнесе, Google My Business, 2GIS созданы
- [ ] Lighthouse: Performance ≥ 90, Accessibility ≥ 95, SEO ≥ 95

---

## После деплоя

1. **Тест на реальном устройстве:**
   - Откройте сайт на смартфоне (Chrome, Safari)
   - Отправьте заявку, проверьте Telegram-уведомление
   - Проверьте, что звонок по телефону работает (`tel:` ссылка)

2. **Тест в Яндекс.Вебмастере:**
   - Проверка robots.txt
   - Проверка sitemap.xml
   - Переобход страницы

3. **Тест в Google Search Console:**
   - URL Inspection
   - Request indexing
   - Проверка мобильной версии

4. **Тест security:**
   - [securityheaders.com](https://securityheaders.com/?q=skyline-bashkortostan.ru) — оценка A+
   - [ssllabs.com](https://www.ssllabs.com/ssltest/) — оценка A или A+
   - [observatory.mozilla.org](https://observatory.mozilla.org/) — оценка A+

5. **Тест производительности:**
   - [PageSpeed Insights](https://pagespeed.web.dev/) — Desktop и Mobile
   - [WebPageTest](https://www.webpagetest.org/)

6. **Мониторинг:**
   - Подключите UptimeRobot (пинг каждые 5 мин)
   - Настройте алерты в Яндекс.Метрике

---

## Откат (Rollback)

### GitHub Pages / Netlify / Vercel

В интерфейсе платформы выберите предыдущий деплой и сделайте его текущим.

### Свой VPS

```bash
cd /var/www/skyline/public
git log --oneline -10          # найти предыдущий коммит
git checkout <prev-commit>     # откатиться
# или
git revert HEAD                # создать revert-коммит
```

Бэкап БД перед откатом:
```bash
mysqldump skyline > /backups/skyline-$(date +%F-%H%M).sql
```

---

> Подробности по security — в [SECURITY.md](SECURITY.md).
> Подробности по SEO — в [SEO-CHECKLIST.md](SEO-CHECKLIST.md).
