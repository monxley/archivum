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


# Порядок «материков» на карте «Сеть»: соседние семейства стоят рядом, люди — в центре
RING_ORDER = ["scripture", "levant", "ancient", "archaeology", "myth", "andreev", "esoteric",
              "societies", "conspiracy", "ufo", "anomaly", "fringe"]
CENTRE_DOMAIN = "persons"


def layout(nodes, edges, iterations=300, seed=7):
    """Раскладка «сеть», посчитанная заранее: каждый фонд — «материк» на кольце
    (Персоналии — в центре), внутри — отталкивание узлов и пружины по связям,
    между фондами — слабые «мосты». Сайту остаётся только отрисовать координаты."""
    import math
    import numpy as np

    rng = np.random.default_rng(seed)
    n = len(nodes)
    idx = {nd["id"]: i for i, nd in enumerate(nodes)}
    ring = [d for d in RING_ORDER if d in DOMAINS] + [d for d in DOMAINS if d not in RING_ORDER and d != CENTRE_DOMAIN]
    sizes = {d: sum(1 for nd in nodes if nd["d"] == d) for d in DOMAINS}
    rad = {d: 21.0 * math.sqrt(max(1, sizes[d])) for d in DOMAINS}
    gap = 70.0
    circ = sum(2 * rad[d] + gap for d in ring)
    R = max(circ / (2 * math.pi), rad.get(CENTRE_DOMAIN, 0) + max(rad[d] for d in ring) + 2 * gap)
    anchor = {CENTRE_DOMAIN: (0.0, 0.0)}
    a = -math.pi / 2
    for d in ring:
        span = (2 * rad[d] + gap) / circ * 2 * math.pi
        mid = a + span / 2
        anchor[d] = (R * math.cos(mid), R * math.sin(mid))
        a += span
    dom = [nd["d"] for nd in nodes]
    centre = np.array([anchor[d] for d in dom], dtype=float)
    spread = np.array([rad[d] for d in dom], dtype=float)
    pos = centre + rng.normal(0, 1, (n, 2)) * (spread[:, None] * 0.5)
    vel = np.zeros((n, 2))
    a_idx = np.array([idx[x] for x, y, _ in edges], dtype=int)
    b_idx = np.array([idx[y] for x, y, _ in edges], dtype=int)
    dom_i = np.array([list(DOMAINS).index(d) for d in dom])
    same = dom_i[a_idx] == dom_i[b_idx]
    rest = np.where(same, 30.0, 160.0)
    stiff = np.where(same, 0.22, 0.012)
    deg = np.bincount(np.concatenate([a_idx, b_idx]), minlength=n).astype(float)
    bias = deg[a_idx] / np.maximum(deg[a_idx] + deg[b_idx], 1)
    alpha, decay = 1.0, 1 - 0.002 ** (1 / iterations)
    chunk = 700
    cut2 = 340.0 ** 2
    for _ in range(iterations):
        force = np.zeros((n, 2))
        for s in range(0, n, chunk):
            d = pos[None, :, :] - pos[s:s + chunk, None, :]
            d2 = (d ** 2).sum(-1) + 1.0
            w = np.where(d2 < cut2, -40.0 / d2, 0.0)
            force[s:s + chunk] += (d * w[..., None]).sum(1)
        f = max(alpha, 0.12)  # силы затухают вместе, баланс кластеров сохраняется
        vel += force * f
        d = pos[b_idx] + vel[b_idx] - pos[a_idx] - vel[a_idx]
        l = np.sqrt((d ** 2).sum(1)) + 1e-6
        k = ((l - rest) / l * f * stiff)[:, None] * d
        np.add.at(vel, b_idx, -k * bias[:, None])
        np.add.at(vel, a_idx, k * (1 - bias)[:, None])
        # постоянное притяжение к своему материку: кластеры не сливаются к концу расчёта
        vel += (centre - pos) * 0.09 * f
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
