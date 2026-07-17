/* Search — the lantern. In the atrium it filters doors as you type and
   renders word/meaning results as a page; in the Brain it lights up the
   matching neurons instead (delegated to brain.brainSearch). */

import { state, data, on } from "./store.js";
import { t, wname, wblurb, klabel, rname } from "./i18n.js";
import { esc, fmt, fdate, api } from "./util.js";
import { goAtrium, renderCrumbs } from "./atrium.js";
import { openDrawer, openReaderData } from "./reader.js";
import { brainSearch } from "./brain.js";

let searchTimer, lastQ = "", searchMode = "text", curResults = [];
const view = () => document.getElementById("view");
const lantern = () => document.getElementById("lantern");

export function setLanternPlaceholder() {
  lantern().placeholder = state.brain
    ? (searchMode === "semantic" ? t("brainSearchPlaceholderSem") : t("brainSearchPlaceholder"))
    : (searchMode === "semantic" ? t("searchPlaceholderSem") : t("searchPlaceholder"));
}

function headHtml(sub) {
  return '<button class="backbtn" id="back">' + esc(t("backAtrium")) + '</button>' +
    '<div class="section-head"><h2>' + esc(t("searchHead")) + '</h2><div class="rule"></div><div class="note">' + sub + '</div></div>';
}
function bindBack() { const b = view().querySelector("#back"); if (b) b.addEventListener("click", goAtrium); }

function showSearchLoading(q) {
  const v = view();
  v.className = ""; state.where = "search"; renderCrumbs();
  v.innerHTML = headHtml(esc(t("searchingSem"))) +
    '<div class="search-note">' + esc(t("searchNote", { q })) + '</div>' +
    '<div class="loading"><div class="spinner"></div>' + esc(t("interrogating")) + '</div>';
  bindBack();
}

function renderError(q, msg) {
  const v = view();
  v.className = "enter"; state.where = "search"; renderCrumbs();
  v.innerHTML = headHtml("«" + esc(q) + "»") + '<div class="empty-note" style="padding:20px 0">' + esc(msg) + '</div>';
  bindBack();
}

function renderResults(q, items, mode) {
  curResults = items || [];
  const v = view();
  v.className = "enter"; state.where = "search";
  const sub = mode === "semantic"
    ? esc(t("resSemantic", { n: curResults.length, q }))
    : esc(t("resText", { n: curResults.length, q }));
  const head = headHtml(sub);
  if (!curResults.length) {
    const none = mode === "semantic" ? t("noneSemantic") : t("noneText");
    v.innerHTML = head + '<div class="empty-note" style="padding:20px 0">' + esc(none) + '</div>';
  } else {
    const rows = curResults.map((r, i) => {
      const right = (mode === "semantic" && r.cosine != null)
        ? '<span class="r-afin">' + esc(t("affinity")) + ' <b>' + Math.round(r.cosine * 100) + '%</b></span>'
        : '<span class="r-date">' + esc(fdate(r.filed_at)) + '</span>';
      return '<button class="result" data-i="' + i + '"><div class="r-top">' +
        '<span class="r-wing">' + esc(wname(r.wing)) + '</span>' +
        '<span class="r-room">' + esc(rname(r.room)) + '</span>' + right + '</div>' +
        '<p>' + esc(r.preview) + '</p></button>';
    }).join("");
    v.innerHTML = head + '<div class="results">' + rows + '</div>';
  }
  bindBack();
  v.querySelectorAll(".result[data-i]").forEach((c) => {
    c.addEventListener("click", () => {
      const r = curResults[+c.getAttribute("data-i")];
      if (r && r.id != null) openDrawer(r.id); else openReaderData(r);
    });
  });
  renderCrumbs();
}

function doSearch(q, mode) {
  if (mode === "semantic") showSearchLoading(q);
  api("/api/search?mode=" + mode + "&q=" + encodeURIComponent(q)).then((resp) => {
    if (q !== lastQ) return;
    if (resp && resp.error) renderError(q, t(resp.error));
    else renderResults(q, (resp && resp.results) || [], mode);
  }).catch(() => { if (q === lastQ) renderError(q, t("searchFailed")); });
}

function fireSearch() {
  const q = (lantern().value || "").trim();
  if (state.brain) {
    clearTimeout(searchTimer);
    if (q.length < 2) { brainSearch("", searchMode); return; }
    if (searchMode === "semantic") return; // meaning search fires on Enter (it's slow)
    searchTimer = setTimeout(() => brainSearch(q, searchMode), 220);
    return;
  }
  lastQ = q;
  clearTimeout(searchTimer);
  if (q.length < 2) { if (state.where === "search") goAtrium(); applyLantern(); return; }
  const wait = searchMode === "semantic" ? 700 : 260;
  searchTimer = setTimeout(() => doSearch(q, searchMode), wait);
}

/* Dim the atrium doors that don't match the query (live filter). */
export function applyLantern() {
  if (state.where !== "atrium") return;
  const q = (lantern().value || "").trim().toLowerCase();
  view().querySelectorAll(".door").forEach((d) => {
    const w = data.wingsById[d.getAttribute("data-wing")];
    if (!w) return;
    const hay = (wname(w.id) + " " + wblurb(w.id) + " " + klabel(w.kind) + " " + w.rooms.map((r) => rname(r.id)).join(" ")).toLowerCase();
    d.classList.toggle("dim", q.length > 0 && hay.indexOf(q) === -1);
  });
}

/* Re-run the current search (used after a language switch). */
export function refreshAfterLangChange() {
  const q = (lantern().value || "").trim();
  if (q.length >= 2) { lastQ = q; doSearch(q, searchMode); } else goAtrium();
}

/* Translatable chrome owned by the search: placeholder + mode labels. */
export function applySearchI18n() {
  setLanternPlaceholder();
  document.querySelectorAll(".lmode[data-mode]").forEach((b) => {
    b.textContent = b.getAttribute("data-mode") === "semantic" ? t("modeMeaning") : t("modeWord");
  });
}

export function initSearch() {
  lantern().addEventListener("input", fireSearch);
  lantern().addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const q = (lantern().value || "").trim();
    if (state.brain) { clearTimeout(searchTimer); brainSearch(q, searchMode); return; }
    if (q.length >= 2) { clearTimeout(searchTimer); lastQ = q; doSearch(q, searchMode); }
  });
  document.querySelectorAll(".lmode[data-mode]").forEach((b) => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".lmode[data-mode]").forEach((x) => x.classList.remove("on"));
      b.classList.add("on"); searchMode = b.getAttribute("data-mode");
      setLanternPlaceholder();
      if ((lantern().value || "").trim().length >= 2) fireSearch();
    });
  });
  on("atrium-rendered", applyLantern);
  on("brain-view", setLanternPlaceholder);
}
