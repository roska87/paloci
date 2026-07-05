/* Brain — the 3D neural view. Wings are lobes, rooms clusters, memories
   neurons; passages are threads between lobes. Two densities: LOD (lobes +
   rooms with live physics) and Full (~13.6k pinned neurons as nebulae).
   Search lights matching neurons up. Relies on the vendored 3d-force-graph
   (global `ForceGraph3D`). */

import { state, data, emit } from "./store.js";
import { t, wname, rname } from "./i18n.js";
import { esc, fmt, api } from "./util.js";
import { wingColor } from "./palette.js";
import { openDrawer } from "./reader.js";
import { openHiveRoot, closeHive } from "./hive.js";

const BRAIN = { graph: null, mode: "lod", nodesCache: null, centroid: {}, highlight: null, halos: [], lit: [], pulseRAF: null, hoverNode: null, pd: null, lastClick: null, buildId: 0 };
const DIM_COLOR = "rgba(150,156,176,0.07)";
const brainEl = () => document.getElementById("brain");

/* ---- highlight accessors -------------------------------------------------
   When a search is active (BRAIN.highlight is a Set of drawer ids), matching
   neurons keep their color and grow; everything else fades to a faint ghost. */
function nodeColorAcc(n) {
  if (BRAIN.highlight) {
    if (n.type === "mem") return BRAIN.highlight.has(n.drawer) ? n.color : DIM_COLOR;
    return DIM_COLOR;
  }
  return n.color;
}
function nodeValAcc(n) {
  const v = n.val || 1;
  if (BRAIN.highlight && n.type === "mem") return BRAIN.highlight.has(n.drawer) ? v * 3.4 : v * 0.5;
  return v;
}
function applyHighlight() {
  if (BRAIN.graph) { BRAIN.graph.nodeColor(nodeColorAcc).nodeVal(nodeValAcc); refreshVisualState(420); }
}

/* ---- visual polish: emissive glow, additive blending, halos, pulse -------
   Works by upgrading the materials the library already created (no deps). */
function enhanceBrainVisuals() {
  const g = BRAIN.graph; if (!g) return;
  BRAIN.halos = [];
  const seen = [];
  g.graphData().nodes.forEach((n) => {
    const o = n.__threeObj; if (!o || !o.material) return;
    const mat = o.material;
    const dimmed = mat.transparent === true && mat.opacity !== undefined && mat.opacity < 0.3;
    if (seen.indexOf(mat) === -1) {
      seen.push(mat);
      if (mat.emissive && mat.color && !dimmed) {
        // Self-lit neurons: emissive tinted with the node's own color.
        mat.emissive.copy(mat.color).multiplyScalar(n.type === "mem" ? 0.7 : 0.6);
        if (n.type === "mem" && BRAIN.mode === "full") {
          // Additive blending → dense clusters bloom like a galaxy core.
          // Low per-neuron opacity so stacked light keeps the lobe's tint
          // instead of blowing out to white.
          mat.blending = 2; mat.transparent = true; mat.depthWrite = false;
          if (mat.opacity === undefined || mat.opacity >= 0.2) mat.opacity = 0.3;
          mat.needsUpdate = true;
        }
      }
    }
    // Soft breathing halo around lobes and tunnel hubs (LOD mode only, few nodes).
    if (BRAIN.mode === "lod" && (n.type === "wing" || n.type === "tunnel") && !n.__halo && !dimmed) {
      try {
        const halo = new o.constructor(o.geometry, mat.clone());
        halo.material.transparent = true; halo.material.opacity = 0.14;
        halo.material.blending = 2; halo.material.depthWrite = false;
        if (halo.material.emissive) halo.material.emissive.copy(halo.material.color);
        halo.scale.setScalar(1.6);
        o.add(halo); n.__halo = halo;
      } catch (e) { /* material without emissive */ }
    }
    if (n.__halo) BRAIN.halos.push(n.__halo);
  });
}

function collectPulseTargets() {
  BRAIN.lit = [];
  const g = BRAIN.graph; if (!g || !BRAIN.highlight) return;
  g.graphData().nodes.forEach((n) => {
    if (n.type === "mem" && BRAIN.highlight.has(n.drawer) && n.__threeObj) {
      n.__threeObj.__s0 = n.__threeObj.scale.x || 1;
      BRAIN.lit.push(n.__threeObj);
    }
  });
}

function refreshVisualState(delay) {
  setTimeout(() => { enhanceBrainVisuals(); collectPulseTargets(); }, delay || 400);
}

function pulseTick(ts) {
  BRAIN.pulseRAF = requestAnimationFrame(pulseTick);
  if (brainEl().hidden) return;
  const k = (Math.sin(ts / 640) + 1) / 2;
  for (let i = 0; i < BRAIN.halos.length; i++) {
    const h = BRAIN.halos[i];
    h.material.opacity = 0.10 + 0.08 * k;
    h.scale.setScalar(1.5 + 0.18 * k);
  }
  if (BRAIN.highlight && BRAIN.lit.length) {
    const k2 = 1 + 0.22 * (Math.sin(ts / 430) + 1) / 2;
    for (let j = 0; j < BRAIN.lit.length; j++) { const o = BRAIN.lit[j]; o.scale.setScalar((o.__s0 || 1) * k2); }
  }
}
function startPulse() { if (!BRAIN.pulseRAF) BRAIN.pulseRAF = requestAnimationFrame(pulseTick); }
function stopPulse() { if (BRAIN.pulseRAF) { cancelAnimationFrame(BRAIN.pulseRAF); BRAIN.pulseRAF = null; } }

function updateMatchLabel(n) {
  const el = document.getElementById("brainMatch");
  if (n == null || n < 0) { el.hidden = true; el.textContent = ""; return; }
  el.hidden = false; el.textContent = t("matchCount", { n: fmt(n) });
}

function showBrainLoading(msg) { document.getElementById("brainLoadMsg").textContent = msg; document.getElementById("brainLoading").hidden = false; }
function hideBrainLoading() { document.getElementById("brainLoading").hidden = true; }

/* ---- graph construction -------------------------------------------------- */
function ensureGraph() {
  if (BRAIN.graph) return BRAIN.graph;
  if (typeof ForceGraph3D === "undefined") return null;
  const el = document.getElementById("brainGraph");
  const g = ForceGraph3D()(el)
    .backgroundColor("rgba(7,8,18,0)")
    .showNavInfo(false)
    .enableNodeDrag(false)
    .nodeRelSize(5)
    .nodeResolution(8)
    .nodeOpacity(0.92)
    .nodeColor(nodeColorAcc)
    .nodeVal(nodeValAcc)
    .nodeLabel((n) => {
      if (n.type === "wing") return "<b style='font-family:serif'>" + esc(wname(n.wing)) + "</b>";
      if (n.type === "room") return esc(wname(n.wing)) + " · " + esc(rname(n.room)) + " (" + fmt(n.count) + ")";
      if (n.type === "tunnel") return "⇄ " + esc(rname(n.troom));
      if (n.type === "mem") return esc(wname(n.wing)) + " · " + esc(rname(n.room));
      return "";
    })
    .linkColor((l) => l.tunnel ? "rgba(142,220,240,0.6)" : "rgba(230,186,110,0.3)")
    .linkWidth((l) => l.tunnel ? 1.0 : 0.45)
    .linkCurvature((l) => l.tunnel ? 0.28 : 0)
    .linkDirectionalParticles((l) => l.tunnel ? 3 : 0)
    .linkDirectionalParticleWidth(1.7)
    .linkDirectionalParticleSpeed(0.0038)
    .linkDirectionalParticleColor(() => "#bdf1ff")
    .onNodeClick(onNodeActivate)
    .onNodeHover((n) => { BRAIN.hoverNode = n || null; el.style.cursor = n ? "pointer" : ""; })
    .width(el.clientWidth).height(el.clientHeight);
  BRAIN.graph = g;
  // Robust click detection: the library suppresses clicks whenever ANY
  // pointermove lands between down and up (even a 0-px jitter), which eats
  // real users' clicks. We detect a true click ourselves (small distance,
  // short time) and activate the hovered node; a dedupe guard prevents
  // double-firing when the library's own click also gets through.
  el.addEventListener("pointerdown", (e) => { BRAIN.pd = { x: e.clientX, y: e.clientY, t: Date.now() }; }, true);
  el.addEventListener("pointerup", (e) => {
    const pd = BRAIN.pd; BRAIN.pd = null; if (!pd) return;
    if (Date.now() - pd.t > 600) return;
    if (Math.hypot(e.clientX - pd.x, e.clientY - pd.y) > 6) return;
    if (BRAIN.hoverNode) onNodeActivate(BRAIN.hoverNode);
  }, true);
  try {
    g.d3Force("charge").strength(-95);
    g.d3Force("link").distance((l) => l.tunnel ? 150 : 34);
  } catch (e) { /* forces unavailable */ }
  try {
    // Cinematic slow orbit until the user grabs the scene.
    const oc = g.controls();
    oc.autoRotate = true; oc.autoRotateSpeed = 0.55;
    oc.addEventListener("start", () => { oc.autoRotate = false; BRAIN.grabbed = true; });
  } catch (e) { /* controls unavailable */ }
  window.addEventListener("resize", () => { if (!brainEl().hidden && BRAIN.graph) BRAIN.graph.width(el.clientWidth).height(el.clientHeight); });
  return g;
}

function focusNode(n, ms) {
  const g = BRAIN.graph; if (!g || !n) return;
  const d = Math.hypot(n.x || 0, n.y || 0, n.z || 0) || 1;
  const ratio = 1 + 75 / d;
  g.cameraPosition({ x: (n.x || 0) * ratio, y: (n.y || 0) * ratio, z: (n.z || 0) * ratio }, n, ms || 900);
}

function onNodeActivate(n) {
  if (!n) return;
  const now = Date.now();
  if (BRAIN.lastClick && BRAIN.lastClick.n === n && now - BRAIN.lastClick.t < 400) return; // dedupe
  BRAIN.lastClick = { n, t: now };
  if (n.type === "mem") { openDrawer(n.drawer); return; }
  focusNode(n, 800);
  if (n.type === "room") openHiveRoot({ kind: "room", wing: n.wing, room: n.room });
  else if (n.type === "wing") openHiveRoot({ kind: "wing", wing: n.wing });
  else if (n.type === "tunnel") openHiveRoot({ kind: "tunnel", room: n.troom });
}

function buildLOD() {
  const g = ensureGraph(); if (!g) return;
  BRAIN.buildId++;
  const myBuild = BRAIN.buildId;
  const nodes = [], links = [], roomNode = {};
  data.overview.wings.forEach((w) => {
    nodes.push({ id: "w:" + w.id, type: "wing", wing: w.id, color: wingColor(w.id), val: 6 + Math.min(11, Math.log2(w.drawers + 1)) });
    w.rooms.forEach((r) => {
      const rid = "r:" + w.id + "::" + r.id; roomNode[w.id + "::" + r.id] = rid;
      nodes.push({ id: rid, type: "room", wing: w.id, room: r.id, count: r.count, color: wingColor(w.id), val: 2 + Math.min(4, Math.log2(r.count + 1) * 0.4) });
      links.push({ source: "w:" + w.id, target: rid });
    });
  });
  data.overview.tunnels.forEach((tu) => {
    const hub = "t:" + tu.room;
    nodes.push({ id: hub, type: "tunnel", troom: tu.room, color: "#79c3d8", val: 2.5 });
    tu.wings.forEach((wid) => { const rid = roomNode[wid + "::" + tu.room]; if (rid) links.push({ source: hub, target: rid, tunnel: true }); });
  });
  g.nodeResolution(16).nodeRelSize(3.5).cooldownTicks(180);
  BRAIN.grabbed = false;
  g.onEngineStop(() => {});
  g.graphData({ nodes, links });
  // Closed-loop framing: instead of blind timers we measure the layout's
  // actual spread and only frame the camera once physics has expanded it.
  // This also covers hidden tabs — browsers freeze rAF (and therefore the
  // force engine) while the tab is not visible, so we keep polling gently
  // and the frame happens whenever the user actually looks at the page.
  // Stops when the user grabs the scene or the build goes stale.
  const spread = () => { let mx = 0; g.graphData().nodes.forEach((n) => { const d = Math.hypot(n.x || 0, n.y || 0, n.z || 0); if (d > mx) mx = d; }); return mx; };
  const stale = () => BRAIN.buildId !== myBuild || BRAIN.mode !== "lod" || BRAIN.grabbed || brainEl().hidden;
  function frame() {
    if (stale()) return;
    if (spread() < 80) {
      if (document.visibilityState === "visible") {
        try { g.d3ReheatSimulation(); } catch (e) { /* engine unavailable */ }
      }
      setTimeout(frame, 900);
      return;
    }
    g.zoomToFit(700, 100);
    setTimeout(() => { if (!stale()) g.zoomToFit(500, 100); }, 1800);
  }
  setTimeout(frame, 1200);
  refreshVisualState(1200);
}

function buildFull() {
  const g = ensureGraph(); if (!g) return;
  BRAIN.buildId++;
  const render = (all) => {
    const wings = data.overview.wings.map((w) => w.id), n = wings.length, R = 210;
    BRAIN.centroid = {};
    wings.forEach((wid, i) => {
      const phi = Math.acos(1 - 2 * (i + 0.5) / n), theta = Math.PI * (1 + Math.sqrt(5)) * i;
      // Ellipsoid layout — wider than tall, like a brain silhouette.
      BRAIN.centroid[wid] = { x: 1.28 * R * Math.sin(phi) * Math.cos(theta), y: 0.72 * R * Math.sin(phi) * Math.sin(theta), z: R * Math.cos(phi) };
    });
    function roomOff(wid, room) {
      const s = wid + "|" + room; let h = 2166136261;
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
      const a = (h >>> 0) / 4294967295 * 6.283, b = ((h >>> 9) & 1023) / 1023 * 3.1416, r = 70;
      return { x: r * Math.sin(b) * Math.cos(a), y: r * Math.sin(b) * Math.sin(a), z: r * Math.cos(b) };
    }
    // Cloud size grows with room population (∝ cbrt) so dense rooms spread
    // into soft nebulae instead of blowing out to a white core.
    const roomCount = {};
    all.forEach((nd) => { const k = nd.w + "|" + nd.r; roomCount[k] = (roomCount[k] || 0) + 1; });
    const nodes = all.map((nd) => {
      const c = BRAIN.centroid[nd.w] || { x: 0, y: 0, z: 0 }, o = roomOff(nd.w, nd.r);
      const j = 24 + 7 * Math.cbrt(roomCount[nd.w + "|" + nd.r] || 1);
      // Spherical scatter (not cubic) → organic, nucleus-like clouds.
      const th = 6.2832 * Math.random(), ph = Math.acos(2 * Math.random() - 1), rr = j * Math.cbrt(Math.random());
      const x = c.x + o.x + rr * Math.sin(ph) * Math.cos(th), y = c.y + o.y + rr * Math.sin(ph) * Math.sin(th), z = c.z + o.z + rr * Math.cos(ph);
      return { id: nd.i, type: "mem", drawer: nd.i, wing: nd.w, room: nd.r, color: wingColor(nd.w), val: 1.4, x, y, z, fx: x, fy: y, fz: z };
    });
    g.nodeResolution(6).nodeRelSize(2.6).cooldownTicks(0);
    g.onEngineStop(() => {}); // full mode positions are pinned; no auto-fit
    g.graphData({ nodes, links: [] });
    hideBrainLoading();
    refreshVisualState(600);
    // The library sets its initial camera a few frames later; re-assert it twice.
    const setCam = (ms) => g.cameraPosition({ x: 0, y: 80, z: 760 }, { x: 0, y: 0, z: 0 }, ms || 0);
    setTimeout(() => setCam(0), 350);
    setTimeout(() => setCam(700), 950);
  };
  showBrainLoading(t("brainLoadingFull"));
  if (BRAIN.nodesCache) setTimeout(() => render(BRAIN.nodesCache), 30);
  else api("/api/nodes").then((all) => { BRAIN.nodesCache = all; render(all); }).catch(hideBrainLoading);
}

function buildBrainLegend() {
  if (!data.overview) return;
  const el = document.getElementById("brainLegend");
  el.innerHTML = '<div class="lg-title">' + esc(t("legendTitle")) + '</div>' +
    data.overview.wings.map((w) =>
      '<button data-wing="' + esc(w.id) + '"><span class="lg-dot" style="background:' + wingColor(w.id) + ';color:' + wingColor(w.id) + '"></span>' + esc(wname(w.id)) + '</button>'
    ).join("");
  el.querySelectorAll("button[data-wing]").forEach((b) => {
    b.addEventListener("click", () => focusWing(b.getAttribute("data-wing")));
  });
}

function focusWing(id) {
  const g = BRAIN.graph; if (!g) return;
  if (BRAIN.mode === "lod") { const n = g.graphData().nodes.find((x) => x.id === "w:" + id); if (n) focusNode(n); }
  else { const c = BRAIN.centroid[id]; if (c) focusNode({ x: c.x, y: c.y, z: c.z }, 1000); }
}

function buildBrain() { if (BRAIN.mode === "full") buildFull(); else buildLOD(); }

function switchBmode(m) {
  if (m === BRAIN.mode) return;
  document.querySelectorAll(".bmode").forEach((x) => x.classList.toggle("on", x.getAttribute("data-bmode") === m));
  BRAIN.mode = m; buildBrain();
}

/* ---- search inside the brain ---------------------------------------------
   Lights up matching neurons instead of listing them. Word mode → exact
   text match (instant); Meaning mode → top neurons by affinity. */
export function brainSearch(q, mode) {
  q = (q || "").trim();
  if (q.length < 2) { BRAIN.highlight = null; updateMatchLabel(-1); applyHighlight(); return; }
  const url = mode === "semantic"
    ? "/api/search?mode=semantic&limit=40&q=" + encodeURIComponent(q)
    : "/api/match?q=" + encodeURIComponent(q);
  if (mode === "semantic") { const el = document.getElementById("brainMatch"); el.hidden = false; el.textContent = t("brainSearching"); }
  api(url).then((res) => {
    const lantern = document.getElementById("lantern");
    if ((lantern.value || "").trim() !== q) return; // stale query
    const ids = mode === "semantic"
      ? (res.results || []).map((r) => r.id).filter((x) => x != null)
      : res;
    BRAIN.highlight = new Set(ids);
    updateMatchLabel(ids.length);
    // Individual neurons only exist in Full mode → switch there so they can glow.
    if (BRAIN.mode !== "full") switchBmode("full");
    else applyHighlight();
  }).catch(() => updateMatchLabel(-1));
}

/* ---- open / close --------------------------------------------------------- */
export function openBrain() {
  if (!data.overview) return;
  brainEl().hidden = false; document.body.classList.add("in-brain"); state.brain = true;
  emit("brain-view");
  BRAIN.highlight = null; updateMatchLabel(-1);
  document.getElementById("brainFail").hidden = true;
  const g = ensureGraph();
  if (!g) { const f = document.getElementById("brainFail"); f.textContent = t("brainFail"); f.hidden = false; return; }
  const el = document.getElementById("brainGraph");
  g.width(el.clientWidth).height(el.clientHeight);
  buildBrainLegend();
  buildBrain();
  startPulse();
}

export function closeBrain() {
  brainEl().hidden = true; document.body.classList.remove("in-brain"); state.brain = false;
  BRAIN.highlight = null; updateMatchLabel(-1);
  stopPulse(); closeHive();
  emit("brain-view");
}

/* Refresh the brain's translatable chrome (density labels, hint, legend). */
export function applyBrainI18n() {
  document.querySelectorAll(".bmode").forEach((b) => { b.textContent = b.getAttribute("data-bmode") === "full" ? t("brainFull") : t("brainDetail"); });
  const bh = document.getElementById("brainHint"); if (bh) bh.textContent = t("brainHint");
  if (state.brain && BRAIN.highlight) updateMatchLabel(BRAIN.highlight.size);
  if (data.overview && !brainEl().hidden) buildBrainLegend();
}

export function initBrain() {
  document.querySelectorAll(".bmode").forEach((b) => {
    b.addEventListener("click", () => switchBmode(b.getAttribute("data-bmode")));
  });
}
