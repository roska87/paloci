/* Atrium — the palace's landing view (hero, wing doors, passages), the wing
   page with its pull-out drawers, breadcrumbs and the floor-plan minimap. */

import { state, data, emit } from "./store.js";
import { t, wname, wblurb, klabel, rname } from "./i18n.js";
import { esc, fmt, fdate, api } from "./util.js";
import { kc } from "./palette.js";
import { openDrawer } from "./reader.js";

const view = () => document.getElementById("view");

export function renderAtrium() {
  const o = data.overview;
  const s = o.stats;
  const doors = o.wings.map((w, i) => {
    const pct = Math.max(6, Math.round(Math.sqrt(w.drawers / data.maxDrawers) * 100));
    return '<button class="door stagger" style="--kc:' + kc(w.kind) + ';animation-delay:' + (i * 45) + 'ms" data-wing="' + esc(w.id) + '">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">' +
        '<span class="seal">' + esc(w.seal) + '</span><span class="kind">' + esc(klabel(w.kind)) + '</span></div>' +
      '<h3>' + esc(wname(w.id)) + '</h3><p>' + esc(wblurb(w.id)) + '</p>' +
      '<div class="meter"><i style="width:' + pct + '%"></i></div>' +
      '<div class="foot"><span>' + w.rooms.length + ' ' + t("roomsWord") + '</span><span><b>' + fmt(w.drawers) + '</b> ' + t("memoriesWord") + '</span></div>' +
    '</button>';
  }).join("");
  const tunnels = o.tunnels.map((tu) => {
    const chips = tu.wings.map((id) => '<button data-wing="' + esc(id) + '">' + esc(wname(id)) + '</button>').join("");
    return '<div class="tunnel"><div class="tn"><span class="dot"></span>' + esc(rname(tu.room)) + '</div>' +
      '<div class="thread">' + chips + '</div>' +
      '<div class="tcount"><b>' + fmt(tu.count) + '</b> · ' + tu.wings.length + ' ' + t("wingsWord") + '</div></div>';
  }).join("");

  const v = view();
  v.className = "enter";
  v.innerHTML =
    '<section class="hero"><div class="floor"></div><div class="hero-inner">' +
      '<div class="eyebrow">' + esc(t("heroEyebrow")) + '</div>' +
      '<h1>' + t("heroTitle") + '</h1>' +
      '<p class="sub">' + esc(t("heroSub")) + '</p>' +
      '<div class="stats">' +
        '<div class="stat"><b>' + fmt(s.drawers) + '</b><span>' + esc(t("statMemories")) + '</span></div>' +
        '<div class="stat"><b>' + s.wings + '</b><span>' + esc(t("statWings")) + '</span></div>' +
        '<div class="stat"><b>' + s.rooms + '</b><span>' + esc(t("statRooms")) + '</span></div>' +
        '<div class="stat"><b>' + s.tunnels + '</b><span>' + esc(t("statPassages")) + '</span></div>' +
      '</div></div></section>' +
    '<div class="section-head"><h2>' + esc(t("wingsHead")) + '</h2><div class="rule"></div><div class="note">' + esc(t("wingsNote")) + '</div></div>' +
    '<div class="doors">' + doors + '</div>' +
    '<div class="section-head"><h2>' + esc(t("passagesHead")) + '</h2><div class="rule"></div><div class="note">' + esc(t("passagesNote")) + '</div></div>' +
    '<div class="tunnels">' + tunnels + '</div>';
  bindWings();
  emit("atrium-rendered"); // → search re-applies the lantern filter
}

function renderWing(w) {
  const drawersHtml = w.rooms.map((r) => {
    const cards = (r.drawers || []).map((d) =>
      '<button class="card" data-drawer="' + d.id + '">' +
        (d.filed_at ? '<div class="cdate">' + esc(fdate(d.filed_at)) + '</div>' : '') +
        '<p>' + esc(d.preview || t("noText")) + '</p></button>'
    ).join("");
    const shown = (r.drawers || []).length;
    const extra = r.count > shown
      ? '<div class="empty-note">' + esc(t("showingRecent", { shown, total: fmt(r.count) })) + '</div>'
      : (shown === 0 ? '<div class="empty-note">' + esc(t("roomHas", { n: fmt(r.count) })) + '</div>' : '');
    return '<div class="drawer" data-room="' + esc(r.id) + '">' +
      '<button class="drawer-face"><span class="pull"></span>' +
        '<span class="rname">' + esc(rname(r.id)) + '</span>' +
        '<span class="rcount"><b>' + fmt(r.count) + '</b> ' + esc(t("memAbbr")) + '</span>' +
        '<span class="chev">▸</span></button>' +
      '<div class="drawer-body"><div><div class="cards">' + cards + '</div>' + extra + '</div></div></div>';
  }).join("");

  const v = view();
  v.className = "enter";
  v.innerHTML =
    '<button class="backbtn" id="back">' + esc(t("backAtrium")) + '</button>' +
    '<div class="wing-head" style="--kc:' + kc(w.kind) + '">' +
      '<div class="bigseal">' + esc(w.seal) + '</div>' +
      '<div class="wh-body"><div class="kind">' + esc(klabel(w.kind)) + '</div><h2>' + esc(wname(w.id)) + '</h2>' +
        '<p>' + esc(wblurb(w.id)) + '</p>' +
        '<div class="whstats"><div><b>' + fmt(w.drawers) + '</b><span>' + esc(t("statMemories")) + '</span></div>' +
          '<div><b>' + w.rooms.length + '</b><span>' + esc(t("statRooms")) + '</span></div></div></div></div>' +
    '<div class="section-head"><h2>' + esc(t("drawersHead")) + '</h2><div class="rule"></div><div class="note">' + esc(t("drawersNote")) + '</div></div>' +
    '<div class="cabinet">' + drawersHtml + '</div>';

  v.querySelector("#back").addEventListener("click", goAtrium);
  v.querySelectorAll(".drawer").forEach((d) => {
    d.querySelector(".drawer-face").addEventListener("click", () => {
      const was = d.classList.contains("open");
      v.querySelectorAll(".drawer.open").forEach((o) => o.classList.remove("open"));
      if (!was) d.classList.add("open");
    });
  });
  v.querySelectorAll(".card[data-drawer]").forEach((c) => {
    c.addEventListener("click", () => openDrawer(c.getAttribute("data-drawer")));
  });
  const first = v.querySelector(".drawer");
  if (first) first.classList.add("open");
}

export function renderCrumbs() {
  // The Paloci wordmark is "home"; the breadcrumb only shows the current location.
  let html = "";
  if (state.where === "wing" && state.wing) {
    html = '<span class="crumb-sep">›</span><button class="crumb active">' + esc(wname(state.wing)) + '</button>';
  } else if (state.where === "search") {
    html = '<span class="crumb-sep">›</span><button class="crumb active">' + esc(t("crumbSearch")) + '</button>';
  }
  document.getElementById("crumbs").innerHTML = html;
}

export function goAtrium() {
  state.where = "atrium"; state.wing = null;
  renderAtrium(); renderCrumbs(); markMinimap(null);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function enterWing(id) {
  const v = view();
  v.className = ""; v.innerHTML = '<div class="loading"><div class="spinner"></div>' + esc(t("openingWing")) + '</div>';
  state.where = "wing"; state.wing = id; renderCrumbs(); markMinimap(id);
  window.scrollTo({ top: 0, behavior: "smooth" });
  api("/api/wing?id=" + encodeURIComponent(id)).then((w) => {
    if (data.wingsById[id]) data.wingsById[id].rooms = w.rooms.map((r) => ({ id: r.id, count: r.count }));
    renderWing(w);
  }).catch(() => { v.innerHTML = '<div class="loading">' + esc(t("wingError")) + '</div>'; });
}

function bindWings() {
  view().querySelectorAll("[data-wing]").forEach((el) => {
    el.addEventListener("click", () => enterWing(el.getAttribute("data-wing")));
  });
}

export function buildMinimap() {
  const mm = document.getElementById("minimap"); mm.hidden = false;
  const grid = document.getElementById("mmGrid");
  grid.innerHTML = data.overview.wings.map((w) => {
    const wgt = Math.max(10, Math.round(Math.sqrt(w.drawers / data.maxDrawers) * 80));
    return '<button class="mm-cell" data-wing="' + esc(w.id) + '" style="--w:' + wgt + '" title="' +
      esc(wname(w.id)) + ' · ' + fmt(w.drawers) + ' ' + esc(t("memoriesWord")) + '"><span>' + esc(w.seal) + '</span></button>';
  }).join("");
  grid.querySelectorAll(".mm-cell").forEach((c) => {
    c.addEventListener("click", () => enterWing(c.getAttribute("data-wing")));
  });
  document.getElementById("mmToggle").addEventListener("click", function () {
    mm.classList.toggle("collapsed");
    this.textContent = mm.classList.contains("collapsed") ? "▸" : "▾";
  });
}

function markMinimap(id) {
  document.querySelectorAll(".mm-cell").forEach((c) => {
    c.classList.toggle("here", c.getAttribute("data-wing") === id);
  });
}
