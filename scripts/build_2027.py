#!/usr/bin/env python3
"""build_2027.py — сборка bash-site-2027.html (premium mobile-first)."""

import os

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(BASE), "index.html")

def read(name):
    with open(os.path.join(BASE, name), "r", encoding="utf-8") as f:
        return f.read()

def main():
    head = read("part_head.html")
    body = read("part_body.html")
    style = read("part_style.css")
    script = read("part_script.js")
    html = f"""<!DOCTYPE html>
<html lang="ru">
<head>
{head}
<style>
{style}
</style>
</head>
<body>
{body}
<script>
{script}
</script>
</body>
</html>
"""
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Built {OUT} ({len(html)} bytes)")

if __name__ == "__main__":
    main()
