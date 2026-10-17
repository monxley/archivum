/* ARCHIVUM — опись тайного знания. Данные: data.js (window.KB), сборка: kb/build.py */
(() => {
  "use strict";
  const KB = window.KB;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = (x) => x.toLocaleString("ru-RU");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;

  /* ---------- знаки ---------- */
  const f2 = (v) => +v.toFixed(2);
  const Cc = (x, y, r) => `M${f2(x - r)} ${f2(y)}a${r} ${r} 0 1 0 ${f2(2 * r)} 0a${r} ${r} 0 1 0 ${f2(-2 * r)} 0`;
  const P = (pts, close = true) => "M" + pts.map(([x, y]) => `${f2(x)} ${f2(y)}`).join("L") + (close ? "Z" : "");
  const polar = (cx, cy, r, deg) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
  const starPts = (n, step, r, cx = 12, cy = 12, rot = -90) => Array.from({ length: n }, (_, i) => polar(cx, cy, r, rot + (360 * ((i * step) % n)) / n));
  const spiral = (cx, cy, r0, r1, turns, a0 = 0, steps = 64) => Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps; return polar(cx, cy, r0 + (r1 - r0) * t, a0 + t * turns * 360);
  });
  const SIGS = {
    eye: { d: P([[12, 2.5], [22, 20], [2, 20]]) + "M6.8 14.2Q12 9 17.2 14.2Q12 19.2 6.8 14.2Z", f: Cc(12, 14.2, 1.7) },
    compass: { d: "M12 3.2L5.2 20M12 3.2L18.8 20M3.4 12.4L12 20.6L20.6 12.4" + Cc(12, 3.2, 1.2) },
    book: { d: "M3 5.5Q8 3.8 12 6.3Q16 3.8 21 5.5V19Q16 17.3 12 19.8Q8 17.3 3 19ZM12 6.3V19.8M5.5 9.3Q8 8.5 10 9.6M5.5 12.6Q8 11.8 10 12.9M14 9.6Q16 8.5 18.5 9.3M14 12.9Q16 11.8 18.5 12.6" },
    ishtar: { d: P(starPts(8, 3, 10)) + Cc(12, 12, 2.2) },
    ufo: { d: "M2 13.5Q12 8 22 13.5Q12 19 2 13.5ZM7.2 11.6Q8 5.5 12 5.5Q16 5.5 16.8 11.6M9 18.2L7 22M15 18.2L17 22", f: Cc(7, 13.8, 0.8) + Cc(12, 14.6, 0.8) + Cc(17, 13.8, 0.8) },
    vortex: { d: P(spiral(12, 12, 0.6, 10, 2.4, -90, 90), false) },
    hourglass: { d: "M5.5 3H18.5M5.5 21H18.5M7 3Q7 9.5 12 12Q17 9.5 17 3M7 21Q7 14.5 12 12Q17 14.5 17 21", f: P([[9.3, 19.6], [14.7, 19.6], [12, 16.4]]) },
    ankh: { d: "M12 11.5Q6.6 7.4 9.2 3.7Q12 1.2 14.8 3.7Q17.4 7.4 12 11.5ZM12 11.5V22M5.5 12.2H18.5" },
    pyramid: { d: P([[2, 20.5], [12, 3.5], [22, 20.5]]) + "M4.9 15.6H19.1M7.9 10.5H16.1" },
    pentagram: { d: P(starPts(5, 2, 9.2, 12, 12.6)) + Cc(12, 12, 10.6) },
    rose: { d: Array.from({ length: 5 }, (_, i) => Cc(...polar(12, 12, 4.8, -90 + i * 72), 3.6)).join("") + Cc(12, 12, 1.8) },
    ouroboros: { d: "M19.99 9.09A8.5 8.5 0 1 1 16.25 4.64" + P([[19.99, 9.09], [22, 4.4], [16.25, 4.64]]), f: Cc(19.5, 6.4, 0.7) },
    head: { d: Cc(12, 7.5, 4) + "M3.5 21.5Q4.5 13.5 12 13.5Q19.5 13.5 20.5 21.5" },
    seal: { d: Cc(12, 12, 10.6) + Cc(12, 12, 8.4) + P([[12, 5.6], [18.2, 16.6], [5.8, 16.6]]) + "M8.6 13.5Q12 10.3 15.4 13.5Q12 16.5 8.6 13.5Z", f: Cc(12, 13.5, 1.1) },
    lens: { d: Cc(10.5, 10.5, 6.5) + "M15.3 15.3L21 21M7.4 10.5Q10.5 7.6 13.6 10.5Q10.5 13.4 7.4 10.5Z" },
    /* алхимические метки статусов */
    sol: { d: Cc(12, 12, 8.2), f: Cc(12, 12, 2.1) },
    mercury: { d: Cc(12, 11, 4.2) + "M7.8 3.2Q12 8.6 16.2 3.2M12 15.2V22M8.8 18.8H15.2" },
    moon: { d: "M15.5 3.6A8.6 8.6 0 1 0 15.5 20.4A7 7 0 1 1 15.5 3.6Z" },
    fire: { d: P([[12, 3.5], [20.5, 19], [3.5, 19]]) },
    crossed: { d: Cc(12, 12, 8.5) + "M6 6L18 18M18 6L6 18" },
    saturn: { d: "M9 2.5V15M5.6 5.6H12.4M9 10.2Q13.8 7.6 15.8 11Q17.6 14.4 13.6 18.2Q12 20 14.8 21.5" },
    /* словарь */
    hexagram: { d: P([[12, 2.5], [20.2, 16.75], [3.8, 16.75]]) + P([[12, 21.5], [3.8, 7.25], [20.2, 7.25]]) },
    horus: { d: "M3 7.5Q12 3.5 21 7M4 12Q12 6.5 19.5 11.5Q12 16 4 12ZM9.4 14.6V20Q9.4 22 7.4 21.5M13.6 14.6L17 20Q18 21.6 19.6 20.6Q21 19.4 19.6 18.2", f: Cc(11.6, 11.6, 2.2) },
    caduceus: { d: "M12 4.4V22M12 6Q7 3 2.6 4.8Q7 6 9.2 8.2M12 6Q17 3 21.4 4.8Q17 6 14.8 8.2M9 9Q15 11 12 13Q9 15 15 17Q16 19 12 20.5M15 9Q9 11 12 13Q15 15 9 17Q8 19 12 20.5" + Cc(12, 3.2, 1.2) },
    rosecross: { d: "M12 2.5V21.5M4 9H20" + Cc(12, 9, 3.4) + Cc(12, 9, 1.3) },
    monad: { d: "M7.6 3.6Q12 8.4 16.4 3.6" + Cc(12, 9.4, 3.4) + "M12 12.8V19.6M8.6 16.2H15.4M8 22Q8 19.3 10 19.9Q12 20.7 12 22Q12 20.7 14 19.9Q16 19.3 16 22", f: Cc(12, 9.4, 0.9) },
    tree: (() => {
      const S = [[12, 2.4], [18.5, 5.6], [5.5, 5.6], [18.5, 11.2], [5.5, 11.2], [12, 13.2], [18.5, 16.8], [5.5, 16.8], [12, 18.6], [12, 22.2]];
      const E = [[0, 1], [0, 2], [0, 5], [1, 2], [1, 3], [1, 5], [2, 4], [2, 5], [3, 4], [3, 5], [3, 6], [4, 5], [4, 7], [5, 6], [5, 7], [5, 8], [6, 7], [6, 8], [6, 9], [7, 8], [7, 9], [8, 9]];
      return { d: E.map(([a, b]) => P([S[a], S[b]], false)).join(""), f: S.map(([x, y]) => Cc(x, y, 1.45)).join(""), w: 0.8 };
    })(),
    flower: { d: Cc(12, 12, 4.4) + Array.from({ length: 6 }, (_, i) => Cc(...polar(12, 12, 4.4, -90 + i * 60), 4.4)).join("") + Cc(12, 12, 8.8), w: 0.8 },
    metatron: (() => {
      const pts = [[12, 12], ...Array.from({ length: 6 }, (_, i) => polar(12, 12, 4.6, -90 + i * 60)), ...Array.from({ length: 6 }, (_, i) => polar(12, 12, 9.2, -90 + i * 60))];
      let d = pts.map(([x, y]) => Cc(x, y, 2.3)).join("");
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) d += P([pts[i], pts[j]], false);
      return { d, w: 0.5 };
    })(),
    enneagram: (() => {
      const pt = (k) => polar(12, 12, 9.6, -90 + k * 40);
      return { d: Cc(12, 12, 9.6) + P([0, 3, 6].map(pt)) + P([1, 4, 2, 8, 5, 7].map(pt)), w: 0.9 };
    })(),
    vesica: { d: Cc(8.8, 12, 6.4) + Cc(15.2, 12, 6.4) },
    chirho: { d: "M12 3V21M12 3H14.5Q17.5 3 17.5 6.2Q17.5 9.4 14.5 9.4H12M6 8L18 18M18 8L6 18" },
    ichthys: { d: "M21.5 12Q12 2 3.5 16.8M21.5 12Q12 22 3.5 7.2", f: Cc(17.4, 11, 0.8) },
    labrys: { d: "M12 2.5V22M12 7Q5 2 3.5 5.5Q2.5 10 3.5 14.5Q5 18 12 13M12 7Q19 2 20.5 5.5Q21.5 10 20.5 14.5Q19 18 12 13" },
    triskelion: { d: [0, 1, 2].map((k) => { const a = -90 + 120 * k, q = polar(12, 12, 5.2, a); return P(spiral(q[0], q[1], 5.2, 0.5, 1.3, a + 180, 50), false); }).join("") },
    sator: { raw: `<rect x="2.5" y="2.5" width="19" height="19"/>` + ["SATOR", "AREPO", "TENET", "OPERA", "ROTAS"].map((w, i) => `<text x="12" y="${f2(5.85 + i * 3.8)}" font-size="3.3" text-anchor="middle" fill="currentColor" stroke="none" font-family="JetBrains Mono, monospace" letter-spacing=".5">${w}</text>`).join("") },
    tetragram: { raw: `<path d="${P([[12, 2.5], [22, 20.5], [2, 20.5]])}"/><text x="12" y="17.6" font-size="6" text-anchor="middle" fill="currentColor" stroke="none" font-family="'Frank Ruehl CLM','Times New Roman',serif" direction="rtl">יהוה</text>` },
  };
  const sigSVG = (name) => {
    const s = SIGS[name]; if (!s) return "";
    const w = 1.4 * (s.w || 1);
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${s.raw || `<path d="${s.d}"/>`}${s.f ? `<path d="${s.f}" fill="currentColor" stroke="none"/>` : ""}</svg>`;
  };
  const sig = (name, style = "") => `<i class="sig" aria-hidden="true"${style ? ` style="${style}"` : ""}>${sigSVG(name)}</i>`;
  const P2 = {};
  const path2d = (name) => P2[name] || (P2[name] = { s: new Path2D(SIGS[name].d), f: SIGS[name].f ? new Path2D(SIGS[name].f) : null, w: SIGS[name].w || 1 });
  function drawSig(g, name, x, y, size, color, lw = 1.5, fillDots = true) {
    const p = path2d(name), sc = size / 24;
    g.save(); g.translate(x, y); g.scale(sc, sc); g.translate(-12, -12);
    g.strokeStyle = color; g.lineWidth = (lw * p.w) / sc; g.lineCap = "round"; g.lineJoin = "round"; g.stroke(p.s);
    if (p.f && fillDots) { g.fillStyle = color; g.fill(p.f); }
    g.restore();
  }
  document.querySelectorAll("[data-sig]").forEach((el) => (el.innerHTML = sigSVG(el.dataset.sig)));

  /* ---------- справочники ---------- */
  const STATUS = { fact: "доказано", disputed: "спорно", debunked: "опровергнуто", hoax: "подделка", belief: "вера", hypothesis: "гипотеза" };
  const MARK = { fact: "sol", hypothesis: "mercury", disputed: "moon", belief: "fire", debunked: "crossed", hoax: "saturn" };
  const MARK_TXT = {
    fact: ["Солнце, золото", "подтверждено документами, раскопками или экспериментом"],
    hypothesis: ["Меркурий, ртуть", "научное или философское предположение, ещё подвижное"],
    disputed: ["Луна, серебро", "консенсуса нет: свет отражённый, свидетельства спорят"],
    belief: ["Огонь", "религиозная или мифологическая традиция, предмет веры"],
    debunked: ["Перечёркнутый круг", "проверено и не подтвердилось"],
    hoax: ["Сатурн, свинец", "доказанная фальсификация: свинец, выданный за золото"],
  };
  const DOMS = KB.domains;
  const domKeys = Object.keys(DOMS);
  const DSIG = { conspiracy: "eye", societies: "compass", scripture: "book", levant: "ishtar", ufo: "ufo", anomaly: "vortex", fringe: "hourglass",
    archaeology: "ankh", ancient: "pyramid", esoteric: "pentagram", andreev: "rose", myth: "ouroboros", persons: "head" };
  const dsig = (d) => DSIG[d] || "seal";
  // Семейства фондов — 7 категориальных цветов (палитра проверена на различимость при дальтонизме)
  const FAMS = [
    { name: "Тексты и религии", doms: ["scripture", "levant"] },
    { name: "Заговоры и общества", doms: ["conspiracy", "societies"] },
    { name: "НЛО, аномалии, альт-история", doms: ["ufo", "anomaly", "fringe"] },
    { name: "Древность и находки", doms: ["archaeology", "ancient"] },
    { name: "Эзотерика и мистика", doms: ["esoteric", "andreev"] },
    { name: "Мифы и легенды", doms: ["myth"] },
    { name: "Люди", doms: ["persons"] },
  ];
  const famOf = {};
  FAMS.forEach((f, i) => f.doms.forEach((d) => (famOf[d] = i)));
  domKeys.forEach((d) => { if (famOf[d] === undefined) famOf[d] = 6; });
  const famVar = (d) => `var(--f${famOf[d] + 1})`;
  const domOrder = [...domKeys].sort((a, b) => famOf[a] - famOf[b]);
  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI"];
  const fondNo = (d) => ROMAN[domOrder.indexOf(d)] || "";

  /* ---------- данные ---------- */
  const nodes = KB.nodes.map((n) => ({ ...n, yr: n.y, deg: 0, adj: [] }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges = KB.edges.map(([a, b, kind]) => ({ source: byId.get(a), target: byId.get(b), kind }));
  for (const e of edges) {
    e.source.deg++; e.target.deg++;
    e.source.adj.push({ n: e.target, kind: e.kind, out: true });
    e.target.adj.push({ n: e.source, kind: e.kind, out: false });
  }
  const norm = (s) => String(s || "").toLowerCase().replace(/ё/g, "е");
  nodes.forEach((n) => { n.tn = norm(n.t); n.hay = norm([n.t, n.en, (n.tags || []).join(" "), n.era].join(" ")); });
  const byDeg = [...nodes].sort((a, b) => b.deg - a.deg);
  const perDom = {};
  nodes.forEach((n) => { perDom[n.d] = (perDom[n.d] || 0) + 1; n.dno = perDom[n.d]; });
  const cipher = (n) => `Ф. ${fondNo(n.d)} · Д. ${String(n.dno).padStart(4, "0")}`;
  const statusChip = (s) => `<span class="status st-${s}">${sig(MARK[s])}${STATUS[s] || s}</span>`;

  $("m-nodes").textContent = fmt(nodes.length);
  $("m-edges").textContent = fmt(edges.length);
  const cnt = (f) => nodes.filter(f).length;
  $("ledger").innerHTML = [["Дел", fmt(nodes.length)], ["Связей", fmt(edges.length)], ["Фондов", domKeys.length],
    ["Доказано", fmt(cnt((n) => n.s === "fact"))], ["Опровергнуто", fmt(cnt((n) => n.s === "debunked" || n.s === "hoax")), "red"]]
    .map(([t, v, c]) => `<div><dt>${t}</dt><dd class="${c || ""}">${v}</dd></div>`).join("");
  $("n-dom").textContent = domKeys.length; $("n-reg").textContent = fmt(nodes.length);
  $("m-date").textContent = "сверено " + (KB.built ? new Date(KB.built).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : "");
  $("foot-status").innerHTML = Object.keys(MARK_TXT).map((s) => `<dt>${statusChip(s)}</dt><dd>${MARK_TXT[s][1]}</dd>`).join("");

  /* ---------- тема ---------- */
  const root = document.documentElement;
  try { const t = localStorage.getItem("archivum-theme"); if (t) root.dataset.theme = t; } catch (_) {}
  $("theme").onclick = () => {
    const light = root.dataset.theme ? root.dataset.theme === "light" : matchMedia("(prefers-color-scheme: light)").matches;
    root.dataset.theme = light ? "dark" : "light";
    try { localStorage.setItem("archivum-theme", root.dataset.theme); } catch (_) {}
  };
  let C = {};
  function readColors() {
    const cs = getComputedStyle(root);
    const g = (v) => cs.getPropertyValue(v).trim();
    C = { ink: g("--ink"), ink2: g("--ink-2"), mute: g("--mute"), surface: g("--surface"), bg: g("--bg"), bg2: g("--bg-2"), line: g("--line"),
      gold: g("--gold"), gold2: g("--gold-2"), seal: g("--seal"), bad: g("--bad"), fam: FAMS.map((_, i) => g("--f" + (i + 1))) };
  }
  readColors();
  const onTheme = () => { readColors(); draw(); SEAL && SEAL.paint(); };
  matchMedia("(prefers-color-scheme: light)").addEventListener("change", onTheme);
  new MutationObserver(onTheme).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  /* ---------- раскладки ---------- */
  const rad = (n) => 2.4 + Math.sqrt(n.deg) * 1.25;
  nodes.forEach((n) => { n.x = n.nx = n.px; n.y = n.ny = n.py; });
  const domCentre = domKeys.map((d) => {
    const ns = nodes.filter((n) => n.d === d);
    const cx = ns.reduce((s, n) => s + n.x, 0) / (ns.length || 1), cy = ns.reduce((s, n) => s + n.y, 0) / (ns.length || 1);
    const ds = ns.map((n) => Math.hypot(n.x - cx, n.y - cy)).sort((a, b) => a - b);
    const r = ds[Math.floor(ds.length * 0.85)] || 0, l = Math.hypot(cx, cy) || 1;
    return { d, x: cx + (cx / l) * (r + 50), y: cy + (cy / l) * (r + 50) };
  });
  const ringOrder = [...nodes].sort((a, b) => famOf[a.d] - famOf[b.d] || domKeys.indexOf(a.d) - domKeys.indexOf(b.d) || (a.yr ?? 0) - (b.yr ?? 0));
  const RR = 760;
  ringOrder.forEach((n, i) => {
    const gap = famOf[n.d] * 6;
    const a = ((i + gap) / (nodes.length + FAMS.length * 6)) * Math.PI * 2 - Math.PI / 2;
    n.ra = a; n.rx = Math.cos(a) * RR; n.ry = Math.sin(a) * RR;
  });
  // «Сфера»: раскладка сети натягивается на шар — центр сети у полюса, окраина у противоположного
  {
    const rs = nodes.map((n) => Math.hypot(n.px, n.py)).sort((a, b) => a - b);
    const rmax = rs[Math.floor(rs.length * 0.97)] || 1;
    for (const n of nodes) {
      const th = Math.min(1, Math.hypot(n.px, n.py) / rmax) * Math.PI * 0.93, ph = Math.atan2(n.py, n.px);
      n.p3 = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
    }
  }
  const easeCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* ---------- холст ---------- */
  const canvas = $("graph"), ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  const T = { x: 0, y: 0, k: 1, invert: ([px, py]) => [(px - T.x) / T.k, (py - T.y) / T.k] };
  let mode = "focus", hover = null, current = null, pathSet = null, pathEdges = null;
  const activeFam = new Set(FAMS.map((_, i) => i));
  const visibleFam = (n) => activeFam.has(famOf[n.d]);
  const KMIN = 0.05, KMAX = 8, clampK = (k) => Math.min(KMAX, Math.max(KMIN, k));
  let tween = 0, raf = 0;
  function draw() { if (!raf) raf = requestAnimationFrame(render); }
  function setT(x, y, k) { cancelAnimationFrame(tween); T.x = x; T.y = y; T.k = k; draw(); }
  function zoomAt(px, py, k) {
    if (mode === "sphere") { sph.k = Math.min(4, Math.max(0.5, sph.k * (k / T.k))); draw(); return; }
    k = clampK(k); setT(px - ((px - T.x) / T.k) * k, py - ((py - T.y) / T.k) * k, k);
  }
  function animateT(x, y, k, dur = 600) {
    cancelAnimationFrame(tween);
    if (reduced) { setT(x, y, k); return; }
    const a = { x: T.x, y: T.y, k: T.k }, t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur), q = easeCubic(p);
      T.x = a.x + (x - a.x) * q; T.y = a.y + (y - a.y) * q; T.k = a.k + (k - a.k) * q;
      draw(); if (p < 1) tween = requestAnimationFrame(step);
    };
    tween = requestAnimationFrame(step);
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    draw();
  }
  function moveNodes(targets, dur, done) {
    const list = [...targets.keys()];
    const from = list.map((n) => [n.x, n.y]), to = list.map((n) => targets.get(n));
    if (reduced) { list.forEach((n, i) => { [n.x, n.y] = to[i]; }); draw(); done && done(); return; }
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur), q = easeCubic(p);
      list.forEach((n, i) => { n.x = from[i][0] + (to[i][0] - from[i][0]) * q; n.y = from[i][1] + (to[i][1] - from[i][1]) * q; });
      draw(); if (p < 1) requestAnimationFrame(step); else done && done();
    };
    requestAnimationFrame(step);
  }

  /* «Фокус»: одна идея в центре астролябии, её связи — по секторам */
  const FGROUPS = [
    ["src", true, "Опирается на"], ["src", false, "Повлияло на"], ["comp", null, "Дополняет"],
    ["over", null, "Пересекается"], ["anti", true, "Опровергает"], ["anti", false, "Опровергается"],
  ];
  const groupsOf = (n) => FGROUPS.map(([kind, out, title]) => ({
    kind, title,
    items: n.adj.filter((a) => a.kind === kind && (out === null || a.out === out)).sort((a, b) => b.n.deg - a.n.deg),
  })).filter((g) => g.items.length);
  let fSet = null, fMeta = [], fR = 260, history = [];
  function layoutFocus(c) {
    const groups = groupsOf(c);
    const total = groups.reduce((s, g) => s + g.items.length, 0);
    fR = Math.max(220, (total * 30) / (2 * Math.PI));
    const gap = groups.length > 1 ? 0.2 : 0;
    const step = total ? (2 * Math.PI - gap * groups.length) / total : 0;
    let a = -Math.PI / 2 + gap / 2;
    fSet = new Set([c]); fMeta = [];
    const target = new Map([[c, [0, 0]]]);
    for (const g of groups) {
      const a0 = a;
      for (const it of g.items) {
        const ang = a + step / 2;
        if (!target.has(it.n)) { target.set(it.n, [Math.cos(ang) * fR, Math.sin(ang) * fR]); it.n.fa = ang; }
        fSet.add(it.n); a += step;
      }
      fMeta.push({ title: g.title, count: g.items.length, a0, a1: a });
      a += gap;
    }
    return target;
  }
  function fitFocus(animate) {
    if (!W) return;
    const span = (fR + (W < 640 ? 80 : 180)) * 2;
    const k = clampK(Math.min(W / span, (H - 110) / span, 2.2));
    const x = W / 2, y = H / 2 + 26;
    if (animate) animateT(x, y, k, 520); else setT(x, y, k);
  }
  function fitAll(animate) {
    const vis = nodes.filter(visibleFam);
    if (!vis.length || !W) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of vis) { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); }
    const pad = mode === "ring" ? 170 : 70;
    const k = clampK(Math.min(W / (x1 - x0 + pad * 2), (H - 100) / (y1 - y0 + pad * 2), 3));
    const x = W / 2 - ((x0 + x1) / 2) * k, y = H / 2 + 10 - ((y0 + y1) / 2) * k;
    if (animate) animateT(x, y, k); else setT(x, y, k);
  }
  function fit(animate) { if (mode === "focus") fitFocus(animate); else if (mode === "sphere") { sph.k = 1; draw(); } else fitAll(animate); }

  const MODES = [["v-focus", "focus"], ["v-sphere", "sphere"], ["v-net", "net"], ["v-ring", "ring"]];
  function setMode(m) {
    if (m === mode && m !== "focus") return;
    const prev = mode; mode = m;
    for (const [id, v] of MODES) $(id).setAttribute("aria-pressed", mode === v);
    $("sphere-hint").hidden = mode !== "sphere";
    try { localStorage.setItem("archivum-mode", mode); } catch (_) {}
    renderCrumbs();
    if (m === "focus") { showFocus(current || byDeg[0], prev === "focus"); return; }
    fSet = null;
    if (m === "sphere") { sph.idle = 0; if (current) faceNode(current, prev === "sphere"); spin(); draw(); return; }
    const targets = new Map(nodes.map((n) => [n, m === "ring" ? [n.rx, n.ry] : [n.nx, n.ny]]));
    moveNodes(targets, 850, () => { fitAll(true); if (current) centerOn(current, true); });
  }
  function showFocus(c, wasFocus) {
    const target = layoutFocus(c);
    moveNodes(target, wasFocus ? 600 : 800);
    fitFocus(true);
  }
  function centerOn(n, soft) {
    if (!n || !W) return;
    const k = soft ? T.k : Math.max(T.k, 1.4);
    animateT(W / 2 - n.x * k, H / 2 - n.y * k, k, 600);
  }

  /* рендер */
  const kStyle = (k) => ({ src: [C.ink2, []], comp: [C.mute, []], over: [C.mute, [1.5 / k, 3 / k]], anti: [C.bad, [5 / k, 3 / k]] });
  function nodeShape(n, r, x = n.x, y = n.y) {
    ctx.beginPath();
    if (n.s === "debunked" || n.s === "hoax") ctx.rect(x - r, y - r, r * 2, r * 2); else ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  function label(text, x, y, k, size, weight, color, align = "left") {
    ctx.font = `${weight} ${size / k}px Alegreya, Georgia, serif`;
    ctx.textAlign = align; ctx.lineJoin = "round";
    ctx.strokeStyle = C.bg2; ctx.lineWidth = 4 / k; ctx.strokeText(text, x, y);
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  }
  function render() {
    raf = 0; if (!W) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.textBaseline = "middle";
    if (mode === "sphere") { renderSphere(); ctx.globalAlpha = 1; return; }
    ctx.save(); ctx.translate(T.x, T.y); ctx.scale(T.k, T.k);
    if (mode === "focus" && fSet) renderFocus(); else renderAll();
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function renderFocus() {
    const k = T.k, st = kStyle(k), c = current;
    // астролябия: лимб с делениями и секторы групп связей
    ctx.strokeStyle = C.gold; ctx.globalAlpha = 0.28; ctx.lineWidth = 1 / k;
    ctx.beginPath(); ctx.arc(0, 0, fR * 0.42, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.16; ctx.beginPath(); ctx.arc(0, 0, fR * 0.84, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2, l = i % 6 ? 6 : 14, r0 = fR * 0.84;
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * (r0 - l / k), Math.sin(a) * (r0 - l / k));
    }
    ctx.stroke();
    ctx.globalAlpha = 0.35; ctx.lineWidth = 2 / k;
    for (const g of fMeta) { ctx.beginPath(); ctx.arc(0, 0, fR * 0.84 + 6 / k, g.a0 + 0.02, g.a1 - 0.02); ctx.stroke(); }
    ctx.lineWidth = 0.8 / k; ctx.globalAlpha = 0.14; ctx.strokeStyle = C.mute; ctx.setLineDash([]);
    ctx.beginPath();
    for (const e of edges) {
      if (e.source === c || e.target === c) continue;
      if (fSet.has(e.source) && fSet.has(e.target)) { ctx.moveTo(e.source.x, e.source.y); ctx.lineTo(e.target.x, e.target.y); }
    }
    ctx.stroke();
    for (const a of c.adj) {
      const [col, dash] = st[a.kind];
      ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(a.n.x, a.n.y);
      ctx.strokeStyle = a.n === hover ? C.gold : col; ctx.setLineDash(dash); ctx.lineWidth = (a.n === hover ? 2.2 : 1.1) / k;
      ctx.globalAlpha = hover && a.n !== hover ? 0.3 : 0.75; ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    const cr = Math.max(16, rad(c) * 1.6);
    for (const n of fSet) {
      const r = n === c ? cr : rad(n) * 1.15;
      ctx.globalAlpha = hover && n !== hover && n !== c ? 0.55 : 1;
      if (n === c) {
        ctx.fillStyle = C.bg2; ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = C.fam[famOf[n.d]]; ctx.lineWidth = 2 / k; ctx.stroke();
        ctx.strokeStyle = C.gold; ctx.lineWidth = 1 / k; ctx.beginPath(); ctx.arc(n.x, n.y, r + 6 / k, 0, Math.PI * 2); ctx.stroke();
        drawSig(ctx, dsig(n.d), n.x, n.y, r * 1.25, C.gold, 1.6 / k);
        continue;
      }
      ctx.fillStyle = C.fam[famOf[n.d]]; nodeShape(n, r); ctx.fill();
      ctx.strokeStyle = C.bg2; ctx.lineWidth = 2 / k; ctx.stroke();
      if (n === hover) { ctx.globalAlpha = 1; ctx.strokeStyle = C.gold; ctx.lineWidth = 1.6 / k; ctx.beginPath(); ctx.arc(n.x, n.y, r + 5 / k, 0, Math.PI * 2); ctx.stroke(); }
    }
    const max = W < 640 ? 16 : 32;
    for (const n of fSet) {
      if (n === c) continue;
      const cs = Math.cos(n.fa), sn = Math.sin(n.fa), r = rad(n) * 1.15 + 7 / k;
      const t = n.t.length > max ? n.t.slice(0, max - 1) + "…" : n.t;
      ctx.globalAlpha = hover && n !== hover ? 0.5 : 1;
      const col = n === hover ? C.gold : C.ink, w = n === hover ? 700 : 400;
      if (Math.abs(cs) < 0.28) label(t, n.x, n.y + (sn > 0 ? r + 6 / k : -r - 6 / k), k, 13.5, w, col, "center");
      else label(t, n.x + (cs > 0 ? r : -r), n.y, k, 13.5, w, col, cs > 0 ? "left" : "right");
    }
    ctx.globalAlpha = 1;
    ctx.font = `500 ${Math.max(22, 28 * k) / k}px "Cormorant Unicase", Georgia, serif`;
    ctx.textAlign = "center"; ctx.lineJoin = "round";
    const cy = c.y - cr - 22 / k;
    ctx.strokeStyle = C.bg2; ctx.lineWidth = 6 / k; ctx.strokeText(c.t, 0, cy);
    ctx.fillStyle = C.ink; ctx.fillText(c.t, 0, cy);
    if (!c.adj.length) { ctx.font = `italic 400 ${14 / k}px Alegreya, serif`; ctx.fillStyle = C.mute; ctx.fillText("Связей пока нет", 0, cr + 30 / k); }
  }
  const isHot = (e) => (pathEdges ? pathEdges.has(e) : current && (e.source === current || e.target === current));
  const lit = (n) => visibleFam(n) && (pathSet ? pathSet.has(n) : !current || n === current || current.adj.some((a) => a.n === n));
  function renderAll() {
    const k = T.k, st = kStyle(k), ring = mode === "ring";
    const focus = !!(current || pathSet);
    const curve = (e) => {
      ctx.moveTo(e.source.x, e.source.y);
      if (ring) ctx.quadraticCurveTo((e.source.x + e.target.x) * 0.1, (e.source.y + e.target.y) * 0.1, e.target.x, e.target.y);
      else ctx.lineTo(e.target.x, e.target.y);
    };
    if (ring) { ctx.strokeStyle = C.gold; ctx.globalAlpha = 0.25; ctx.lineWidth = 1 / k; ctx.beginPath(); ctx.arc(0, 0, RR * 1.0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.lineWidth = 0.7 / k;
    for (const kind of ["comp", "over", "src", "anti"]) {
      ctx.beginPath();
      for (const e of edges) if (e.kind === kind && visibleFam(e.source) && visibleFam(e.target) && !isHot(e)) curve(e);
      ctx.strokeStyle = st[kind][0]; ctx.setLineDash(st[kind][1]);
      ctx.globalAlpha = focus ? 0.05 : ring ? 0.16 : 0.22; ctx.stroke();
    }
    if (focus) {
      ctx.lineWidth = 1.6 / k;
      for (const e of edges) {
        if (!isHot(e)) continue;
        ctx.beginPath(); curve(e);
        ctx.strokeStyle = pathSet ? C.gold : e.kind === "anti" ? C.bad : C.ink; ctx.setLineDash(st[e.kind][1]);
        ctx.globalAlpha = 0.9; ctx.stroke();
      }
    }
    ctx.setLineDash([]);
    for (const n of nodes) {
      if (!visibleFam(n)) continue;
      const on = lit(n), r = rad(n);
      ctx.globalAlpha = on ? 1 : 0.12;
      ctx.fillStyle = C.fam[famOf[n.d]]; nodeShape(n, r); ctx.fill();
      if (n === current || n === hover) { ctx.globalAlpha = 1; ctx.strokeStyle = C.gold; ctx.lineWidth = 2 / k; ctx.beginPath(); ctx.arc(n.x, n.y, r + 4 / k, 0, Math.PI * 2); ctx.stroke(); }
    }
    if (ring) {
      const fs = Math.max(7.5, Math.min(11, 7 * k * 1.6));
      for (const n of nodes) {
        if (!visibleFam(n)) continue;
        const on = lit(n);
        ctx.globalAlpha = on ? (focus ? 1 : 0.7) : 0.1;
        ctx.save(); ctx.translate(n.x, n.y);
        const flip = Math.cos(n.ra) < 0; ctx.rotate(flip ? n.ra + Math.PI : n.ra);
        ctx.font = `400 ${fs / k}px Alegreya, serif`; ctx.textAlign = flip ? "right" : "left";
        ctx.fillStyle = n === current ? C.gold : C.ink;
        ctx.fillText(n.t, (rad(n) + 4 / k) * (flip ? -1 : 1), 0);
        ctx.restore();
      }
    } else {
      for (const n of nodes) {
        const on = lit(n);
        const show = n === hover || n === current || (focus && on) || (!focus && visibleFam(n) && n.deg * k >= 10);
        if (!show) continue;
        ctx.globalAlpha = on ? 1 : 0.35;
        label(n.t, n.x + rad(n) + 4 / k, n.y, k, 13, n === current ? 700 : 400, n === current ? C.gold : C.ink);
      }
      for (const c of domCentre) {
        if (!activeFam.has(famOf[c.d])) continue;
        ctx.globalAlpha = focus ? 0.2 : 0.55;
        const fs = Math.max(14, 18 * k) / k;
        drawSig(ctx, dsig(c.d), c.x, c.y - fs * 1.3, fs * 1.6, C.gold, 1.3 / k);
        ctx.font = `500 ${fs}px "Cormorant Unicase", Georgia, serif`; ctx.textAlign = "center"; ctx.fillStyle = C.ink;
        ctx.fillText(DOMS[c.d], c.x, c.y);
      }
    }
  }

  /* «Сфера»: вся опись на вращающемся небесном шаре */
  const sph = { yaw: 0.7, pitch: -0.45, k: 1, idle: 0, anim: 0 };
  let spinRaf = 0, stageVisible = true;
  const SD = 3.2;
  function sphProject(p) {
    const cy = Math.cos(sph.yaw), sy = Math.sin(sph.yaw), cp = Math.cos(sph.pitch), sp = Math.sin(sph.pitch);
    const x1 = p[0] * cy - p[2] * sy, z1 = p[0] * sy + p[2] * cy;
    const y2 = p[1] * cp - z1 * sp, z2 = p[1] * sp + z1 * cp;
    const S = Math.min(W, H) * 0.34 * sph.k, s = (S * SD) / (SD + z2);
    return [W / 2 + x1 * s, H / 2 - 4 - y2 * s, z2, s / S];
  }
  const GRAT = (() => {
    const lines = [];
    for (const lat of [-60, -30, 0, 30, 60]) {
      const t = (lat * Math.PI) / 180, pts = [];
      for (let i = 0; i <= 64; i++) { const a = (i / 64) * Math.PI * 2; pts.push([Math.cos(t) * Math.cos(a), Math.sin(t), Math.cos(t) * Math.sin(a)]); }
      lines.push(pts);
    }
    for (let m = 0; m < 12; m++) {
      const a = (m / 12) * Math.PI * 2, pts = [];
      for (let i = 0; i <= 32; i++) { const t = -Math.PI / 2 + (i / 32) * Math.PI; pts.push([Math.cos(t) * Math.cos(a), Math.sin(t), Math.cos(t) * Math.sin(a)]); }
      lines.push(pts);
    }
    return lines;
  })();
  function renderSphere() {
    const focus = !!(current || pathSet);
    // градусная сетка: передняя половина ярче задней
    const front = new Path2D(), back = new Path2D();
    for (const pts of GRAT) {
      let prev = null;
      for (const p of pts) {
        const q = sphProject(p);
        if (prev) { const path = (prev[2] + q[2]) / 2 < 0 ? front : back; path.moveTo(prev[0], prev[1]); path.lineTo(q[0], q[1]); }
        prev = q;
      }
    }
    ctx.lineWidth = 1; ctx.strokeStyle = C.gold;
    ctx.globalAlpha = 0.07; ctx.stroke(back);
    ctx.globalAlpha = 0.2; ctx.stroke(front);
    const S = Math.min(W, H) * 0.34 * sph.k;
    ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(W / 2, H / 2 - 4, S * SD / Math.sqrt(SD * SD - 1), 0, Math.PI * 2); ctx.stroke();
    for (const n of nodes) { const q = sphProject(n.p3); n.sx = q[0]; n.sy = q[1]; n.sz = q[2]; n.ss = q[3]; }
    // связи — четыре слоя по глубине
    const buckets = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    const hot = [];
    for (const e of edges) {
      const a = e.source, b = e.target;
      if (!visibleFam(a) || !visibleFam(b)) continue;
      if (focus && isHot(e)) { hot.push(e); continue; }
      const z = (a.sz + b.sz) / 2, i = Math.max(0, Math.min(3, Math.floor((z + 1) * 2)));
      buckets[i].moveTo(a.sx, a.sy); buckets[i].lineTo(b.sx, b.sy);
    }
    ctx.lineWidth = 0.7; ctx.strokeStyle = C.mute;
    [0.32, 0.2, 0.1, 0.05].forEach((al, i) => { ctx.globalAlpha = focus ? al * 0.35 : al; ctx.stroke(buckets[i]); });
    ctx.lineWidth = 1.5;
    for (const e of hot) {
      ctx.beginPath(); ctx.moveTo(e.source.sx, e.source.sy); ctx.lineTo(e.target.sx, e.target.sy);
      ctx.strokeStyle = pathSet ? C.gold : e.kind === "anti" ? C.bad : C.gold; ctx.globalAlpha = 0.85; ctx.stroke();
    }
    const order = nodes.filter(visibleFam).sort((a, b) => b.sz - a.sz);
    for (const n of order) {
      const on = lit(n), depth = (1 - n.sz) / 2, r = rad(n) * (0.55 + n.ss * 0.55) * Math.sqrt(sph.k);
      ctx.globalAlpha = (on ? 1 : 0.14) * (0.3 + 0.7 * depth);
      ctx.fillStyle = C.fam[famOf[n.d]]; nodeShape(n, r, n.sx, n.sy); ctx.fill();
      if (n === current || n === hover) { ctx.globalAlpha = 1; ctx.strokeStyle = C.gold; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(n.sx, n.sy, r + 4, 0, Math.PI * 2); ctx.stroke(); }
    }
    const minDeg = sph.k > 2 ? 6 : sph.k > 1.4 ? 10 : 16;
    for (const n of order) {
      const on = lit(n);
      const show = n === hover || n === current || (focus ? on && n.sz < 0.2 : n.sz < -0.25 && n.deg >= minDeg);
      if (!show || !visibleFam(n)) continue;
      ctx.globalAlpha = n.sz < 0 ? 1 : 0.55;
      label(n.t, n.sx + rad(n) * 0.9 + 5, n.sy, 1, n === current ? 14.5 : 12.5, n === current ? 700 : 400, n === current || n === hover ? C.gold : C.ink);
    }
  }
  function spin() {
    if (spinRaf || mode !== "sphere") return;
    let last = performance.now();
    const step = (now) => {
      spinRaf = 0;
      if (mode !== "sphere") return;
      const dt = Math.min(64, now - last); last = now;
      if (stageVisible && !document.hidden) {
        if (!reduced && !ptrs.size && !hover && now - sph.idle > 3500 && !sph.anim) { sph.yaw += dt * 0.00009; draw(); }
      }
      spinRaf = requestAnimationFrame(step);
    };
    spinRaf = requestAnimationFrame(step);
  }
  function faceNode(n, animate = true) {
    const [x, y, z] = n.p3;
    let ty = Math.atan2(x, z) + Math.PI;
    const zr = x * Math.sin(ty) + z * Math.cos(ty);
    const tp = Math.atan2(-y, -zr);
    while (ty - sph.yaw > Math.PI) ty -= 2 * Math.PI;
    while (ty - sph.yaw < -Math.PI) ty += 2 * Math.PI;
    sph.idle = performance.now();
    if (reduced || !animate) { sph.yaw = ty; sph.pitch = tp; draw(); return; }
    const a = { y: sph.yaw, p: sph.pitch }, t0 = performance.now();
    cancelAnimationFrame(sph.anim);
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 750), q = easeCubic(p);
      sph.yaw = a.y + (ty - a.y) * q; sph.pitch = a.p + (tp - a.p) * q; draw();
      sph.anim = p < 1 ? requestAnimationFrame(step) : 0;
    };
    sph.anim = requestAnimationFrame(step);
  }
  new IntersectionObserver((es) => { stageVisible = es[0].isIntersecting; }).observe(canvas);

  /* указатель, масштаб, клики */
  function nodeAt(px, py) {
    let best = null, bd = Infinity;
    if (mode === "sphere") {
      for (const n of nodes) {
        if (!visibleFam(n) || n.sx === undefined) continue;
        const d = Math.hypot(n.sx - px, n.sy - py) + n.sz * 6, lim = rad(n) + (coarse ? 16 : 8);
        if (Math.hypot(n.sx - px, n.sy - py) < lim && d < bd) { bd = d; best = n; }
      }
      return best;
    }
    const [wx, wy] = T.invert([px, py]);
    const pool = mode === "focus" && fSet ? fSet : nodes;
    for (const n of pool) {
      if (mode !== "focus" && !visibleFam(n)) continue;
      const d = Math.hypot(n.x - wx, n.y - wy), lim = rad(n) * 1.5 + (coarse ? 16 : 7) / T.k;
      if (d < lim && d < bd) { bd = d; best = n; }
    }
    return best;
  }
  let mapActive = false;
  document.addEventListener("pointerdown", (e) => { mapActive = canvas.contains(e.target); });
  canvas.addEventListener("wheel", (e) => {
    if (!(e.ctrlKey || e.metaKey || mapActive)) return;
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, T.k * Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0022)));
  }, { passive: false });
  const ptrs = new Map();
  let dragged = false, pinch = null;
  canvas.addEventListener("pointerdown", (e) => {
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); dragged = false; sph.idle = performance.now();
    if (e.pointerType !== "touch") { canvas.setPointerCapture(e.pointerId); canvas.classList.add("drag"); }
    if (ptrs.size === 2) { const [p, q] = [...ptrs.values()]; pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2 }; }
  });
  canvas.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    const prev = ptrs.get(e.pointerId);
    if (!prev) {
      if (e.pointerType === "touch") return;
      const n = nodeAt(e.clientX - r.left, e.clientY - r.top);
      if (n !== hover) { hover = n; canvas.style.cursor = n ? "pointer" : ""; draw(); }
      return;
    }
    if (ptrs.size === 2 && pinch) {
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [p, q] = [...ptrs.values()];
      const d = Math.hypot(p.x - q.x, p.y - q.y), mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
      if (mode !== "sphere") { T.x += mx - pinch.mx; T.y += my - pinch.my; }
      zoomAt(mx - r.left, my - r.top, T.k * (d / pinch.d)); pinch = { d, mx, my }; dragged = true; return;
    }
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    if (mode === "sphere") {
      if (Math.abs(dx) + Math.abs(dy) > 2) dragged = true;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (dragged) { cancelAnimationFrame(sph.anim); sph.anim = 0; sph.yaw -= dx * 0.006; sph.pitch = Math.max(-1.5, Math.min(1.5, sph.pitch - dy * 0.006)); sph.idle = performance.now(); draw(); }
      return;
    }
    if (e.pointerType === "touch") return;
    if (Math.abs(dx) + Math.abs(dy) > 2) dragged = true;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (dragged) setT(T.x + dx, T.y + dy, T.k);
  });
  const lift = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; canvas.classList.remove("drag"); };
  canvas.addEventListener("pointerup", lift); canvas.addEventListener("pointercancel", lift);
  canvas.addEventListener("pointerleave", () => { if (hover) { hover = null; draw(); } });
  canvas.addEventListener("click", (e) => {
    if (dragged) return;
    const r = canvas.getBoundingClientRect();
    const n = nodeAt(e.clientX - r.left, e.clientY - r.top);
    if (n) choose(n); else if (mode !== "focus" && (current || pathSet)) { pathSet = pathEdges = null; current = null; renderDesk(); draw(); }
  });
  $("z-in").onclick = () => zoomAt(W / 2, H / 2, T.k * 1.5);
  $("z-out").onclick = () => zoomAt(W / 2, H / 2, T.k / 1.5);
  $("z-fit").onclick = () => fit(true);
  for (const [id, m] of MODES) $(id).onclick = () => setMode(m);

  /* легенда семейств */
  $("legend").innerHTML = FAMS.map((f, i) => `<button class="chip" data-f="${i}" aria-pressed="true"><i class="dot" style="background:var(--f${i + 1})"></i>${esc(f.name)}</button>`).join("") +
    `<span class="note">■ квадрат — опровергнуто или подделка</span>`;
  $("legend").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-f]"); if (!b) return;
    const f = +b.dataset.f;
    if (activeFam.size === FAMS.length) { activeFam.clear(); activeFam.add(f); }
    else if (activeFam.has(f)) activeFam.delete(f); else activeFam.add(f);
    if (!activeFam.size) FAMS.forEach((_, i) => activeFam.add(i));
    $("legend").querySelectorAll("button[data-f]").forEach((x) => x.setAttribute("aria-pressed", activeFam.has(+x.dataset.f)));
    if (mode === "focus") setMode("net"); else if (mode === "sphere") draw(); else { fitAll(true); draw(); }
  });

  /* ---------- выбор дела: карта + досье ---------- */
  function choose(n, opts = {}) {
    if (!n) return;
    current = n; pathSet = pathEdges = null;
    if (!opts.fromHistory) { history = history.filter((x) => x !== n); history.push(n); if (history.length > 10) history.shift(); }
    renderCrumbs();
    renderDesk();
    if (mode === "focus") showFocus(n, true); else if (mode === "sphere") faceNode(n); else { draw(); centerOn(n); }
    try { window.history.replaceState(null, "", "#" + n.id); } catch (_) {}
    if (opts.scroll) $("explorer").scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }
  function renderCrumbs() {
    const box = $("crumbs");
    if (history.length < 2) { box.hidden = true; return; }
    box.hidden = false;
    const i = history.indexOf(current);
    box.innerHTML = (i > 0 ? `<button data-back="1">← Назад</button>` : "") +
      history.map((n, j) => `${j ? '<span class="sep">›</span>' : ""}<button data-i="${j}" ${n === current ? 'aria-current="true"' : ""}>${esc(n.t)}</button>`).join("");
  }
  $("crumbs").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.back) { const i = history.indexOf(current); if (i > 0) choose(history[i - 1], { fromHistory: true }); return; }
    choose(history[+b.dataset.i], { fromHistory: true });
  });

  function renderDesk() {
    const n = current, desk = $("desk");
    if (!n) {
      desk.innerHTML = `<div class="desk-empty"><div class="eyebrow">Досье</div><h2>Выберите дело на карте</h2><p>Или найдите его поиском вверху. Здесь появится описание, статус, источник и все связи.</p></div>`;
      return;
    }
    const groups = groupsOf(n).map((g) => `
      <section><h3><span>${g.title}</span><span class="num">${g.items.length}</span></h3><ul>${g.items.map((a) =>
        `<li><button data-id="${a.n.id}">${sig(dsig(a.n.d), `color:${famVar(a.n.d)}`)}<span>${esc(a.n.t)}</span><em>${esc(DOMS[a.n.d])}</em></button></li>`).join("")}</ul></section>`).join("");
    desk.innerHTML = `<article class="entry" style="--fam:${famVar(n.d)}">
      <div class="cipher"><span>Досье · <b>${cipher(n)}</b></span><span class="num">связей ${n.deg}</span></div>
      <div class="wax st-${n.s}" title="Статус: ${STATUS[n.s]}">${sig(MARK[n.s])}</div>
      <div class="head">
        <div class="meta"><button class="dom" data-dom="${n.d}">${sig(dsig(n.d))}Фонд ${fondNo(n.d)} · ${esc(DOMS[n.d])}</button>${statusChip(n.s)}</div>
        <h2>${esc(n.t)}</h2>
        ${n.en ? `<div class="en">${esc(n.en)}</div>` : ""}
      </div>
      <p class="sum">${esc(n.sum)}</p>
      <dl class="facts"><dt>Эпоха</dt><dd class="num">${esc(n.era || "—")}</dd>${n.ref ? `<dt>Источник</dt><dd>${esc(n.ref)}</dd>` : ""}</dl>
      ${n.tags?.length ? `<div class="tags">${n.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>` : ""}
      <div class="actions"><button class="btn" id="d-path">Как связано с…</button><button class="btn" id="d-copy">Скопировать ссылку</button></div>
      <div class="links">${groups || `<p class="eyebrow">Связей пока нет</p>`}</div>
    </article>`;
    desk.scrollTop = 0;
    $("d-path").onclick = () => { $("pa").value = n.t; $("pb").value = ""; $("paths").scrollIntoView({ behavior: reduced ? "auto" : "smooth" }); $("pb").focus({ preventScroll: true }); };
    $("d-copy").onclick = (e) => {
      const url = location.href.split("#")[0] + "#" + n.id;
      const b = e.currentTarget;
      const ok = () => { b.textContent = "Ссылка скопирована"; setTimeout(() => (b.textContent = "Скопировать ссылку"), 1800); };
      try { navigator.clipboard.writeText(url).then(ok, () => (b.textContent = url)); } catch (_) { b.textContent = url; }
    };
  }
  $("desk").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-id]"); if (b) { choose(byId.get(b.dataset.id)); return; }
    const d = e.target.closest("button[data-dom]"); if (d) { filterRegister({ d: d.dataset.dom }); }
  });

  /* ---------- поиск ---------- */
  function find(q, lim = 8) {
    q = norm(q).trim(); if (!q) return [];
    const res = [];
    for (const n of nodes) {
      let s = -1;
      if (n.tn === q) s = 100; else if (n.tn.startsWith(q)) s = 60; else if (n.tn.includes(q)) s = 40; else if (n.hay.includes(q)) s = 10;
      if (s > 0) res.push([s + n.deg / 10, n]);
    }
    return res.sort((a, b) => b[0] - a[0]).slice(0, lim).map((r) => r[1]);
  }
  const q = $("q"), results = $("results");
  let hits = [], cur = -1;
  function showResults() {
    hits = find(q.value); cur = -1;
    if (!q.value.trim()) { results.hidden = true; return; }
    results.hidden = false;
    results.innerHTML = hits.length ? hits.map((n, i) => `<button role="option" data-i="${i}">${sig(dsig(n.d), `color:${famVar(n.d)}`)}<span class="t">${esc(n.t)}</span><span class="d">${esc(DOMS[n.d])}</span></button>`).join("")
      : `<div class="empty">Ничего не нашлось. Попробуйте другое слово или откройте <a href="#register">опись</a>.</div>`;
  }
  function pick(n) { results.hidden = true; q.value = ""; q.blur(); choose(n, { scroll: true }); }
  q.addEventListener("input", showResults);
  q.addEventListener("focus", showResults);
  q.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!hits.length) return; e.preventDefault();
      cur = (cur + (e.key === "ArrowDown" ? 1 : -1) + hits.length) % hits.length;
      [...results.querySelectorAll("button")].forEach((b, i) => b.classList.toggle("on", i === cur));
    } else if (e.key === "Enter" && hits.length) { e.preventDefault(); pick(hits[Math.max(0, cur)]); }
    else if (e.key === "Escape") { results.hidden = true; q.blur(); }
  });
  results.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) pick(hits[+b.dataset.i]); });
  document.addEventListener("click", (e) => { if (!e.target.closest(".search")) results.hidden = true; });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !/input|select|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); q.focus(); }
  });

  /* ---------- с чего начать ---------- */
  const STARTS = ["atlantis", "bavarian-illuminati", "anunnaki", "baal", "shadanakar", "mkultra", "giza-pyramids", "goetia"].map((id) => byId.get(id)).filter(Boolean);
  $("starts").innerHTML = STARTS.map((n) => `<button class="chip" data-id="${n.id}">${sig(dsig(n.d), `color:${famVar(n.d)}`)}${esc(n.t)}</button>`).join("");
  $("starts").addEventListener("click", (e) => { const b = e.target.closest("button[data-id]"); if (b) choose(byId.get(b.dataset.id), { scroll: true }); });
  $("random").onclick = () => { const pool = nodes.filter((n) => n.deg >= 3); choose(pool[Math.floor(Math.random() * pool.length)], { scroll: true }); };

  /* ---------- словарь знаков ---------- */
  const SIGNS = [
    ["eye", "eye-of-providence", "Всевидящее око", "Глаз Бога в сиянии: христианский знак Троицы с XVII века, с 1782 года — на Большой печати США."],
    ["compass", "square-and-compass", "Циркуль и наугольник", "Мера поступков и граница желаний: эмблема масонских лож с XVIII века."],
    ["pentagram", "pentagram", "Пентаграмма", "Знак здоровья у пифагорейцев. После Элифаса Леви перевёрнутая звезда стала знаком зла."],
    ["hexagram", "hexagram", "Печать Соломона", "Два треугольника, которыми царь, по легенде, повелевал джиннами; позднее — Звезда Давида."],
    ["ouroboros", "ouroboros", "Уроборос", "Змей, кусающий свой хвост: вечное возвращение. Древнейший образ — на ковчеге Тутанхамона."],
    ["ankh", "ankh", "Анх", "Иероглиф «жизнь». Боги подносят его к лицу фараона как дыхание."],
    ["horus", "eye-of-horus", "Око Гора", "Уаджет, исцелённое око бога: самый частый амулет египетских погребений."],
    ["caduceus", "caduceus", "Кадуцей", "Жезл Гермеса-вестника. Как знак медицины его путают с посохом Асклепия."],
    ["rosecross", "rose-cross", "Роза и крест", "Эмблема розенкрейцерских манифестов 1614–1616 годов."],
    ["monad", "monad", "Монада Ди", "Луна, Солнце, стихии и Овен в одной фигуре, 1564 год."],
    ["tree", "tree-of-life", "Древо сфирот", "Десять сфирот каббалы и 22 пути — по числу букв еврейского алфавита."],
    ["flower", "flower-of-life", "Цветок жизни", "Узор пересекающихся кругов, который нью-эйдж объявил чертежом мироздания."],
    ["metatron", "metatrons-cube", "Куб Метатрона", "Тринадцать кругов и все линии между ними; в нём ищут проекции платоновых тел."],
    ["enneagram", "enneagram", "Эннеаграмма", "Девятиконечный знак Гурджиева, позднее — основа типологии личности."],
    ["ishtar", "star-of-ishtar", "Звезда Иштар", "Восемь лучей Венеры-Иштар на вавилонских межевых камнях."],
    ["vesica", "vesica-piscis", "Vesica piscis", "Линза двух кругов: первый чертёж «Начал» Евклида и мандорла вокруг Христа."],
    ["chirho", "chi-rho", "Хризма", "Χ и Ρ, монограмма Христа на щитах Константина в 312 году."],
    ["ichthys", "ichthys", "Ихтис", "«Рыба» по-гречески — акростих «Иисус Христос, Божий Сын, Спаситель»."],
    ["sator", "sator-square", "Квадрат SATOR", "Палиндром из Помпей, читаемый в четыре стороны; веками служил оберегом."],
    ["labrys", "labrys", "Лабрис", "Двойная секира минойского Крита; от неё, возможно, слово «лабиринт»."],
    ["triskelion", "triskelion", "Трискелион", "Тройная спираль Ньюгрейнджа, высеченная раньше пирамид Гизы."],
    ["tetragram", "tetragrammaton", "Тетраграмматон", "Четыре буквы непроизносимого имени Бога Израиля."],
  ].filter(([, id]) => byId.has(id));
  $("signs").innerHTML = SIGNS.map(([s, id, t, p]) => `<button class="sign" data-id="${id}">${sig(s)}<h3>${esc(t)}</h3><p>${esc(p)}</p><small>${cipher(byId.get(id))}</small></button>`).join("");
  $("signs").addEventListener("click", (e) => { const b = e.target.closest("button[data-id]"); if (b) choose(byId.get(b.dataset.id), { scroll: true }); });
  $("marks").innerHTML = `<p class="cap">Статусы дел помечены алхимическими знаками металлов: чем ближе знак к золоту, тем надёжнее свидетельства.</p>` +
    ["fact", "hypothesis", "disputed", "belief", "debunked", "hoax"].map((s) => `<div class="mk st-${s}">${sig(MARK[s], "color:currentColor")}<div><b>${STATUS[s]} · ${MARK_TXT[s][0]}</b><span>${MARK_TXT[s][1]}</span></div></div>`).join("");

  const SCOL = { fact: "var(--ok)", disputed: "var(--warn)", debunked: "var(--bad)", hoax: "var(--bad)", belief: "var(--belief)", hypothesis: "var(--hyp)" };
  const sOrder = ["fact", "hypothesis", "disputed", "belief", "debunked", "hoax"];
  /* ---------- фонды ---------- */
  $("domains").innerHTML = domOrder.map((d) => {
    const ns = byDeg.filter((n) => n.d === d);
    const by = (s) => ns.filter((n) => n.s === s).length;
    const bar = sOrder.map((s) => by(s) ? `<i style="width:${(by(s) / ns.length) * 100}%;background:${SCOL[s]}" title="${STATUS[s]}: ${by(s)}"></i>` : "").join("");
    const deb = by("debunked") + by("hoax");
    return `<article class="domain" data-roman="${fondNo(d)}" style="--fam:${famVar(d)}"><header>${sig(dsig(d))}<div><span class="count num">Фонд ${fondNo(d)} · ${ns.length} дел</span><h3>${esc(DOMS[d])}</h3></div></header>
      <div class="dbar" role="img" aria-label="Статусы дел фонда">${bar}</div>
      <div class="dcap">${Math.round((by("fact") / ns.length) * 100)}% доказано · ${Math.round((deb / ns.length) * 100)}% опровергнуто</div>
      <ul>${ns.slice(0, 5).map((n) => `<li><button data-id="${n.id}">${esc(n.t)}</button></li>`).join("")}</ul>
      <button class="all" data-dom="${d}">Все дела фонда →</button></article>`;
  }).join("");
  $("domains").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-id]"); if (b) { choose(byId.get(b.dataset.id), { scroll: true }); return; }
    const a = e.target.closest("button[data-dom]"); if (a) filterRegister({ d: a.dataset.dom });
  });

  /* ---------- как связаны ---------- */
  $("all-titles").innerHTML = nodes.map((n) => `<option value="${esc(n.t)}"></option>`).join("");
  const resolve = (s) => { const t = norm(s).trim(); return t ? nodes.find((n) => n.tn === t) || find(s, 1)[0] : null; };
  function shortest(a, b) {
    const prev = new Map([[a, null]]), queue = [a];
    while (queue.length) { const n = queue.shift(); if (n === b) break; for (const { n: m } of n.adj) if (!prev.has(m)) { prev.set(m, n); queue.push(m); } }
    if (!prev.has(b)) return null;
    const path = []; for (let n = b; n; n = prev.get(n)) path.unshift(n); return path;
  }
  const edgeBetween = (a, b) => edges.find((e) => (e.source === a && e.target === b) || (e.source === b && e.target === a));
  const KIND = { src: "источник", comp: "дополняет", over: "пересекается", anti: "опровергает" };
  function runPath(aTxt, bTxt) {
    const a = resolve(aTxt), b = resolve(bTxt), box = $("chain");
    if (!a || !b) { box.innerHTML = `<span class="hint">Не нашёл ${!a ? "первую" : "вторую"} идею. Начните вводить название и выберите его из подсказок.</span>`; return; }
    const p = shortest(a, b);
    if (!p) { box.innerHTML = `<span class="hint">Между «${esc(a.t)}» и «${esc(b.t)}» пока нет цепи. Связи добавляются с каждой партией.</span>`; return; }
    box.innerHTML = p.map((n, i) => `${i ? `<span class="via">${KIND[edgeBetween(p[i - 1], n)?.kind] || "связь"} →</span>` : ""}<button class="step" data-id="${n.id}">${sig(dsig(n.d), `color:${famVar(n.d)}`)}${esc(n.t)}</button>`).join("") +
      ` <button class="btn" id="path-map">Показать на карте</button>`;
    $("path-map").onclick = () => {
      if (mode === "focus") setMode("net");
      current = null; renderDesk();
      pathSet = new Set(p); pathEdges = new Set(); for (let i = 1; i < p.length; i++) pathEdges.add(edgeBetween(p[i - 1], p[i]));
      draw(); $("explorer").scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      if (mode !== "sphere") setTimeout(() => fitAll(true), 900);
    };
  }
  $("path-form").addEventListener("submit", (e) => { e.preventDefault(); runPath($("pa").value, $("pb").value); });
  $("chain").addEventListener("click", (e) => { const b = e.target.closest(".step"); if (b) choose(byId.get(b.dataset.id), { scroll: true }); });
  const EXAMPLES = [["Масонство", "Нибиру"], ["Баал (Хадду)", "Гоэтия (Малый ключ Соломона)"], ["Гёбекли-Тепе", "Рептилоиды"], ["Роза Мира — интеррелигия", "QAnon"]];
  $("examples").innerHTML = "Примеры: " + EXAMPLES.filter(([a, b]) => resolve(a) && resolve(b)).map(([a, b], i) => `<button class="chip" data-ex="${i}">${esc(resolve(a).t)} → ${esc(resolve(b).t)}</button>`).join("");
  $("examples").addEventListener("click", (e) => { const b = e.target.closest("button[data-ex]"); if (!b) return; const [a, c] = EXAMPLES[+b.dataset.ex]; $("pa").value = resolve(a).t; $("pb").value = resolve(c).t; runPath(a, c); });

  /* ---------- хроника: эпохи и статусы ---------- */
  const BINS = [
    [-Infinity, -10000, "до 10 тыс. до н.э."], [-10000, -3000, "10–3 тыс. до н.э."], [-3000, -1000, "3–1 тыс. до н.э."],
    [-1000, 0, "I тыс. до н.э."], [0, 500, "0–500"], [500, 1000, "500–1000"], [1000, 1500, "1000–1500"],
    [1500, 1800, "1500–1800"], [1800, 1900, "XIX век"], [1900, 1950, "1900–1950"], [1950, 2000, "1950–2000"], [2000, Infinity, "XXI век"],
  ];
  const binOf = (y) => BINS.findIndex(([a, b]) => y >= a && y < b);
  const bins = BINS.map(() => ({ all: 0, deb: 0 }));
  nodes.forEach((n) => { if (typeof n.yr === "number") { const b = bins[binOf(n.yr)]; b.all++; if (n.s === "debunked" || n.s === "hoax") b.deb++; } });
  (function timeline() {
    const w = 720, h = 240, L = 36, B = 54, Tp = 14;
    const max = Math.max(...bins.map((b) => b.all));
    const step = max > 200 ? 100 : max > 100 ? 50 : 20, top = Math.ceil(max / step) * step;
    const bw = (w - L) / bins.length, y = (v) => h - B - (v / top) * (h - B - Tp);
    let s = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Распределение дел по эпохам">`;
    for (let v = 0; v <= top; v += step) s += `<line x1="${L}" x2="${w}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line-2)"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--mute)" font-family="JetBrains Mono, monospace">${v}</text>`;
    bins.forEach((b, i) => {
      const x = L + i * bw + 4, bw2 = bw - 8, cx = x + bw2 / 2;
      s += `<g class="tbin" data-i="${i}" style="cursor:pointer"><rect x="${x - 4}" y="${Tp}" width="${bw}" height="${h - B - Tp}" fill="transparent"/>`;
      if (b.all) {
        const yt = y(b.all), yd = y(b.deb);
        s += `<rect x="${x}" y="${yt}" width="${bw2}" height="${y(0) - yt}" fill="var(--gold-2)"/><rect x="${x}" y="${yt}" width="${bw2}" height="1.5" fill="var(--gold)"/>`;
        if (b.deb) s += `<rect x="${x}" y="${yd + 2}" width="${bw2}" height="${Math.max(0, y(0) - yd - 2)}" fill="var(--seal)"/>`;
      }
      s += `<text transform="translate(${cx},${h - B + 14}) rotate(32)" font-size="10.5" fill="var(--mute)" font-family="JetBrains Mono, monospace">${BINS[i][2]}</text></g>`;
    });
    $("timeline").innerHTML = s + `</svg><div class="tip" hidden></div>`;
    const tip = $("timeline").querySelector(".tip");
    $("timeline").addEventListener("mousemove", (e) => {
      const g = e.target.closest(".tbin"); if (!g) { tip.hidden = true; return; }
      const b = bins[+g.dataset.i], r = $("timeline").getBoundingClientRect();
      tip.hidden = false; tip.style.left = e.clientX - r.left + "px"; tip.style.top = e.clientY - r.top + "px";
      tip.textContent = `${BINS[+g.dataset.i][2]}: ${b.all} дел, опровергнуто ${b.deb}`;
    });
    $("timeline").addEventListener("mouseleave", () => (tip.hidden = true));
    $("timeline").addEventListener("click", (e) => { const g = e.target.closest(".tbin"); if (g) filterRegister({ e: g.dataset.i }); });
  })();
  const sCount = Object.fromEntries(sOrder.map((s) => [s, nodes.filter((n) => n.s === s).length]));
  $("statbar").innerHTML = sOrder.map((s) => `<i style="width:${(sCount[s] / nodes.length) * 100}%;background:${SCOL[s]};${s === "hoax" ? "opacity:.55" : ""}"></i>`).join("");
  $("statlist").innerHTML = sOrder.map((s) => `<li><button data-s="${s}">${statusChip(s)}<span>${Math.round((sCount[s] / nodes.length) * 100)}% дел</span><b class="num">${sCount[s]}</b></button></li>`).join("");
  $("statlist").addEventListener("click", (e) => { const b = e.target.closest("button[data-s]"); if (b) filterRegister({ s: b.dataset.s }); });

  /* ---------- опись ---------- */
  const rq = $("rq"), rd = $("rd"), rs = $("rs"), re = $("re"), ro = $("ro");
  rd.innerHTML += domOrder.map((d) => `<option value="${d}">${fondNo(d)}. ${esc(DOMS[d])}</option>`).join("");
  rs.innerHTML += sOrder.map((s) => `<option value="${s}">${STATUS[s]}</option>`).join("");
  re.innerHTML += BINS.map((b, i) => `<option value="${i}">${b[2]}</option>`).join("");
  let list = [], shown = 0;
  const PAGE = 40;
  function renderRegister() {
    const t = norm(rq.value).trim();
    list = nodes.filter((n) => (!rd.value || n.d === rd.value) && (!rs.value || n.s === rs.value) &&
      (re.value === "" || (typeof n.yr === "number" && binOf(n.yr) === +re.value)) && (!t || n.hay.includes(t) || norm(n.sum).includes(t)));
    const o = ro.value;
    list.sort(o === "alpha" ? (a, b) => a.t.localeCompare(b.t, "ru") : o === "era" ? (a, b) => (a.yr ?? 9e9) - (b.yr ?? 9e9) : (a, b) => b.deg - a.deg);
    shown = 0;
    $("rcount").textContent = `${fmt(list.length)} из ${fmt(nodes.length)} дел`;
    $("rlist").innerHTML = list.length ? `<div class="row row-head" role="presentation"><span>Шифр</span><span></span><span>Дело</span><span>Фонд</span><span>Эпоха</span><span>Статус</span></div>` : `<div class="empty-state">Ничего не нашлось. Сбросьте один из фильтров.</div>`;
    more();
  }
  function more() {
    const chunk = list.slice(shown, shown + PAGE); shown += chunk.length;
    $("rlist").insertAdjacentHTML("beforeend", chunk.map((n) => `<button class="row" role="listitem" data-id="${n.id}">
      <span class="no num">${cipher(n)}</span>
      ${sig(dsig(n.d), `color:${famVar(n.d)}`)}
      <span class="t">${esc(n.t)}<small>${esc(n.sum)}</small></span>
      <span class="c hide-sm">${esc(DOMS[n.d])}</span>
      <span class="c hide-sm num">${esc(n.era || "—")}</span>
      <span>${statusChip(n.s)}</span></button>`).join(""));
    $("rmore").hidden = shown >= list.length;
    $("rmore").textContent = `Показать ещё ${Math.min(PAGE, list.length - shown)}`;
  }
  function filterRegister(f) {
    rq.value = ""; rd.value = f.d || ""; rs.value = f.s || ""; re.value = f.e ?? "";
    renderRegister(); $("register").scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  }
  [rq, rd, rs, re, ro].forEach((el) => el.addEventListener("input", renderRegister));
  $("rmore").onclick = more;
  $("rlist").addEventListener("click", (e) => { const b = e.target.closest("button[data-id]"); if (b) choose(byId.get(b.dataset.id), { scroll: true }); });
  renderRegister();

  /* ---------- Печать: армиллярная сфера, пирамида и Око в трёх измерениях ---------- */
  const SEAL = (() => {
    const cv = $("seal"); if (!cv) return null;
    const g = cv.getContext("2d"), cap = $("seal-cap"), capDefault = cap.innerHTML;
    let w = 0, h = 0, d = 1, yaw = 0.6, pitch = 0.32, vy = 0, drag = null, moved = false, hoverI = -1, visible = true, raf2 = 0;
    const R = Math.PI / 180, segs = [];
    const rotX = ([x, y, z], a) => [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
    const ring = (r, tilt, kind, n = 120) => {
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * 2 * Math.PI, a1 = ((i + 1) / n) * 2 * Math.PI;
        segs.push([rotX([r * Math.cos(a0), 0, r * Math.sin(a0)], tilt), rotX([r * Math.cos(a1), 0, r * Math.sin(a1)], tilt), kind]);
      }
    };
    ring(1, 0, "ring"); ring(1.04, 0, "faint");
    ring(1, 23.44 * R, "ring");
    ring(1, 90 * R, "ring"); ring(0.96, 90 * R, "faint");
    for (let i = 0; i < 72; i++) { // деления эклиптики: каждые 5°, знаки зодиака — каждые 30°
      const a = (i / 72) * 2 * Math.PI, l = i % 6 ? 0.045 : 0.11;
      segs.push([rotX([Math.cos(a), 0, Math.sin(a)], 23.44 * R), rotX([(1 - l) * Math.cos(a), 0, (1 - l) * Math.sin(a)], 23.44 * R), "tick"]);
    }
    segs.push([[0, -1.18, 0], [0, 1.18, 0], "faint"]); // ось мира
    // пирамида: 13 рядов кладки, вершина парит отдельно — как на Большой печати
    const B = -0.6, A = 0.62, HS = 0.56, CUT = 0.16, GAP = 0.09;
    const half = (y) => HS * (A - y) / (A - B);
    const sq = (y, kind) => { const s = half(y), c = [[-s, y, -s], [s, y, -s], [s, y, s], [-s, y, s]]; for (let i = 0; i < 4; i++) segs.push([c[i], c[(i + 1) % 4], kind]); return c; };
    const base = sq(B, "pyr"), top = sq(CUT, "pyr");
    for (let i = 0; i < 4; i++) segs.push([base[i], top[i], "pyr"]);
    for (let i = 1; i < 13; i++) sq(B + ((CUT - B) * i) / 13, "course");
    const capB = CUT + GAP, capA = A + GAP, cs = half(CUT) * 0.98;
    const capC = [[-cs, capB, -cs], [cs, capB, -cs], [cs, capB, cs], [-cs, capB, cs]], apex = [0, capA, 0];
    for (let i = 0; i < 4; i++) { segs.push([capC[i], capC[(i + 1) % 4], "cap"]); segs.push([capC[i], apex, "cap"]); }
    const eyeP = [0, capB + (capA - capB) * 0.36, 0];
    // знаки фондов на поясе вокруг сферы
    const orbit = domOrder.map((dm, i) => ({ d: dm, a: (i / domOrder.length) * 2 * Math.PI }));
    // звёзды
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const stars = Array.from({ length: 240 }, () => { const u = rnd() * 2 - 1, t = rnd() * 2 * Math.PI, r = 2.2 + rnd() * 0.8, s = Math.sqrt(1 - u * u); return [r * s * Math.cos(t), r * u, r * s * Math.sin(t), rnd()]; });
    const D = 4.4;
    function proj([x, y, z]) {
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const x1 = x * cy - z * sy, z1 = x * sy + z * cy;
      const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      const S = Math.min(w, h) * 0.31, s = (S * D) / (D + z2);
      return [w / 2 + x1 * s, h * 0.45 - y2 * s, z2, s / S];
    }
    function size() {
      const r = cv.getBoundingClientRect(); d = Math.min(2, devicePixelRatio || 1); w = r.width; h = r.height;
      cv.width = Math.round(w * d); cv.height = Math.round(h * d); paint();
    }
    let orbitPts = [];
    function paint() {
      if (!w) return;
      g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, w, h);
      const S = Math.min(w, h) * 0.31, ep = proj(eyeP);
      const glow = g.createRadialGradient(ep[0], ep[1], 0, w / 2, h * 0.45, S * 1.6);
      glow.addColorStop(0, C.gold + "40"); glow.addColorStop(0.35, C.gold + "12"); glow.addColorStop(1, C.gold + "00");
      g.fillStyle = glow; g.fillRect(0, 0, w, h);
      g.fillStyle = C.gold;
      for (const s of stars) { const q = proj(s); g.globalAlpha = 0.15 + 0.5 * s[3] * (q[2] < 0 ? 1 : 0.5); g.fillRect(q[0], q[1], 1.2, 1.2); }
      // сияние Ока
      g.strokeStyle = C.gold; g.lineWidth = 1;
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * 2 * Math.PI, r0 = S * 0.16, r1 = S * (i % 2 ? 0.42 : 0.62);
        g.globalAlpha = i % 2 ? 0.12 : 0.2;
        g.beginPath(); g.moveTo(ep[0] + Math.cos(a) * r0, ep[1] + Math.sin(a) * r0); g.lineTo(ep[0] + Math.cos(a) * r1, ep[1] + Math.sin(a) * r1); g.stroke();
      }
      // грани вершины светятся
      const cp = capC.map(proj), ap = proj(apex);
      g.fillStyle = C.gold;
      for (let i = 0; i < 4; i++) { g.globalAlpha = 0.07; g.beginPath(); g.moveTo(cp[i][0], cp[i][1]); g.lineTo(cp[(i + 1) % 4][0], cp[(i + 1) % 4][1]); g.lineTo(ap[0], ap[1]); g.closePath(); g.fill(); }
      const STY = { ring: [C.gold, 1.2, 1], faint: [C.gold, 0.7, 0.45], tick: [C.gold, 1, 0.9], pyr: [C.ink, 1.2, 0.9], course: [C.ink2, 0.6, 0.45], cap: [C.gold, 1.4, 1] };
      for (const [p, q, kind] of segs) {
        const a = proj(p), b = proj(q), z = (a[2] + b[2]) / 2, [col, lw, al] = STY[kind];
        g.globalAlpha = al * (0.28 + 0.72 * Math.min(1, Math.max(0, (1.2 - z) / 2.4)));
        g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      }
      // Око
      const ew = S * 0.15;
      g.globalAlpha = 1; g.lineWidth = 1.6; g.strokeStyle = C.gold; g.fillStyle = C.bg;
      g.beginPath(); g.moveTo(ep[0] - ew, ep[1]); g.quadraticCurveTo(ep[0], ep[1] - ew * 0.9, ep[0] + ew, ep[1]); g.quadraticCurveTo(ep[0], ep[1] + ew * 0.9, ep[0] - ew, ep[1]); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = C.gold; g.beginPath(); g.arc(ep[0], ep[1], ew * 0.36, 0, Math.PI * 2); g.fill();
      g.fillStyle = C.bg; g.beginPath(); g.arc(ep[0], ep[1], ew * 0.15, 0, Math.PI * 2); g.fill();
      // знаки фондов
      orbitPts = orbit.map((o, i) => { const q = proj([1.24 * Math.cos(o.a), -0.74, 1.24 * Math.sin(o.a)]); return { i, d: o.d, x: q[0], y: q[1], z: q[2], s: q[3] }; }).sort((a, b) => b.z - a.z);
      for (const o of orbitPts) {
        const front = (1.4 - o.z) / 2.8, sz = Math.min(24, w / 17) * o.s * (o.i === hoverI ? 1.3 : 1);
        g.globalAlpha = (o.i === hoverI ? 1 : 0.35 + 0.65 * front);
        g.fillStyle = C.bg; g.beginPath(); g.arc(o.x, o.y, sz * 0.78, 0, Math.PI * 2); g.fill();
        g.strokeStyle = C.gold; g.lineWidth = 0.8; g.stroke();
        drawSig(g, dsig(o.d), o.x, o.y, sz, o.i === hoverI ? C.ink : C.gold, 1.3);
      }
      g.globalAlpha = 1;
    }
    function loop(now) {
      raf2 = 0;
      const dt = Math.min(64, now - (loop.t || now)); loop.t = now;
      if (!drag) { yaw += vy; vy *= 0.94; if (!reduced && hoverI < 0) yaw += dt * 0.00011; }
      paint();
      if (visible && !document.hidden && (!reduced || Math.abs(vy) > 1e-4 || drag)) raf2 = requestAnimationFrame(loop);
    }
    const kick = () => { if (!raf2) { loop.t = 0; raf2 = requestAnimationFrame(loop); } };
    const hit = (x, y) => { for (const o of [...orbitPts].reverse()) if (Math.hypot(o.x - x, o.y - y) < 20 * o.s + (coarse ? 10 : 4)) return o; return null; };
    cv.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY }; moved = false; if (e.pointerType !== "touch") cv.setPointerCapture(e.pointerId); });
    cv.addEventListener("pointermove", (e) => {
      const r = cv.getBoundingClientRect();
      if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
        yaw -= dx * 0.008; vy = -dx * 0.008; pitch = Math.max(-0.9, Math.min(0.9, pitch + dy * 0.006)); drag = { x: e.clientX, y: e.clientY }; kick(); return;
      }
      const o = hit(e.clientX - r.left, e.clientY - r.top), i = o ? o.i : -1;
      if (i !== hoverI) {
        hoverI = i; cv.style.cursor = o ? "pointer" : "";
        cap.innerHTML = o ? `Фонд ${fondNo(o.d)} · <b>${esc(DOMS[o.d])}</b> · ${perDom[o.d]} дел` : capDefault; kick(); paint();
      }
    });
    const end = () => { drag = null; kick(); };
    cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
    cv.addEventListener("pointerleave", () => { if (hoverI >= 0) { hoverI = -1; cap.innerHTML = capDefault; paint(); } });
    cv.addEventListener("click", (e) => {
      if (moved) return;
      const r = cv.getBoundingClientRect(), o = hit(e.clientX - r.left, e.clientY - r.top);
      if (o) choose(byDeg.find((n) => n.d === o.d), { scroll: true });
    });
    new ResizeObserver(size).observe(cv);
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(cv);
    document.addEventListener("visibilitychange", kick);
    kick();
    return { paint };
  })();

  /* ---------- Око на линейке ---------- */
  const LEGS = [
    ["L", 30, 52, "M30 52 L12 40 L2 48"], ["L", 26, 62, "M26 62 L6 60 L-6 70"], ["L", 22, 74, "M22 74 L4 82 L-2 96"], ["L", 30, 86, "M30 86 L18 100 L20 114"],
    ["R", 70, 52, "M70 52 L88 40 L98 48"], ["R", 74, 62, "M74 62 L94 60 L106 70"], ["R", 78, 74, "M78 74 L96 82 L102 96"], ["R", 70, 86, "M70 86 L82 100 L80 114"],
  ];
  const eye = $("eye");
  eye.innerHTML = `<svg viewBox="-12 -6 124 128"><g class="body">
    <g stroke="var(--gold)" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round">
      ${LEGS.map(([s, x, y, d], i) => `<path class="leg${s}${i % 2 ? " alt" : ""}" style="transform-box:view-box;transform-origin:${x}px ${y}px" d="${d}"/>`).join("")}
    </g>
    <rect x="38" y="-2" width="24" height="22" fill="var(--surface-2)" stroke="var(--gold)" stroke-width="1.5"/><rect x="32" y="18" width="36" height="5" fill="var(--surface-2)" stroke="var(--gold)" stroke-width="1.5"/><rect x="38" y="13" width="24" height="3" fill="var(--gold)"/>
    <path d="M50 26 L90 92 L10 92 Z" fill="var(--seal)" stroke="var(--gold)" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M50 36 L80 86 L20 86 Z" fill="none" stroke="var(--gold)" stroke-width="1" opacity=".7"/>
    <path d="M31 67 Q50 50 69 67 Q50 82 31 67 Z" fill="#f4efe0" stroke="var(--gold)" stroke-width="2"/>
    <g class="pupil"><circle cx="50" cy="67" r="7" fill="#1b1a17"/><circle cx="47.5" cy="64.5" r="2" fill="#f4efe0"/></g>
    <path d="M24 80 H76 M33 74 V80 M67 74 V80 M50 80 V86" stroke="var(--gold)" stroke-width="1" opacity=".5"/>
  </g></svg>`;
  const pupil = eye.querySelector(".pupil"), pct = $("pct");
  const header = document.querySelector(".top");
  let TOP = 110, ey = TOP, walkT = 0;
  function crawl() {
    TOP = header.getBoundingClientRect().bottom + 10; // око начинает путь сразу под шапкой
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    const y = TOP + p * (innerHeight - eye.offsetHeight - TOP - 28);
    const dy = y - ey;
    if (Math.abs(dy) > 0.4) {
      ey = reduced ? y : ey + dy * 0.11;
      eye.classList.toggle("down", dy > 0); eye.classList.add("walk");
      clearTimeout(walkT); walkT = setTimeout(() => eye.classList.remove("walk"), 160);
    } else ey = y;
    eye.style.transform = `translateY(${ey}px)`;
    pct.style.top = `${ey + eye.offsetHeight + 8}px`;
    pct.textContent = String(Math.round(p * 100)).padStart(3, "0");
    requestAnimationFrame(crawl);
  }
  requestAnimationFrame(crawl);
  addEventListener("pointermove", (e) => {
    const r = eye.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height * 0.55);
    if (eye.classList.contains("down")) { dx = -dx; dy = -dy; }
    const d = Math.hypot(dx, dy) || 1, m = Math.min(5, d / 40);
    pupil.setAttribute("transform", `translate(${(dx / d) * m * 1.3} ${(dy / d) * m * 0.6})`);
  }, { passive: true });
  eye.onclick = () => { if (scrollY < 200) $("register").scrollIntoView(); else scrollTo({ top: 0 }); };

  /* ---------- старт ---------- */
  let saved = null;
  try { saved = localStorage.getItem("archivum-mode"); } catch (_) {}
  const start = byId.get(decodeURIComponent(location.hash.slice(1))) || byId.get("eye-of-providence") || byDeg[0];
  new ResizeObserver(() => { const first = !W; resize(); if (first) fit(false); }).observe(canvas);
  current = start; history = [start];
  renderDesk(); renderCrumbs();
  if (saved === "net" || saved === "ring" || saved === "sphere") setMode(saved);
  else { mode = "focus"; const t = layoutFocus(start); t.forEach((v, n) => { n.x = v[0]; n.y = v[1]; }); }
})();
