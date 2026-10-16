/* ARCHIVUM — атлас связей. Данные: data.js (window.KB), сборка: kb/build.py */
(() => {
  "use strict";
  const KB = window.KB;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = (x) => x.toLocaleString("ru-RU");

  const STATUS = { fact: "доказано", disputed: "спорно", debunked: "опровергнуто", hoax: "подделка", belief: "вера", hypothesis: "гипотеза" };
  const DOMS = KB.domains;
  const domKeys = Object.keys(DOMS);
  // Семейства разделов — 7 категориальных цветов (палитра проверена на различимость при дальтонизме)
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
  const statusChip = (s) => `<span class="status st-${s}">${STATUS[s] || s}</span>`;

  $("m-nodes").textContent = fmt(nodes.length);
  $("m-edges").textContent = fmt(edges.length);
  $("m-date").textContent = "обновлён " + (KB.built ? new Date(KB.built).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : "");

  /* ---------- тема ---------- */
  const root = document.documentElement;
  try { const t = localStorage.getItem("archivum-theme"); if (t) root.dataset.theme = t; } catch (_) {}
  $("theme").onclick = () => {
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("archivum-theme", root.dataset.theme); } catch (_) {}
  };
  let C = {};
  function readColors() {
    const cs = getComputedStyle(root);
    const g = (v) => cs.getPropertyValue(v).trim();
    C = { ink: g("--ink"), ink2: g("--ink-2"), mute: g("--mute"), surface: g("--surface"), line: g("--line"), accent: g("--accent"), fam: FAMS.map((_, i) => g("--f" + (i + 1))) };
  }
  readColors();
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { readColors(); draw(); });
  new MutationObserver(() => { readColors(); draw(); }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

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
  const easeCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* ---------- холст ---------- */
  const canvas = $("graph"), ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  const T = { x: 0, y: 0, k: 1, invert: ([px, py]) => [(px - T.x) / T.k, (py - T.y) / T.k] };
  let mode = "focus", hover = null, current = null, pathSet = null, pathEdges = null;
  const activeFam = new Set(FAMS.map((_, i) => i));
  const visibleFam = (n) => activeFam.has(famOf[n.d]);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;
  const KMIN = 0.05, KMAX = 8, clampK = (k) => Math.min(KMAX, Math.max(KMIN, k));
  let tween = 0, raf = 0;
  function draw() { if (!raf) raf = requestAnimationFrame(render); }
  function setT(x, y, k) { cancelAnimationFrame(tween); T.x = x; T.y = y; T.k = k; draw(); }
  function zoomAt(px, py, k) { k = clampK(k); setT(px - ((px - T.x) / T.k) * k, py - ((py - T.y) / T.k) * k, k); }
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

  /* «Фокус»: одна идея в центре, её связи — по секторам */
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
      fMeta.push({ title: g.title, count: g.items.length, mid: (a0 + a) / 2, span: a - a0 });
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
  function fit(animate) { if (mode === "focus") fitFocus(animate); else fitAll(animate); }

  function setMode(m) {
    if (m === mode && m !== "focus") return;
    const prev = mode; mode = m;
    for (const [id, v] of [["v-focus", "focus"], ["v-net", "net"], ["v-ring", "ring"]]) $(id).setAttribute("aria-pressed", mode === v);
    try { localStorage.setItem("archivum-mode", mode); } catch (_) {}
    renderCrumbs();
    if (m === "focus") { showFocus(current || byDeg[0], prev === "focus"); return; }
    fSet = null;
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
  const kStyle = (k) => ({ src: [C.ink, []], comp: [C.mute, []], over: [C.mute, [1.5 / k, 3 / k]], anti: [C.accent, [5 / k, 3 / k]] });
  function nodeShape(n, r) {
    ctx.beginPath();
    if (n.s === "debunked" || n.s === "hoax") ctx.rect(n.x - r, n.y - r, r * 2, r * 2); else ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
  }
  function label(text, x, y, k, size, weight, color, align = "left") {
    ctx.font = `${weight} ${size / k}px "Golos Text", system-ui, sans-serif`;
    ctx.textAlign = align; ctx.lineJoin = "round";
    ctx.strokeStyle = C.surface; ctx.lineWidth = 4 / k; ctx.strokeText(text, x, y);
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  }
  function render() {
    raf = 0; if (!W) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.translate(T.x, T.y); ctx.scale(T.k, T.k);
    ctx.textBaseline = "middle";
    if (mode === "focus" && fSet) renderFocus(); else renderAll();
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function renderFocus() {
    const k = T.k, st = kStyle(k), c = current;
    ctx.lineWidth = 0.8 / k; ctx.globalAlpha = 0.16; ctx.strokeStyle = C.mute; ctx.setLineDash([]);
    ctx.beginPath();
    for (const e of edges) {
      if (e.source === c || e.target === c) continue;
      if (fSet.has(e.source) && fSet.has(e.target)) { ctx.moveTo(e.source.x, e.source.y); ctx.lineTo(e.target.x, e.target.y); }
    }
    ctx.stroke();
    for (const a of c.adj) {
      const [col, dash] = st[a.kind];
      ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(a.n.x, a.n.y);
      ctx.strokeStyle = col; ctx.setLineDash(dash); ctx.lineWidth = (a.n === hover ? 2.4 : 1.2) / k;
      ctx.globalAlpha = hover && a.n !== hover ? 0.3 : 0.8; ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    for (const n of fSet) {
      const r = n === c ? Math.max(10, rad(n) * 1.5) : rad(n) * 1.15;
      ctx.globalAlpha = hover && n !== hover && n !== c ? 0.55 : 1;
      ctx.fillStyle = C.fam[famOf[n.d]]; nodeShape(n, r); ctx.fill();
      ctx.strokeStyle = C.surface; ctx.lineWidth = 2 / k; ctx.stroke();
      if (n === c || n === hover) { ctx.globalAlpha = 1; ctx.strokeStyle = n === c ? C.accent : C.ink; ctx.lineWidth = 2 / k; ctx.beginPath(); ctx.arc(n.x, n.y, r + 5 / k, 0, Math.PI * 2); ctx.stroke(); }
    }
    const max = W < 640 ? 16 : 32;
    for (const n of fSet) {
      if (n === c) continue;
      const flip = Math.cos(n.fa) < 0;
      ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(flip ? n.fa + Math.PI : n.fa);
      const off = (rad(n) * 1.15 + 7 / k) * (flip ? -1 : 1);
      const t = n.t.length > max ? n.t.slice(0, max - 1) + "…" : n.t;
      ctx.globalAlpha = hover && n !== hover ? 0.5 : 1;
      label(t, off, 0, k, 12.5, n === hover ? 600 : 400, n === hover ? C.accent : C.ink, flip ? "right" : "left");
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.font = `400 ${Math.max(20, 26 * k) / k}px Forum, Georgia, serif`;
    ctx.textAlign = "center"; ctx.lineJoin = "round";
    const cy = c.y - Math.max(10, rad(c) * 1.5) - 18 / k;
    ctx.strokeStyle = C.surface; ctx.lineWidth = 6 / k; ctx.strokeText(c.t, 0, cy);
    ctx.fillStyle = C.ink; ctx.fillText(c.t, 0, cy);
    if (!c.adj.length) { ctx.font = `400 ${13 / k}px "Golos Text", sans-serif`; ctx.fillStyle = C.mute; ctx.fillText("Связей пока нет", 0, 34 / k); }
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
        ctx.strokeStyle = pathSet || e.kind === "anti" ? C.accent : C.ink; ctx.setLineDash(st[e.kind][1]);
        ctx.globalAlpha = 0.9; ctx.stroke();
      }
    }
    ctx.setLineDash([]);
    for (const n of nodes) {
      if (!visibleFam(n)) continue;
      const on = lit(n), r = rad(n);
      ctx.globalAlpha = on ? 1 : 0.12;
      ctx.fillStyle = C.fam[famOf[n.d]]; nodeShape(n, r); ctx.fill();
      if (n === current || n === hover) { ctx.globalAlpha = 1; ctx.strokeStyle = n === current ? C.accent : C.ink; ctx.lineWidth = 2 / k; ctx.beginPath(); ctx.arc(n.x, n.y, r + 4 / k, 0, Math.PI * 2); ctx.stroke(); }
    }
    if (ring) {
      const fs = Math.max(7.5, Math.min(11, 7 * k * 1.6));
      for (const n of nodes) {
        if (!visibleFam(n)) continue;
        const on = lit(n);
        ctx.globalAlpha = on ? (focus ? 1 : 0.7) : 0.1;
        ctx.save(); ctx.translate(n.x, n.y);
        const flip = Math.cos(n.ra) < 0; ctx.rotate(flip ? n.ra + Math.PI : n.ra);
        ctx.font = `400 ${fs / k}px "Golos Text", sans-serif`; ctx.textAlign = flip ? "right" : "left";
        ctx.fillStyle = n === current ? C.accent : C.ink;
        ctx.fillText(n.t, (rad(n) + 4 / k) * (flip ? -1 : 1), 0);
        ctx.restore();
      }
    } else {
      for (const n of nodes) {
        const on = lit(n);
        const show = n === hover || n === current || (focus && on) || (!focus && visibleFam(n) && n.deg * k >= 10);
        if (!show) continue;
        ctx.globalAlpha = on ? 1 : 0.35;
        label(n.t, n.x + rad(n) + 4 / k, n.y, k, 12, n === current ? 600 : 400, n === current ? C.accent : C.ink);
      }
      ctx.globalAlpha = focus ? 0.2 : 0.5;
      for (const c of domCentre) {
        if (!activeFam.has(famOf[c.d])) continue;
        ctx.font = `400 ${Math.max(13, 17 * k) / k}px Forum, Georgia, serif`; ctx.textAlign = "center"; ctx.fillStyle = C.ink;
        ctx.fillText(DOMS[c.d], c.x, c.y);
      }
    }
  }

  /* указатель, масштаб, клики */
  function nodeAt(px, py) {
    const [wx, wy] = T.invert([px, py]);
    let best = null, bd = Infinity;
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
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); dragged = false;
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
      T.x += mx - pinch.mx; T.y += my - pinch.my;
      zoomAt(mx - r.left, my - r.top, T.k * (d / pinch.d)); pinch = { d, mx, my }; dragged = true; return;
    }
    if (e.pointerType === "touch") return;
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
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
  $("v-focus").onclick = () => setMode("focus");
  $("v-net").onclick = () => setMode("net");
  $("v-ring").onclick = () => setMode("ring");

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
    if (mode === "focus") setMode("net"); else { fitAll(true); draw(); }
  });

  /* ---------- выбор записи: карта + досье ---------- */
  function choose(n, opts = {}) {
    if (!n) return;
    current = n; pathSet = pathEdges = null;
    if (!opts.fromHistory) { history = history.filter((x) => x !== n); history.push(n); if (history.length > 10) history.shift(); }
    renderCrumbs();
    renderDesk();
    if (mode === "focus") showFocus(n, true); else { draw(); centerOn(n); }
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
      desk.innerHTML = `<div class="desk-empty"><div class="eyebrow">Досье</div><h2>Выберите точку на карте</h2><p>Или найдите запись поиском вверху. Здесь появится описание, статус, источник и все связи.</p></div>`;
      return;
    }
    const groups = groupsOf(n).map((g) => `
      <section><h3><span>${g.title}</span><span class="num">${g.items.length}</span></h3><ul>${g.items.map((a) =>
        `<li><button data-id="${a.n.id}"><i class="dot" style="background:${famVar(a.n.d)}"></i><span>${esc(a.n.t)}</span><em>${esc(DOMS[a.n.d])}</em></button></li>`).join("")}</ul></section>`).join("");
    desk.innerHTML = `<article class="entry">
      <div class="meta"><button class="dom" data-dom="${n.d}"><i class="dot" style="background:${famVar(n.d)}"></i>${esc(DOMS[n.d])}</button>${statusChip(n.s)}</div>
      <h2>${esc(n.t)}</h2>
      ${n.en ? `<div class="en">${esc(n.en)}</div>` : ""}
      <p class="sum">${esc(n.sum)}</p>
      <dl class="facts"><dt>Эпоха</dt><dd class="num">${esc(n.era || "—")}</dd>${n.ref ? `<dt>Источник</dt><dd>${esc(n.ref)}</dd>` : ""}<dt>Связей</dt><dd class="num">${n.deg}</dd></dl>
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
    results.innerHTML = hits.length ? hits.map((n, i) => `<button role="option" data-i="${i}"><i class="dot" style="background:${famVar(n.d)}"></i><span class="t">${esc(n.t)}</span><span class="d">${esc(DOMS[n.d])}</span></button>`).join("")
      : `<div class="empty">Ничего не нашлось. Попробуйте другое слово или посмотрите <a href="#register">реестр</a>.</div>`;
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
  $("starts").innerHTML = STARTS.map((n) => `<button class="chip" data-id="${n.id}"><i class="dot" style="background:${famVar(n.d)}"></i>${esc(n.t)}</button>`).join("");
  $("starts").addEventListener("click", (e) => { const b = e.target.closest("button[data-id]"); if (b) choose(byId.get(b.dataset.id), { scroll: true }); });
  $("random").onclick = () => { const pool = nodes.filter((n) => n.deg >= 3); choose(pool[Math.floor(Math.random() * pool.length)], { scroll: true }); };

  /* ---------- разделы ---------- */
  const domOrder = [...domKeys].sort((a, b) => famOf[a] - famOf[b]);
  $("domains").innerHTML = domOrder.map((d) => {
    const ns = byDeg.filter((n) => n.d === d);
    return `<article class="domain"><header><h3><i class="dot" style="background:${famVar(d)}"></i>${esc(DOMS[d])}</h3><span class="count num">${ns.length}</span></header>
      <ul>${ns.slice(0, 5).map((n) => `<li><button data-id="${n.id}">${esc(n.t)}</button></li>`).join("")}</ul>
      <button class="all" data-dom="${d}">Все записи раздела</button></article>`;
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
    if (!p) { box.innerHTML = `<span class="hint">Между «${esc(a.t)}» и «${esc(b.t)}» пока нет цепочки. Связи добавляются с каждой партией.</span>`; return; }
    box.innerHTML = p.map((n, i) => `${i ? `<span class="via">${KIND[edgeBetween(p[i - 1], n)?.kind] || "связь"} →</span>` : ""}<button class="step" data-id="${n.id}"><i class="dot" style="background:${famVar(n.d)}"></i>${esc(n.t)}</button>`).join("") +
      ` <button class="btn" id="path-map">Показать на карте</button>`;
    $("path-map").onclick = () => {
      if (mode === "focus") setMode("net");
      current = null; renderDesk();
      pathSet = new Set(p); pathEdges = new Set(); for (let i = 1; i < p.length; i++) pathEdges.add(edgeBetween(p[i - 1], p[i]));
      draw(); $("explorer").scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      setTimeout(() => fitAll(true), 900);
    };
  }
  $("path-form").addEventListener("submit", (e) => { e.preventDefault(); runPath($("pa").value, $("pb").value); });
  $("chain").addEventListener("click", (e) => { const b = e.target.closest(".step"); if (b) choose(byId.get(b.dataset.id), { scroll: true }); });
  const EXAMPLES = [["Масонство", "Нибиру"], ["Баал (Хадду)", "Гоэтия (Малый ключ Соломона)"], ["Гёбекли-Тепе", "Рептилоиды"], ["Роза Мира — интеррелигия", "QAnon"]];
  $("examples").innerHTML = "Примеры: " + EXAMPLES.filter(([a, b]) => resolve(a) && resolve(b)).map(([a, b], i) => `<button class="chip" data-ex="${i}">${esc(resolve(a).t)} → ${esc(resolve(b).t)}</button>`).join("");
  $("examples").addEventListener("click", (e) => { const b = e.target.closest("button[data-ex]"); if (!b) return; const [a, c] = EXAMPLES[+b.dataset.ex]; $("pa").value = resolve(a).t; $("pb").value = resolve(c).t; runPath(a, c); });

  /* ---------- обзор: эпохи и статусы ---------- */
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
    let s = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Распределение записей по эпохам">`;
    for (let v = 0; v <= top; v += step) s += `<line x1="${L}" x2="${w}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line-2)"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--mute)" font-family="JetBrains Mono, monospace">${v}</text>`;
    bins.forEach((b, i) => {
      const x = L + i * bw + 4, bw2 = bw - 8, cx = x + bw2 / 2;
      s += `<g class="tbin" data-i="${i}" style="cursor:pointer"><rect x="${x - 4}" y="${Tp}" width="${bw}" height="${h - B - Tp}" fill="transparent"/>`;
      if (b.all) {
        const r = Math.min(4, bw2 / 2), yt = y(b.all), yd = y(b.deb);
        s += `<path d="M${x},${y(0)} V${yt + r} Q${x},${yt} ${x + r},${yt} H${x + bw2 - r} Q${x + bw2},${yt} ${x + bw2},${yt + r} V${y(0)} Z" fill="var(--ink-2)"/>`;
        if (b.deb) s += `<rect x="${x}" y="${yd + 2}" width="${bw2}" height="${Math.max(0, y(0) - yd - 2)}" fill="var(--accent)"/>`;
      }
      s += `<text transform="translate(${cx},${h - B + 14}) rotate(32)" font-size="10.5" fill="var(--mute)">${BINS[i][2]}</text></g>`;
    });
    $("timeline").innerHTML = s + `</svg><div class="tip" hidden></div>`;
    const tip = $("timeline").querySelector(".tip");
    $("timeline").addEventListener("mousemove", (e) => {
      const g = e.target.closest(".tbin"); if (!g) { tip.hidden = true; return; }
      const b = bins[+g.dataset.i], r = $("timeline").getBoundingClientRect();
      tip.hidden = false; tip.style.left = e.clientX - r.left + "px"; tip.style.top = e.clientY - r.top + "px";
      tip.textContent = `${BINS[+g.dataset.i][2]}: ${b.all} записей, опровергнуто ${b.deb}`;
    });
    $("timeline").addEventListener("mouseleave", () => (tip.hidden = true));
    $("timeline").addEventListener("click", (e) => { const g = e.target.closest(".tbin"); if (g) filterRegister({ e: g.dataset.i }); });
  })();
  const SCOL = { fact: "var(--ok)", disputed: "var(--warn)", debunked: "var(--bad)", hoax: "var(--bad)", belief: "var(--belief)", hypothesis: "var(--hyp)" };
  const sOrder = ["fact", "hypothesis", "disputed", "belief", "debunked", "hoax"];
  const sCount = Object.fromEntries(sOrder.map((s) => [s, nodes.filter((n) => n.s === s).length]));
  $("statbar").innerHTML = sOrder.map((s) => `<i style="width:${(sCount[s] / nodes.length) * 100}%;background:${SCOL[s]};${s === "hoax" ? "opacity:.55" : ""}"></i>`).join("");
  $("statlist").innerHTML = sOrder.map((s) => `<li><button data-s="${s}">${statusChip(s)}<span>${Math.round((sCount[s] / nodes.length) * 100)}% записей</span><b class="num">${sCount[s]}</b></button></li>`).join("");
  $("statlist").addEventListener("click", (e) => { const b = e.target.closest("button[data-s]"); if (b) filterRegister({ s: b.dataset.s }); });

  /* ---------- реестр ---------- */
  const rq = $("rq"), rd = $("rd"), rs = $("rs"), re = $("re"), ro = $("ro");
  rd.innerHTML += domOrder.map((d) => `<option value="${d}">${esc(DOMS[d])}</option>`).join("");
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
    $("rcount").textContent = `${fmt(list.length)} из ${fmt(nodes.length)}`;
    $("rlist").innerHTML = list.length ? `<div class="row row-head" role="presentation"><span></span><span>Запись</span><span>Раздел</span><span>Эпоха</span><span>Статус</span></div>` : `<div class="empty-state">Ничего не нашлось. Сбросьте один из фильтров.</div>`;
    more();
  }
  function more() {
    const chunk = list.slice(shown, shown + PAGE); shown += chunk.length;
    $("rlist").insertAdjacentHTML("beforeend", chunk.map((n) => `<button class="row" role="listitem" data-id="${n.id}">
      <i class="dot" style="background:${famVar(n.d)}"></i>
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

  /* ---------- Око ---------- */
  const LEGS = [
    ["L", 30, 52, "M30 52 L12 40 L2 48"], ["L", 26, 62, "M26 62 L6 60 L-6 70"], ["L", 22, 74, "M22 74 L4 82 L-2 96"], ["L", 30, 86, "M30 86 L18 100 L20 114"],
    ["R", 70, 52, "M70 52 L88 40 L98 48"], ["R", 74, 62, "M74 62 L94 60 L106 70"], ["R", 78, 74, "M78 74 L96 82 L102 96"], ["R", 70, 86, "M70 86 L82 100 L80 114"],
  ];
  const eye = $("eye");
  eye.innerHTML = `<svg viewBox="-12 -6 124 128"><g class="body">
    <g stroke="var(--ink)" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round">
      ${LEGS.map(([s, x, y, d], i) => `<path class="leg${s}${i % 2 ? " alt" : ""}" style="transform-box:view-box;transform-origin:${x}px ${y}px" d="${d}"/>`).join("")}
    </g>
    <rect x="38" y="-2" width="24" height="22" fill="var(--ink)"/><rect x="32" y="18" width="36" height="5" fill="var(--ink)"/><rect x="38" y="13" width="24" height="3" fill="var(--gold)"/>
    <path d="M50 26 L90 92 L10 92 Z" fill="var(--accent)" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M50 36 L80 86 L20 86 Z" fill="none" stroke="var(--gold)" stroke-width="1.2" opacity=".85"/>
    <path d="M31 67 Q50 50 69 67 Q50 82 31 67 Z" fill="#f4efe0" stroke="var(--ink)" stroke-width="2"/>
    <g class="pupil"><circle cx="50" cy="67" r="7" fill="#1b1a17"/><circle cx="47.5" cy="64.5" r="2" fill="#f4efe0"/></g>
    <path d="M24 80 H76 M33 74 V80 M67 74 V80 M50 80 V86" stroke="var(--ink)" stroke-width="1" opacity=".35"/>
  </g></svg>`;
  const pupil = eye.querySelector(".pupil"), pct = $("pct");
  const TOP = 70;
  let ey = TOP, walkT = 0;
  function crawl() {
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
  if (saved === "net" || saved === "ring") setMode(saved);
  else { mode = "focus"; const t = layoutFocus(start); t.forEach((v, n) => { n.x = v[0]; n.y = v[1]; }); }
})();
