/* ARCHIVUM — карта соединений. Данные приходят из data.js (window.KB), сборка: kb/build.py */
(() => {
  "use strict";
  const KB = window.KB;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const STATUS = { fact: "доказано", disputed: "спорно", debunked: "опровергнуто", hoax: "подделка", belief: "вера / традиция", hypothesis: "гипотеза" };
  const DOMS = KB.domains;
  const domKeys = Object.keys(DOMS);
  const domIndex = Object.fromEntries(domKeys.map((k, i) => [k, i]));

  /* ---------- данные ---------- */
  const nodes = KB.nodes.map((n) => ({ ...n, yr: n.y, deg: 0, adj: [] })); // y занят координатой, год хранится в yr
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges = KB.edges.map(([a, b, kind]) => ({ source: byId.get(a), target: byId.get(b), kind }));
  for (const e of edges) {
    e.source.deg++; e.target.deg++;
    e.source.adj.push({ n: e.target, kind: e.kind, out: true });
    e.target.adj.push({ n: e.source, kind: e.kind, out: false });
  }
  const statusChip = (s) => `<span class="chip s-${s}">${STATUS[s] || s}</span>`;
  const domColor = (d) => `var(--d${domIndex[d]})`;

  /* ---------- шапка ---------- */
  const count = (s) => nodes.filter((n) => n.s === s).length;
  $("m-nodes").textContent = nodes.length;
  $("m-edges").textContent = edges.length;
  $("m-domains").textContent = domKeys.length;
  $("m-fact").textContent = count("fact");
  $("m-debunked").textContent = count("debunked") + count("hoax");
  $("m-date").textContent = "сборка " + (KB.built || "");

  /* ---------- цвета из токенов (для canvas) ---------- */
  let C = {};
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const g = (v) => cs.getPropertyValue(v).trim();
    C = { ink: g("--ink"), mute: g("--mute"), plate: g("--plate"), rule: g("--rule"), accent: g("--accent"), gold: g("--gold"), dom: domKeys.map((_, i) => g("--d" + i)) };
  }
  readColors();
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { readColors(); draw(); });
  new MutationObserver(() => { readColors(); draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  /* ---------- раскладка «сеть»: координаты посчитаны при сборке (kb/build.py) ---------- */
  const rad = (n) => 2.6 + Math.sqrt(n.deg) * 1.35;
  nodes.forEach((n) => { n.x = n.nx = n.px; n.y = n.ny = n.py; });
  // центры доменов — для подписей кластеров
  const centre = domKeys.map((d) => {
    const ns = nodes.filter((n) => n.d === d);
    const cx = ns.reduce((s, n) => s + n.x, 0) / (ns.length || 1), cy = ns.reduce((s, n) => s + n.y, 0) / (ns.length || 1);
    const ds = ns.map((n) => Math.hypot(n.x - cx, n.y - cy)).sort((a, b) => a - b);
    const r = ds[Math.floor(ds.length * 0.85)] || 0, l = Math.hypot(cx, cy) || 1;
    return { x: cx + (cx / l) * (r + 40), y: cy + (cy / l) * (r + 40) };
  });
  const easeCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* ---------- раскладка «кольцо» ---------- */
  const ringOrder = [...nodes].sort((a, b) => domIndex[a.d] - domIndex[b.d] || (a.yr ?? 0) - (b.yr ?? 0));
  const RR = 700;
  ringOrder.forEach((n, i) => {
    const gap = domIndex[n.d] * 4; // небольшие разрывы между доменами
    const a = ((i + gap) / (nodes.length + domKeys.length * 4)) * Math.PI * 2 - Math.PI / 2;
    n.ra = a; n.rx = Math.cos(a) * RR; n.ry = Math.sin(a) * RR;
  });

  /* ---------- canvas ---------- */
  const canvas = $("graph");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  const T = { x: 0, y: 0, k: 1, invert: ([px, py]) => [(px - T.x) / T.k, (py - T.y) / T.k] };
  let mode = "net";
  let hover = null, selected = null;
  let pathSet = null; // Set узлов выделенной цепочки
  let pathEdges = null;
  const activeDom = new Set(domKeys);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    draw();
  }

  /* панорама и масштаб: мышь — тянуть, колесо — после клика по карте (или с Ctrl), два пальца — щипок */
  const KMIN = 0.06, KMAX = 8;
  const clampK = (k) => Math.min(KMAX, Math.max(KMIN, k));
  let tween = 0;
  function setT(x, y, k) { cancelAnimationFrame(tween); T.x = x; T.y = y; T.k = k; draw(); }
  function zoomAt(px, py, k) { k = clampK(k); setT(px - ((px - T.x) / T.k) * k, py - ((py - T.y) / T.k) * k, k); }
  function animateT(x, y, k, dur = 600) {
    cancelAnimationFrame(tween);
    if (reduced) { setT(x, y, k); return; }
    const a = { x: T.x, y: T.y, k: T.k }, t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur), q = easeCubic(p);
      T.x = a.x + (x - a.x) * q; T.y = a.y + (y - a.y) * q; T.k = a.k + (k - a.k) * q;
      draw();
      if (p < 1) tween = requestAnimationFrame(step);
    };
    tween = requestAnimationFrame(step);
  }
  let mapActive = false; // колесо масштабирует карту только после клика по ней — страница прокручивается свободно
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
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged = false;
    if (e.pointerType !== "touch") { canvas.setPointerCapture(e.pointerId); canvas.classList.add("drag"); }
    if (ptrs.size === 2) {
      const [p, q] = [...ptrs.values()];
      pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2 };
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    const prev = ptrs.get(e.pointerId);
    if (!prev) return;
    const r = canvas.getBoundingClientRect();
    if (ptrs.size === 2 && pinch) {
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [p, q] = [...ptrs.values()];
      const d = Math.hypot(p.x - q.x, p.y - q.y), mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
      T.x += mx - pinch.mx; T.y += my - pinch.my;
      zoomAt(mx - r.left, my - r.top, T.k * (d / pinch.d));
      pinch = { d, mx, my }; dragged = true;
      return;
    }
    if (e.pointerType === "touch") return; // один палец прокручивает страницу
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) dragged = true;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (dragged) setT(T.x + dx, T.y + dy, T.k);
  });
  const lift = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; canvas.classList.remove("drag"); };
  canvas.addEventListener("pointerup", lift);
  canvas.addEventListener("pointercancel", lift);
  $("z-in").onclick = () => zoomAt(W / 2, H / 2, T.k * 1.5);
  $("z-out").onclick = () => zoomAt(W / 2, H / 2, T.k / 1.5);
  $("hint").textContent = coarse ? "два пальца — двигать и масштабировать" : "клик по карте включает колесо · клик по узлу — выбрать";

  function fit(animate) {
    const vis = nodes.filter((n) => activeDom.has(n.d));
    if (!vis.length || !W) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of vis) { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); }
    const pad = mode === "ring" ? 150 : 60;
    const k = clampK(Math.min(W / (x1 - x0 + pad * 2), (H - 60) / (y1 - y0 + pad * 2), 3));
    const x = W / 2 - ((x0 + x1) / 2) * k, y = H / 2 + 20 - ((y0 + y1) / 2) * k;
    if (animate) animateT(x, y, k); else setT(x, y, k);
  }

  function focusNode(n) {
    if (!n || !W) return;
    const k = Math.max(T.k, 1.6);
    animateT(W / 2 - n.x * k, H / 2 - n.y * k, k, 650);
  }

  let raf = 0;
  function draw() { if (!raf) raf = requestAnimationFrame(render); }

  function lit(n) {
    if (!activeDom.has(n.d)) return false;
    if (pathSet) return pathSet.has(n);
    if (selected) return n === selected || selected.adj.some((a) => a.n === n);
    return true;
  }

  function render() {
    raf = 0;
    if (!W) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(T.x, T.y); ctx.scale(T.k, T.k);
    const k = T.k;
    const focus = selected || pathSet;

    // рёбра: сначала фон, потом выделенные
    const styles = {
      src: { c: C.ink, dash: [], a: 0.32 },
      comp: { c: C.mute, dash: [], a: 0.26 },
      over: { c: C.mute, dash: [1.5 / k, 3 / k], a: 0.32 },
      anti: { c: C.accent, dash: [5 / k, 3 / k], a: 0.55 },
    };
    const curve = (e) => {
      ctx.moveTo(e.source.x, e.source.y);
      if (mode === "ring") ctx.quadraticCurveTo((e.source.x + e.target.x) * 0.12, (e.source.y + e.target.y) * 0.12, e.target.x, e.target.y);
      else ctx.lineTo(e.target.x, e.target.y);
    };
    ctx.lineWidth = 0.8 / k;
    for (const kind of Object.keys(styles)) {
      const st = styles[kind];
      ctx.beginPath();
      for (const e of edges) {
        if (e.kind !== kind) continue;
        if (!activeDom.has(e.source.d) || !activeDom.has(e.target.d)) continue;
        if (isHot(e)) continue;
        curve(e);
      }
      ctx.strokeStyle = st.c; ctx.setLineDash(st.dash);
      ctx.globalAlpha = focus ? 0.05 : st.a * (mode === "ring" ? 0.7 : 1);
      ctx.stroke();
    }
    if (focus) {
      ctx.lineWidth = 1.8 / k;
      for (const e of edges) {
        if (!isHot(e)) continue;
        const st = styles[e.kind];
        ctx.beginPath(); curve(e);
        ctx.strokeStyle = e.kind === "anti" ? C.accent : (pathSet ? C.accent : C.ink);
        ctx.setLineDash(st.dash); ctx.globalAlpha = 0.9; ctx.stroke();
      }
    }
    ctx.setLineDash([]);

    // узлы
    for (const n of nodes) {
      const on = lit(n);
      const r = rad(n);
      ctx.globalAlpha = activeDom.has(n.d) ? (on ? 1 : 0.13) : 0.05;
      ctx.fillStyle = C.dom[domIndex[n.d]];
      ctx.beginPath();
      if (n.s === "debunked" || n.s === "hoax") { // перечёркнутый квадрат — опровергнутое
        ctx.rect(n.x - r, n.y - r, r * 2, r * 2); ctx.fill();
        ctx.strokeStyle = C.plate; ctx.lineWidth = 1 / k;
        ctx.beginPath(); ctx.moveTo(n.x - r, n.y + r); ctx.lineTo(n.x + r, n.y - r); ctx.stroke();
      } else { ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill(); }
      if (n === selected || n === hover) {
        ctx.globalAlpha = 1; ctx.strokeStyle = n === selected ? C.accent : C.ink; ctx.lineWidth = 2 / k;
        ctx.beginPath(); ctx.arc(n.x, n.y, r + 4 / k, 0, Math.PI * 2); ctx.stroke();
      }
    }

    // подписи
    ctx.textBaseline = "middle";
    if (mode === "ring") {
      const fs = Math.max(7, Math.min(11, 7 * k * 1.6)) / k;
      ctx.font = `400 ${fs}px "JetBrains Mono", monospace`;
      for (const n of nodes) {
        if (!activeDom.has(n.d)) continue;
        const on = lit(n);
        ctx.globalAlpha = on ? (focus ? 1 : 0.75) : 0.12;
        ctx.fillStyle = n === selected ? C.accent : C.ink;
        ctx.save();
        ctx.translate(n.x, n.y);
        const flip = Math.cos(n.ra) < 0;
        ctx.rotate(flip ? n.ra + Math.PI : n.ra);
        ctx.textAlign = flip ? "right" : "left";
        ctx.fillText(n.t, flip ? -rad(n) - 4 / k : rad(n) + 4 / k, 0);
        ctx.restore();
      }
      // подписи доменов
      ctx.font = `600 ${15 / k}px Oswald, sans-serif`;
      ctx.textAlign = "center"; ctx.globalAlpha = 0.9; ctx.fillStyle = C.ink;
      for (const d of domKeys) {
        if (!activeDom.has(d)) continue;
        const ns = ringOrder.filter((n) => n.d === d);
        const a = ns[Math.floor(ns.length / 2)].ra;
        ctx.save(); ctx.translate(Math.cos(a) * (RR - 60), Math.sin(a) * (RR - 60));
        ctx.fillText(DOMS[d].toUpperCase(), 0, 0); ctx.restore();
      }
    } else {
      const fs = 11 / k;
      ctx.font = `400 ${fs}px "JetBrains Mono", monospace`;
      ctx.textAlign = "left";
      ctx.lineJoin = "round";
      for (const n of nodes) {
        const on = lit(n);
        const show = n === hover || n === selected || (focus && on) || (!focus && activeDom.has(n.d) && n.deg * k >= 9);
        if (!show) continue;
        ctx.globalAlpha = on ? 1 : 0.3;
        const x = n.x + rad(n) + 3 / k;
        ctx.strokeStyle = C.plate; ctx.lineWidth = 3 / k; ctx.strokeText(n.t, x, n.y);
        ctx.fillStyle = n === selected ? C.accent : C.ink; ctx.fillText(n.t, x, n.y);
      }
      // ярлыки доменов
      ctx.font = `600 ${Math.max(12, 16 * k) / k}px Oswald, sans-serif`;
      ctx.textAlign = "center"; ctx.globalAlpha = focus ? 0.25 : 0.55; ctx.fillStyle = C.ink;
      domKeys.forEach((d, i) => {
        if (!activeDom.has(d)) return;
        const c = centre[i];
        ctx.fillText(DOMS[d].toUpperCase(), c.x, c.y);
      });
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function isHot(e) {
    if (pathEdges) return pathEdges.has(e);
    return selected && (e.source === selected || e.target === selected);
  }

  function nodeAt(px, py) {
    const [wx, wy] = T.invert([px, py]);
    let best = null, bd = Infinity;
    for (const n of nodes) {
      if (!activeDom.has(n.d)) continue;
      const d = Math.hypot(n.x - wx, n.y - wy);
      const lim = rad(n) + (coarse ? 14 : 6) / T.k;
      if (d < lim && d < bd) { bd = d; best = n; }
    }
    return best;
  }
  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    const r = canvas.getBoundingClientRect();
    const n = nodeAt(e.clientX - r.left, e.clientY - r.top);
    if (n !== hover) { hover = n; canvas.style.cursor = n ? "pointer" : ""; draw(); }
  });
  canvas.addEventListener("pointerleave", () => { hover = null; draw(); });
  canvas.addEventListener("click", (e) => {
    if (dragged) return;
    const r = canvas.getBoundingClientRect();
    const n = nodeAt(e.clientX - r.left, e.clientY - r.top);
    select(n);
  });

  /* ---------- переключение раскладок ---------- */
  function setMode(m) {
    if (m === mode) return;
    mode = m;
    $("v-net").setAttribute("aria-pressed", m === "net");
    $("v-ring").setAttribute("aria-pressed", m === "ring");
    try { localStorage.setItem("archivum-mode", m); } catch (_) {}
    const from = nodes.map((n) => [n.x, n.y]);
    const to = nodes.map((n) => (m === "ring" ? [n.rx, n.ry] : [n.nx, n.ny]));
    if (reduced) { nodes.forEach((n, i) => { [n.x, n.y] = to[i]; }); fit(false); return; }
    const t0 = performance.now(), dur = 900;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur), q = easeCubic(p);
      nodes.forEach((n, i) => { n.x = from[i][0] + (to[i][0] - from[i][0]) * q; n.y = from[i][1] + (to[i][1] - from[i][1]) * q; });
      draw();
      if (p < 1) requestAnimationFrame(step); else fit(true);
    };
    requestAnimationFrame(step);
  }
  $("v-net").onclick = () => setMode("net");
  $("v-ring").onclick = () => setMode("ring");
  $("v-reset").onclick = () => { select(null); clearPath(); activeDom.clear(); domKeys.forEach((d) => activeDom.add(d)); renderDomains(); fit(true); };

  /* ---------- выбор узла и карточка ---------- */
  function select(n, opts = {}) {
    selected = n || null;
    if (n) clearPath(true);
    const card = $("card");
    if (!n) { card.hidden = true; draw(); return; }
    card.hidden = false;
    $("c-dom").innerHTML = `<span class="sw" style="background:${domColor(n.d)}"></span>${esc(DOMS[n.d])}`;
    $("c-st").innerHTML = statusChip(n.s);
    $("c-era").textContent = n.era || "";
    $("c-title").textContent = n.t;
    $("c-sum").textContent = n.sum;
    $("c-deg").textContent = `${n.deg} связ.`;
    if (opts.focus) focusNode(n);
    draw();
  }
  $("c-open").onclick = () => selected && openDossier(selected);
  $("c-clear").onclick = () => select(null);

  /* ---------- поиск ---------- */
  const norm = (s) => String(s || "").toLowerCase().replace(/ё/g, "е");
  nodes.forEach((n) => { n.hay = norm([n.t, n.en, (n.tags || []).join(" "), n.era].join(" ")); n.tn = norm(n.t); });
  function find(q, lim = 8) {
    q = norm(q).trim();
    if (!q) return [];
    const res = [];
    for (const n of nodes) {
      let s = -1;
      if (n.tn === q) s = 100; else if (n.tn.startsWith(q)) s = 60; else if (n.tn.includes(q)) s = 40; else if (n.hay.includes(q)) s = 10;
      if (s > 0) res.push([s + n.deg / 10, n]);
    }
    return res.sort((a, b) => b[0] - a[0]).slice(0, lim).map((r) => r[1]);
  }
  const q = $("q"), results = $("results");
  let cur = -1, hits = [];
  function showResults() {
    hits = find(q.value);
    cur = -1;
    results.hidden = !hits.length;
    results.innerHTML = hits.map((n, i) => `<button type="button" data-i="${i}">${esc(n.t)}<em>${esc(DOMS[n.d])} · ${esc(n.era || "")}</em></button>`).join("");
  }
  function pick(n) { results.hidden = true; q.value = ""; q.blur(); select(n, { focus: true }); }
  q.addEventListener("input", showResults);
  q.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      cur = (cur + (e.key === "ArrowDown" ? 1 : -1) + hits.length) % hits.length;
      [...results.children].forEach((b, i) => b.classList.toggle("on", i === cur));
    } else if (e.key === "Enter" && hits.length) { e.preventDefault(); pick(hits[Math.max(0, cur)]); }
    else if (e.key === "Escape") results.hidden = true;
  });
  results.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) pick(hits[+b.dataset.i]); });
  document.addEventListener("click", (e) => { if (!e.target.closest(".search")) results.hidden = true; });

  /* ---------- панели ---------- */
  function renderDomains() {
    const max = Math.max(...domKeys.map((d) => nodes.filter((n) => n.d === d).length));
    $("p-domains").innerHTML = domKeys.map((d) => {
      const c = nodes.filter((n) => n.d === d).length;
      return `<button class="bar" data-d="${d}" aria-pressed="${activeDom.has(d)}"><span><i style="width:${(c / max) * 100}%"></i><em><b class="sw" style="background:${domColor(d)}"></b>${esc(DOMS[d])}</em></span><b class="num">${c}</b></button>`;
    }).join("");
  }
  $("p-domains").addEventListener("click", (e) => {
    const b = e.target.closest(".bar"); if (!b) return;
    const d = b.dataset.d;
    if (activeDom.size === domKeys.length) { activeDom.clear(); activeDom.add(d); } // первый клик — «соло»
    else if (activeDom.has(d)) activeDom.delete(d); else activeDom.add(d);
    if (!activeDom.size) domKeys.forEach((x) => activeDom.add(x));
    if (selected && !activeDom.has(selected.d)) select(null);
    renderDomains(); fit(true); draw();
  });
  renderDomains();

  const stMax = Math.max(...Object.keys(STATUS).map(count));
  $("p-status").innerHTML = Object.keys(STATUS).map((s) => `<button class="bar" data-s="${s}"><span><i style="width:${(count(s) / stMax) * 100}%"></i><em class="s-${s}"><b class="sw" style="background:currentColor"></b></em><em>${STATUS[s]}</em></span><b class="num">${count(s)}</b></button>`).join("");
  $("p-status").addEventListener("click", (e) => {
    const b = e.target.closest(".bar"); if (!b) return;
    $("cs").value = b.dataset.s; resetCatalog(); $("catalog").scrollIntoView();
  });

  // хронология
  const BINS = [
    [-Infinity, -10000, "до 10 000 до н.э."], [-10000, -3000, "10–3 тыс. до н.э."], [-3000, -1000, "3–1 тыс. до н.э."],
    [-1000, 0, "I тыс. до н.э."], [0, 500, "0–500"], [500, 1000, "500–1000"], [1000, 1500, "1000–1500"],
    [1500, 1800, "1500–1800"], [1800, 1900, "XIX в."], [1900, 1950, "1900–1950"], [1950, 2000, "1950–2000"], [2000, Infinity, "XXI в."],
  ];
  const binOf = (y) => BINS.findIndex(([a, b]) => y >= a && y < b);
  const binCounts = BINS.map(() => ({ all: 0, deb: 0 }));
  nodes.forEach((n) => { if (typeof n.yr === "number") { const b = binCounts[binOf(n.yr)]; b.all++; if (n.s === "debunked" || n.s === "hoax") b.deb++; } });
  (function timeline() {
    const w = 640, h = 170, padL = 30, padB = 46, padT = 12;
    const max = Math.max(...binCounts.map((b) => b.all));
    const top = Math.ceil(max / 20) * 20;
    const bw = (w - padL) / BINS.length;
    const y = (v) => h - padB - (v / top) * (h - padB - padT);
    let s = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Распределение узлов по эпохам">`;
    for (let v = 0; v <= top; v += top / 4) s += `<line x1="${padL}" x2="${w}" y1="${y(v)}" y2="${y(v)}" stroke="var(--faint)"/><text x="${padL - 4}" y="${y(v) + 3}" text-anchor="end" font-size="9" fill="var(--mute)">${v}</text>`;
    binCounts.forEach((b, i) => {
      const x = padL + i * bw + 3;
      s += `<g class="tbin" data-i="${i}" style="cursor:pointer"><rect x="${x - 3}" y="${padT}" width="${bw}" height="${h - padB - padT}" fill="transparent"/>`;
      s += `<rect x="${x}" y="${y(b.all)}" width="${bw - 6}" height="${y(0) - y(b.all)}" fill="var(--ink)"/>`;
      if (b.deb) s += `<rect x="${x}" y="${y(b.deb)}" width="${bw - 6}" height="${y(0) - y(b.deb)}" fill="var(--accent)"/>`;
      s += `<text x="${x + (bw - 6) / 2}" y="${y(b.all) - 4}" text-anchor="middle" font-size="9" fill="var(--ink)">${b.all}</text>`;
      s += `<text transform="translate(${x + (bw - 6) / 2},${h - padB + 10}) rotate(35)" font-size="8.5" fill="var(--mute)">${BINS[i][2]}</text></g>`;
    });
    s += `<rect x="${w - 150}" y="2" width="8" height="8" fill="var(--ink)"/><text x="${w - 138}" y="9" font-size="9" fill="var(--mute)">все</text><rect x="${w - 106}" y="2" width="8" height="8" fill="var(--accent)"/><text x="${w - 94}" y="9" font-size="9" fill="var(--mute)">опровергнуто</text>`;
    $("p-time").innerHTML = s + "</svg>";
    $("p-time").addEventListener("click", (e) => {
      const g = e.target.closest(".tbin"); if (!g) return;
      $("ce").value = g.dataset.i; resetCatalog(); $("catalog").scrollIntoView();
    });
  })();

  // хабы
  const hubs = [...nodes].sort((a, b) => b.deg - a.deg).slice(0, 12);
  $("p-hubs").innerHTML = hubs.map((n, i) => `<li><button data-id="${n.id}"><b class="num">${String(i + 1).padStart(2, "0")}</b><span>${esc(n.t)}</span><b class="num">${n.deg}</b></button></li>`).join("");
  $("p-hubs").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    select(byId.get(b.dataset.id), { focus: true }); $("map").scrollIntoView({ block: "center" });
  });

  // цепочка
  $("all-ids").innerHTML = nodes.map((n) => `<option value="${esc(n.t)}"></option>`).join("");
  const resolve = (s) => { const t = norm(s).trim(); return nodes.find((n) => n.tn === t) || find(s, 1)[0]; };
  function shortest(a, b) {
    const prev = new Map([[a, null]]);
    const queue = [a];
    while (queue.length) {
      const n = queue.shift();
      if (n === b) break;
      for (const { n: m } of n.adj) if (!prev.has(m)) { prev.set(m, n); queue.push(m); }
    }
    if (!prev.has(b)) return null;
    const path = [];
    for (let n = b; n; n = prev.get(n)) path.unshift(n);
    return path;
  }
  function edgeBetween(a, b) { return edges.find((e) => (e.source === a && e.target === b) || (e.source === b && e.target === a)); }
  const KIND = { src: "источник", comp: "дополняет", over: "пересекается", anti: "опровергает" };
  function showPath(path, box) {
    pathSet = new Set(path);
    pathEdges = new Set();
    for (let i = 1; i < path.length; i++) pathEdges.add(edgeBetween(path[i - 1], path[i]));
    pathEdges.delete(undefined);
    selected = null; $("card").hidden = true;
    box.innerHTML = path.map((n, i) => {
      const via = i ? `<span class="via">→ ${KIND[edgeBetween(path[i - 1], n)?.kind] || "связь"} →</span>` : "";
      return `${via}<button data-id="${n.id}">${esc(n.t)}</button>`;
    }).join("") + ` <button class="btn" data-map="1">на карте</button>`;
    draw();
  }
  function clearPath(keep) { pathSet = null; pathEdges = null; if (!keep) draw(); }
  $("path-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const a = resolve($("pa").value), b = resolve($("pb").value), box = $("chain");
    if (!a || !b) { box.innerHTML = `<span class="lbl">Не нашёл ${!a ? "первый" : "второй"} узел. Начните вводить название и выберите из списка.</span>`; return; }
    const p = shortest(a, b);
    if (!p) { box.innerHTML = `<span class="lbl">Между «${esc(a.t)}» и «${esc(b.t)}» пока нет пути. Связи добавляются каждую ночь.</span>`; return; }
    showPath(p, box);
  });
  function chainClick(e) {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.map) { $("map").scrollIntoView({ block: "center" }); fit(true); return; }
    openDossier(byId.get(b.dataset.id));
  }
  $("chain").addEventListener("click", chainClick);
  $("pa").value = "Масонство"; $("pb").value = "Нибиру";

  // следователь
  $("walk-go").onclick = () => {
    const pool = nodes.filter((n) => n.deg > 2 && activeDom.has(n.d));
    let n = pool[Math.floor(Math.random() * pool.length)];
    const path = [n];
    for (let i = 0; i < 7; i++) {
      const opts = n.adj.map((a) => a.n).filter((m) => !path.includes(m) && activeDom.has(m.d));
      if (!opts.length) break;
      n = opts[Math.floor(Math.random() * opts.length)];
      path.push(n);
    }
    showPath(path, $("walk"));
  };
  $("walk").addEventListener("click", chainClick);

  /* ---------- каталог ---------- */
  const cd = $("cd"), cs = $("cs"), ce = $("ce"), cq = $("cq");
  cd.innerHTML += domKeys.map((d) => `<option value="${d}">${esc(DOMS[d])}</option>`).join("");
  cs.innerHTML += Object.keys(STATUS).map((s) => `<option value="${s}">${STATUS[s]}</option>`).join("");
  ce.innerHTML += BINS.map((b, i) => `<option value="${i}">${b[2]}</option>`).join("");
  const sorted = [...nodes].sort((a, b) => domIndex[a.d] - domIndex[b.d] || (a.yr ?? 0) - (b.yr ?? 0));
  let shown = 0, list = [];
  const PAGE = 48;
  function resetCatalog() {
    const text = norm(cq.value).trim();
    list = sorted.filter((n) =>
      (!cd.value || n.d === cd.value) && (!cs.value || n.s === cs.value) &&
      (ce.value === "" || (typeof n.yr === "number" && binOf(n.yr) === +ce.value)) &&
      (!text || n.hay.includes(text) || norm(n.sum).includes(text)));
    shown = 0; $("grid").innerHTML = "";
    $("ccount").textContent = `${list.length} из ${nodes.length}`;
    if (!list.length) $("grid").innerHTML = `<div class="empty">Ничего не нашлось. Сбросьте один из фильтров.</div>`;
    more();
  }
  function more() {
    const chunk = list.slice(shown, shown + PAGE);
    shown += chunk.length;
    $("grid").insertAdjacentHTML("beforeend", chunk.map((n) => `
      <button class="entry" data-id="${n.id}">
        <span class="dom" style="background:${domColor(n.d)}"></span>
        <span class="code"><span>${esc(DOMS[n.d])}</span><span class="num">${esc(n.era || "")}</span></span>
        <h4>${esc(n.t)}</h4>
        <p>${esc(n.sum)}</p>
        <span class="code">${statusChip(n.s)}<span class="num">${n.deg} связ.</span></span>
      </button>`).join(""));
    $("more").hidden = shown >= list.length;
  }
  [cq, cd, cs, ce].forEach((el) => el.addEventListener("input", resetCatalog));
  $("more").onclick = more;
  $("grid").addEventListener("click", (e) => { const b = e.target.closest(".entry"); if (b) openDossier(byId.get(b.dataset.id)); });
  resetCatalog();

  /* ---------- досье ---------- */
  const dossier = $("dossier"), scrim = $("scrim");
  const GROUPS = [
    ["src", true, "Опирается на"], ["src", false, "Повлияло на"], ["comp", null, "Дополняет"],
    ["over", null, "Пересекается"], ["anti", true, "Опровергает"], ["anti", false, "Опровергается"],
  ];
  let lastFocus = null;
  function openDossier(n) {
    if (!n) return;
    lastFocus = document.activeElement;
    const groups = GROUPS.map(([kind, out, title]) => {
      const items = n.adj.filter((a) => a.kind === kind && (out === null || a.out === out)).sort((a, b) => b.n.deg - a.n.deg);
      if (!items.length) return "";
      return `<div class="links"><h5>${title} · ${items.length}</h5><ul>${items.map((a) => `<li><button data-id="${a.n.id}">${esc(a.n.t)}<em>${esc(DOMS[a.n.d])}</em></button></li>`).join("")}</ul></div>`;
    }).join("");
    dossier.innerHTML = `
      <button class="btn x" id="d-close">Закрыть ✕</button>
      <span class="lbl"><span class="sw" style="background:${domColor(n.d)}"></span>${esc(DOMS[n.d])} · досье ${esc(n.id)}</span>
      <h2>${esc(n.t)}</h2>
      ${n.en ? `<div class="en">${esc(n.en)}</div>` : ""}
      <dl><dt>Статус</dt><dd>${statusChip(n.s)}</dd><dt>Эпоха</dt><dd class="num">${esc(n.era || "—")}</dd><dt>Связей</dt><dd class="num">${n.deg}</dd>${n.ref ? `<dt>Источник</dt><dd>${esc(n.ref)}</dd>` : ""}</dl>
      <p class="sum">${esc(n.sum)}</p>
      ${n.tags?.length ? `<div class="tags">${n.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>` : ""}
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" id="d-map">Показать на карте</button><button class="btn" id="d-from">Цепочка отсюда</button></div>
      ${groups || `<span class="lbl">Связей пока нет.</span>`}`;
    dossier.classList.add("open"); dossier.setAttribute("aria-hidden", "false"); scrim.hidden = false;
    dossier.scrollTop = 0;
    $("d-close").focus({ preventScroll: true });
    $("d-close").onclick = closeDossier;
    $("d-map").onclick = () => { closeDossier(); select(n, { focus: true }); $("map").scrollIntoView({ block: "center" }); };
    $("d-from").onclick = () => { closeDossier(); $("pa").value = n.t; $("pb").value = ""; $("pb").focus(); };
    try { history.replaceState(null, "", "#" + n.id); } catch (_) {}
  }
  function closeDossier() {
    dossier.classList.remove("open"); dossier.setAttribute("aria-hidden", "true"); scrim.hidden = true;
    try { history.replaceState(null, "", location.pathname + location.search); } catch (_) {}
    lastFocus?.focus?.({ preventScroll: true });
  }
  dossier.addEventListener("click", (e) => { const b = e.target.closest("button[data-id]"); if (b) openDossier(byId.get(b.dataset.id)); });
  scrim.onclick = closeDossier;
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && dossier.classList.contains("open")) closeDossier(); });

  /* ---------- Око: ползёт по линейке вслед за прокруткой ---------- */
  const LEGS = [
    ["L", 30, 52, "M30 52 L12 40 L2 48"], ["L", 26, 62, "M26 62 L6 60 L-6 70"], ["L", 22, 74, "M22 74 L4 82 L-2 96"], ["L", 30, 86, "M30 86 L18 100 L20 114"],
    ["R", 70, 52, "M70 52 L88 40 L98 48"], ["R", 74, 62, "M74 62 L94 60 L106 70"], ["R", 78, 74, "M78 74 L96 82 L102 96"], ["R", 70, 86, "M70 86 L82 100 L80 114"],
  ];
  const glyph = (live) => `<svg viewBox="-12 -6 124 128" ${live ? "" : 'aria-hidden="true"'}><g class="body">
    <g stroke="var(--ink)" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round">
      ${LEGS.map(([s, x, y, d], i) => `<path class="leg leg${s}${i % 2 ? " alt" : ""}" style="transform-box:view-box;transform-origin:${x}px ${y}px" d="${d}"/>`).join("")}
    </g>
    <rect x="38" y="-2" width="24" height="22" fill="var(--ink)"/><rect x="32" y="18" width="36" height="5" fill="var(--ink)"/><rect x="38" y="13" width="24" height="3" fill="var(--gold)"/>
    <path d="M50 26 L90 92 L10 92 Z" fill="var(--accent)" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M50 36 L80 86 L20 86 Z" fill="none" stroke="var(--gold)" stroke-width="1.2" opacity=".85"/>
    <path d="M31 67 Q50 50 69 67 Q50 82 31 67 Z" fill="#f4efe0" stroke="var(--ink)" stroke-width="2"/>
    <g class="pupil"><circle cx="50" cy="67" r="7" fill="var(--ink)"/><circle cx="47.5" cy="64.5" r="2" fill="#f4efe0"/></g>
    <path d="M24 80 H76 M33 74 V80 M67 74 V80 M50 80 V86" stroke="var(--ink)" stroke-width="1" opacity=".35"/>
  </g></svg>`;
  const eye = $("eye");
  eye.innerHTML = glyph(true);
  $("inv-eye").innerHTML = glyph(false);
  const pupil = eye.querySelector(".pupil");
  const pct = $("pct");
  let ey = 8, walkTimer = 0;
  function eyeTarget() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    return { p, y: 8 + p * (innerHeight - eye.offsetHeight - 16) };
  }
  function crawl() {
    const { p, y } = eyeTarget();
    const dy = y - ey;
    if (Math.abs(dy) > 0.4) {
      if (!reduced) ey += dy * 0.11; else ey = y;
      eye.classList.toggle("down", dy > 0);
      eye.classList.add("walk");
      clearTimeout(walkTimer);
      walkTimer = setTimeout(() => eye.classList.remove("walk"), 160);
    } else ey = y;
    eye.style.transform = `translateY(${ey}px)`;
    pct.style.top = `${ey + eye.offsetHeight + 6}px`;
    pct.textContent = String(Math.round(p * 100)).padStart(3, "0");
    requestAnimationFrame(crawl);
  }
  requestAnimationFrame(crawl);
  // зрачок следит за курсором
  addEventListener("pointermove", (e) => {
    const r = eye.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height * 0.55);
    if (eye.classList.contains("down")) { dx = -dx; dy = -dy; }
    const d = Math.hypot(dx, dy) || 1, m = Math.min(5, d / 40);
    pupil.setAttribute("transform", `translate(${(dx / d) * m * 1.3} ${(dy / d) * m * 0.6})`);
  }, { passive: true });
  eye.onclick = () => {
    const { p } = eyeTarget();
    if (p < 0.05) $("catalog").scrollIntoView(); else scrollTo({ top: 0 });
  };

  /* ---------- старт ---------- */
  try { if (localStorage.getItem("archivum-mode") === "ring") { mode = "ring"; nodes.forEach((n) => { n.x = n.rx; n.y = n.ry; }); $("v-net").setAttribute("aria-pressed", false); $("v-ring").setAttribute("aria-pressed", true); } } catch (_) {}
  new ResizeObserver(() => { const first = !W; resize(); if (first) fit(false); }).observe(canvas);
  const start = byId.get(decodeURIComponent(location.hash.slice(1)));
  if (start) { select(start); openDossier(start); }
})();
