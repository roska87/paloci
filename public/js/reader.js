/* Reader — the modal that shows a memory's full text. Opened from the
   atrium cards, search results, brain neurons and hive cells. */

import { t, wname, rname } from "./i18n.js";
import { api } from "./util.js";

const scrim = () => document.getElementById("scrim");

function firstLine(x) {
  if (!x) return t("memoryFallback");
  let l = String(x).split("\n").find((y) => y.trim().length > 0) || "";
  l = l.trim();
  return l.length > 90 ? l.slice(0, 90) + "…" : l;
}

export function openDrawer(id) {
  document.getElementById("rdTag").textContent = t("loadingReader");
  document.getElementById("rdTitle").textContent = "";
  document.getElementById("rdMeta").textContent = "";
  document.getElementById("rdDoc").textContent = "";
  scrim().classList.add("on");
  api("/api/drawer?id=" + encodeURIComponent(id)).then((d) => {
    document.getElementById("rdTag").textContent = (d.wing ? wname(d.wing) : "") + (d.room ? " · " + rname(d.room) : "");
    document.getElementById("rdTitle").textContent = firstLine(d.text);
    const meta = [];
    if (d.filed_at) meta.push(t("filed") + " " + d.filed_at.slice(0, 19).replace("T", " "));
    if (d.added_by) meta.push(t("by") + " " + d.added_by);
    document.getElementById("rdMeta").textContent = meta.join("  ·  ");
    document.getElementById("rdDoc").textContent = d.text || t("noContent");
  }).catch(() => {
    document.getElementById("rdDoc").textContent = t("readerError");
    document.getElementById("rdTag").textContent = t("errorTag");
  });
}

// Opens the reader from data already in hand (semantic results without a
// resolved drawer id).
export function openReaderData(d) {
  if (!d) return;
  document.getElementById("rdTag").textContent = (d.wing ? wname(d.wing) : "") + (d.room ? " · " + rname(d.room) : "");
  document.getElementById("rdTitle").textContent = firstLine(d.text || d.preview);
  document.getElementById("rdMeta").textContent =
    (d.cosine != null ? t("affinity") + " " + Math.round(d.cosine * 100) + "%" : "") +
    (d.filed_at ? "  ·  " + d.filed_at.slice(0, 10) : "");
  document.getElementById("rdDoc").textContent = d.text || d.preview || t("noContent");
  scrim().classList.add("on");
}

export function closeReader() { scrim().classList.remove("on"); }
export function isReaderOpen() { return scrim().classList.contains("on"); }

export function initReader() {
  document.getElementById("rdClose").addEventListener("click", closeReader);
  scrim().addEventListener("click", (e) => { if (e.target === scrim()) closeReader(); });
}
