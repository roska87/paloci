/* Hive — the honeycomb panel opened from the Brain's group nodes.
   A wing shows its rooms as hex cells, a room its most recent memories,
   a passage the wings that share it. Drill down with a small view stack. */

import { data } from "./store.js";
import { t, wname, klabel, rname } from "./i18n.js";
import { esc, fmt, fdate, api } from "./util.js";
import { wingColor } from "./palette.js";
import { openDrawer } from "./reader.js";

let hiveStack = [];
const hiveEl = () => document.getElementById("hive");

function hivePerRow() { return Math.max(2, Math.floor((Math.min(window.innerWidth * 0.92, 930) - 56) / 194)); }

function hiveRowsHtml(cells) {
  const per = hivePerRow(), rows = [];
  let i = 0, alt = 0;
  while (i < cells.length) {
    const take = Math.max(1, per - (alt % 2)); // alternate N / N-1 → interlocking honeycomb
    rows.push('<div class="hive-row">' + cells.slice(i, i + take).join("") + '</div>');
    i += take; alt++;
  }
  return rows.join("");
}

function hexCellMem(d, color) {
  return '<button class="hex" style="--hx:' + color + '" data-drawer="' + d.id + '">' +
    (d.filed_at ? '<div class="hx-date">' + esc(fdate(d.filed_at)) + '</div>' : '') +
    '<p>' + esc(d.preview || t("noText")) + '</p></button>';
}

function hexCellGroup(name, count, color, attrs) {
  return '<button class="hex hex-group" style="--hx:' + color + '" ' + attrs + '>' +
    '<div class="hx-name">' + esc(name) + '</div>' +
    '<div class="hx-count">' + fmt(count) + ' ' + esc(t("memAbbr")) + '</div></button>';
}

function showHive(view) {
  const hv = hiveEl(); hv.__view = view; hv.hidden = false;
  document.getElementById("hiveBack").hidden = hiveStack.length === 0;
  const tag = document.getElementById("hiveTag"), title = document.getElementById("hiveTitle"),
        meta = document.getElementById("hiveMeta"), body = document.getElementById("hiveBody");

  if (view.kind === "wing") {
    const w = data.wingsById[view.wing]; if (!w) return;
    tag.textContent = klabel(w.kind); title.textContent = wname(view.wing);
    meta.textContent = fmt(w.drawers) + " " + t("memoriesWord") + " · " + w.rooms.length + " " + t("roomsWord");
    body.innerHTML = hiveRowsHtml(w.rooms.map((r) =>
      hexCellGroup(rname(r.id), r.count, wingColor(view.wing), 'data-room="' + esc(r.id) + '"')
    ));
    body.querySelectorAll(".hex[data-room]").forEach((h) => {
      h.addEventListener("click", () => { hiveStack.push(view); showHive({ kind: "room", wing: view.wing, room: h.getAttribute("data-room") }); });
    });
  } else if (view.kind === "tunnel") {
    const tu = (data.overview.tunnels || []).find((x) => x.room === view.room); if (!tu) return;
    tag.textContent = t("passageLabel"); title.textContent = rname(view.room);
    meta.textContent = fmt(tu.count) + " " + t("memoriesWord") + " · " + tu.wings.length + " " + t("wingsWord");
    body.innerHTML = hiveRowsHtml(tu.wings.map((wid) => {
      const w = data.wingsById[wid];
      const rc = ((w && w.rooms.find((r) => r.id === view.room)) || {}).count || 0;
      return hexCellGroup(wname(wid), rc, wingColor(wid), 'data-wing="' + esc(wid) + '"');
    }));
    body.querySelectorAll(".hex[data-wing]").forEach((h) => {
      h.addEventListener("click", () => { hiveStack.push(view); showHive({ kind: "room", wing: h.getAttribute("data-wing"), room: view.room }); });
    });
  } else { // room → its memories as honeycomb cells
    tag.textContent = wname(view.wing); title.textContent = rname(view.room);
    meta.textContent = ""; body.innerHTML = '<div class="hive-loading"><div class="spinner"></div></div>';
    api("/api/wing?id=" + encodeURIComponent(view.wing)).then((w) => {
      if (hv.hidden || hv.__view !== view) return;
      const room = (w.rooms || []).find((r) => r.id === view.room); if (!room) { body.innerHTML = ""; return; }
      const mems = (room.drawers || []).slice(0, 42);
      meta.textContent = mems.length < room.count
        ? t("showingRecent", { shown: mems.length, total: fmt(room.count) })
        : fmt(room.count) + " " + t("memoriesWord");
      body.innerHTML = hiveRowsHtml(mems.map((d) => hexCellMem(d, wingColor(view.wing))));
      body.querySelectorAll(".hex[data-drawer]").forEach((h) => {
        h.addEventListener("click", () => openDrawer(h.getAttribute("data-drawer")));
      });
    }).catch(() => { body.innerHTML = ""; });
  }
}

export function openHiveRoot(view) { hiveStack = []; showHive(view); }
export function closeHive() { const hv = hiveEl(); hv.hidden = true; hv.__view = null; hiveStack = []; }
export function hiveBackPop() { const prev = hiveStack.pop(); if (prev) showHive(prev); else closeHive(); }
export function isHiveOpen() { return !hiveEl().hidden; }

export function initHive() {
  document.getElementById("hiveClose").addEventListener("click", closeHive);
  document.getElementById("hiveBack").addEventListener("click", hiveBackPop);
  hiveEl().addEventListener("click", (e) => { if (e.target === hiveEl()) closeHive(); });
}
