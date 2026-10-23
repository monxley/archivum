#!/usr/bin/env python3
"""Собирает базу знаний из kb/data/*.json в корень репозитория (сайт для GitHub Pages).

Проверки:
  * уникальность id, обязательные поля, допустимые статусы и типы связей;
  * ссылки на несуществующие узлы (печатаются как «висячие» и в сборку не идут).

Запуск:  python3 kb/build.py            — собрать
         python3 kb/build.py --check    — только проверить (код 1 при ошибках)
         python3 kb/build.py --strict   — висячие ссылки считать ошибкой
"""
import datetime
import json
import pathlib
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parent
DATA = ROOT / "data"
WEB = ROOT / "web"
OUT = ROOT.parent  # GitHub Pages публикует корень ветки main

DOMAINS = {
    "conspiracy": "Конспирология",
    "societies": "Тайные общества",
    "archaeology": "Археология и артефакты",
    "scripture": "Священные тексты",
    "esoteric": "Эзотерика и оккультизм",
    "myth": "Мифы и легенды",
    "ufo": "НЛО и палеоконтакт",
    "anomaly": "Аномалии и криптиды",
    "fringe": "Альт-история и наука",
    "persons": "Персоналии",
    "levant": "Ханаан и Израиль",
    "andreev": "Роза Мира",
    "ancient": "Народы древности",
}
STATUSES = {"fact", "disputed", "debunked", "hoax", "belief", "hypothesis"}
LINK_TYPES = {"src", "comp", "over", "anti"}
REQUIRED = ("id", "t", "sum")
PRIVATE_TAGS = set()  # служебные метки, которые не нужно показывать на сайте


def load():
    nodes, errors = [], []
    seen = {}
    for path in sorted(DATA.glob("*.json")):
        domain = path.stem
        if domain not in DOMAINS:
            errors.append(f"{path.name}: неизвестный домен (добавь его в DOMAINS)")
            continue
        try:
            items = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            errors.append(f"{path.name}: битый JSON — {e}")
            continue
        for n in items:
            for f in REQUIRED:
                if not n.get(f):
                    errors.append(f"{path.name}: узел без поля {f}: {n.get('id')}")
            nid = n.get("id")
            if nid in seen:
                errors.append(f"{path.name}: дубликат id {nid} (уже в {seen[nid]})")
                continue
            seen[nid] = path.name
            if n.get("s") not in STATUSES:
                errors.append(f"{nid}: неизвестный статус {n.get('s')}")
            for link in n.get("l", []):
                if len(link) != 2 or link[1] not in LINK_TYPES:
                    errors.append(f"{nid}: плохая связь {link}")
            n["d"] = domain
            nodes.append(n)
    return nodes, errors


def build_edges(nodes):
    ids = {n["id"] for n in nodes}
    edges, dangling = {}, {}
    for n in nodes:
        for target, kind in n.get("l", []):
            if target not in ids:
                dangling.setdefault(target, []).append(n["id"])
                continue
            if target == n["id"]:
                continue
            key = tuple(sorted((n["id"], target)))
            # Более «сильный» тип связи побеждает при дублях A→B / B→A.
            rank = {"anti": 3, "src": 2, "comp": 1, "over": 0}
            prev = edges.get(key)
            if prev is None or rank[kind] > rank[prev[2]]:
                edges[key] = (n["id"], target, kind)
    return list(edges.values()), dangling


def layout(nodes, edges, iterations=320, seed=7):
    """Раскладка «сеть», посчитанная заранее (аналог d3-force): кластеры по доменам,
    отталкивание узлов, пружины по связям. Сайту остаётся только отрисовать координаты."""
    import math
    import numpy as np

    rng = np.random.default_rng(seed)
    keys = list(DOMAINS)
    n = len(nodes)
    idx = {nd["id"]: i for i, nd in enumerate(nodes)}
    dom = np.array([keys.index(nd["d"]) for nd in nodes])
    r0 = 760 + 22 * math.sqrt(max(0, n - 600))
    ang = dom / len(keys) * 2 * math.pi - math.pi / 2
    centre = np.stack([np.cos(ang), np.sin(ang)], 1) * r0
    pos = centre + rng.normal(0, 60, (n, 2))
    vel = np.zeros((n, 2))
    a_idx = np.array([idx[a] for a, b, _ in edges], dtype=int)
    b_idx = np.array([idx[b] for a, b, _ in edges], dtype=int)
    same = dom[a_idx] == dom[b_idx]
    rest = np.where(same, 34.0, 120.0)
    deg = np.bincount(np.concatenate([a_idx, b_idx]), minlength=n).astype(float)
    bias = deg[a_idx] / np.maximum(deg[a_idx] + deg[b_idx], 1)
    strength = 0.22
    alpha, decay = 1.0, 1 - 0.001 ** (1 / iterations)
    chunk = 800
    for _ in range(iterations):
        # отталкивание (many-body), отсечка на 420
        force = np.zeros((n, 2))
        for s in range(0, n, chunk):
            d = pos[None, :, :] - pos[s:s + chunk, None, :]
            d2 = (d ** 2).sum(-1) + 1.0
            w = np.where(d2 < 420 ** 2, -46.0 / d2, 0.0)
            force[s:s + chunk] += (d * w[..., None]).sum(1)
        vel += force * alpha
        # пружины
        d = pos[b_idx] + vel[b_idx] - pos[a_idx] - vel[a_idx]
        l = np.sqrt((d ** 2).sum(1)) + 1e-6
        k = ((l - rest) / l * alpha * strength)[:, None] * d
        np.add.at(vel, b_idx, -k * bias[:, None])
        np.add.at(vel, a_idx, k * (1 - bias)[:, None])
        # притяжение к центру домена
        vel += (centre - pos) * 0.16 * alpha
        vel *= 0.6
        pos += vel
        alpha -= alpha * decay
    return {nd["id"]: (round(float(x), 1), round(float(y), 1)) for nd, (x, y) in zip(nodes, pos)}


def main():
    nodes, errors = load()
    edges, dangling = build_edges(nodes)
    strict = "--strict" in sys.argv

    if dangling:
        print(f"Висячие ссылки ({len(dangling)} целей) — узлы, которые стоит создать:")
        for target, sources in sorted(dangling.items(), key=lambda x: -len(x[1])):
            print(f"  {target:32s} ← {', '.join(sources)}")
        if strict:
            errors.append("висячие ссылки в режиме --strict")
    for e in errors:
        print("ОШИБКА:", e)

    print(f"Узлов: {len(nodes)}, связей: {len(edges)}, ошибок: {len(errors)}")
    if errors:
        sys.exit(1)
    if "--check" in sys.argv:
        return

    xy = layout(nodes, edges)
    for n in nodes:
        n["px"], n["py"] = xy[n["id"]]
    # Служебные метки (например, проект-источник темы) в публичную сборку не попадают.
    for n in nodes:
        n["tags"] = [t for t in n.get("tags", []) if t.lower() not in PRIVATE_TAGS]
    payload = {
        "built": datetime.date.today().isoformat(),
        "domains": DOMAINS,
        "nodes": [
            {k: n[k] for k in ("id", "t", "en", "d", "era", "y", "s", "sum", "ref", "tags", "px", "py") if k in n}
            for n in nodes
        ],
        "edges": edges,
    }
    OUT.mkdir(exist_ok=True)
    js = "window.KB=" + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n"
    (OUT / "data.js").write_text(js, encoding="utf-8")
    shutil.copy(WEB / "app.js", OUT / "app.js")
    page = (WEB / "index.html").read_text(encoding="utf-8")
    (OUT / "index.html").write_text(
        '<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        "</head>\n<body>\n" + page + "\n</body>\n</html>\n",
        encoding="utf-8",
    )
    (OUT / ".nojekyll").write_text("")
    print(f"Собрано в {OUT}")


if __name__ == "__main__":
    main()
