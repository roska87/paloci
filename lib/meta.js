"use strict";

/*
 * Structural metadata for the wings — only a seal (monogram) and a category
 * (key). Every wing works without an entry here: Paloci derives a seal from
 * the wing's id and defaults the kind to "wing". Add entries to curate your
 * own palace, e.g.:
 *
 *   const WING_META = {
 *     sessions:  { seal: "S",  kind: "log" },
 *     my_notes:  { seal: "N",  kind: "journal" }
 *   };
 *
 * kind ∈ log | project | journal | personal | wing (fallback), and only
 * affects the accent color/label. The visible NAMES and descriptions are
 * translated in the frontend (public/js/i18n.js).
 */

const WING_META = {};

function wingMeta(id) {
  if (WING_META[id]) return WING_META[id];
  const clean = id.replace(/^wing_/, "").replace(/[_-]+/g, " ");
  const seal = clean.split(" ").map((w) => w[0] || "").join("").slice(0, 2).toUpperCase() || "?";
  return { seal, kind: "wing" };
}

module.exports = { wingMeta };
