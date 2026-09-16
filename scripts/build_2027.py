#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""build_2027.py — сборка skyline-2027.html (premium mobile-first)."""
import re
import sys
import os

SRC = '/home/z/my-project/download/index.html'
OUT = '/home/z/my-project/download/skyline-2027.html'
HERE = os.path.dirname(os.path.abspath(__file__))

# --- Извлечение base64 ------------------------------------------------
with open(SRC, 'r', encoding='utf-8') as f:
    src = f.read()

img_re = re.compile(r'data:image/jpeg;base64,[A-Za-z0-9+/=]+')
imgs = img_re.findall(src)
seen = set()
imgs_unique = []
for i in imgs:
    if i not in seen:
        seen.add(i)
        imgs_unique.append(i)
while len(imgs_unique) < 6:
    imgs_unique.append(imgs_unique[-1])
print(f'Извлечено {len(imgs_unique)} уникальных base64 изображений', file=sys.stderr)
HERO_B64 = imgs_unique[0]
PORTFOLIO_B64 = imgs_unique[1:6]  # 5 шт для первых 5 слайдов

# --- Чтение частей ----------------------------------------------------
def load(name):
    with open(os.path.join(HERE, name), 'r', encoding='utf-8') as f:
        return f.read()

head_html = load('part_head.html')
css = load('part_style.css')
body_html = load('part_body.html')
js = load('part_script.js')

# Подстановка base64 плейсхолдеров в body
body_html = body_html.replace('__HERO_B64__', HERO_B64)
for i in range(5):
    body_html = body_html.replace(f'__P{i}__', PORTFOLIO_B64[i])

# Сборка финального файла
html = (
    '<!DOCTYPE html>\n'
    '<html lang="ru" data-theme="light">\n'
    '<head>\n'
    + head_html +
    '\n<style id="critical-css">\n'
    + css +
    '\n</style>\n'
    '</head>\n'
    '<body>\n'
    + body_html +
    '\n<script>\n'
    + js +
    '\n</script>\n'
    '</body>\n'
    '</html>\n'
)

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(html)

size = os.path.getsize(OUT)
with open(OUT, 'r', encoding='utf-8') as f:
    lines = sum(1 for _ in f)
print(f'OK: {OUT} — {size} байт, {lines} строк', file=sys.stderr)
