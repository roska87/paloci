/* Color assignments — kind accents for the atrium and the luminous
   per-wing palette shared by the Brain view and the Hive. */

import { data } from "./store.js";

const KIND_COLOR = { project: "var(--gold)", log: "#c9a1e0", journal: "var(--aqua)", personal: "#e0a07a", wing: "var(--gold)" };

export function kc(kind) { return KIND_COLOR[kind] || "var(--gold)"; }

const BRAIN_PALETTE = ["#f2c368","#7fd7ef","#d9aef2","#f2b087","#a5e094","#98c2f2","#f298b8","#f2d565","#77dfc9","#c2aaf5","#e8d193","#93e0ef"];
const WING_COLORS = {};

export function wingColor(id) {
  if (WING_COLORS[id]) return WING_COLORS[id];
  const idx = data.overview ? data.overview.wings.findIndex((w) => w.id === id) : -1;
  const c = BRAIN_PALETTE[(idx < 0 ? 0 : idx) % BRAIN_PALETTE.length];
  WING_COLORS[id] = c;
  return c;
}
