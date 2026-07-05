/* Composition root — boots the app and wires the modules together.
   All cross-cutting chrome (brand, view tabs, language buttons, the Escape
   cascade) is bound here; each view module owns only its own concerns. */

import { state, setOverview } from "./store.js";
import { t, getLang, setLang } from "./i18n.js";
import { api } from "./util.js";
import { initReader, isReaderOpen, closeReader } from "./reader.js";
import { renderAtrium, renderCrumbs, goAtrium, enterWing, buildMinimap } from "./atrium.js";
import { initSearch, applySearchI18n, refreshAfterLangChange } from "./search.js";
import { initBrain, openBrain, closeBrain, applyBrainI18n } from "./brain.js";
import { initHive, isHiveOpen, hiveBackPop } from "./hive.js";
import { initTheme } from "./theme.js";
import { initMotes } from "./motes.js";

/* ---- static chrome (translatable texts outside the views) ---- */
function applyStatic() {
  document.title = t("docTitle");
  document.getElementById("mmTitle").textContent = t("floorPlan");
  document.getElementById("foothint").innerHTML = t("foot");
  const bm = document.getElementById("bootMsg"); if (bm) bm.textContent = t("bootMsg");
  document.querySelectorAll(".lmode[data-lang]").forEach((b) => {
    b.classList.toggle("on", b.getAttribute("data-lang") === getLang());
  });
  document.querySelectorAll(".vtab").forEach((b) => {
    b.textContent = b.getAttribute("data-view") === "brain" ? t("viewBrain") : t("viewAtrium");
  });
  applySearchI18n();
  applyBrainI18n();
}

/* ---- view switching (Atrium ⇄ Brain) ---- */
function setVtab(v) {
  document.querySelectorAll(".vtab").forEach((x) => x.classList.toggle("on", x.getAttribute("data-view") === v));
}

function wireChrome() {
  document.querySelectorAll(".vtab").forEach((b) => {
    b.addEventListener("click", () => {
      const v = b.getAttribute("data-view"); setVtab(v);
      if (v === "brain") openBrain(); else closeBrain();
    });
  });

  document.getElementById("brand").addEventListener("click", (e) => {
    e.preventDefault();
    closeBrain(); setVtab("atrium");
    if (state.where !== "atrium") goAtrium();
  });

  document.querySelectorAll(".lmode[data-lang]").forEach((b) => {
    b.addEventListener("click", () => {
      const l = b.getAttribute("data-lang"); if (l === getLang()) return;
      setLang(l); applyStatic();
      if (state.where === "wing" && state.wing) enterWing(state.wing);
      else if (state.where === "search") refreshAfterLangChange();
      else renderAtrium();
      renderCrumbs();
    });
  });

  // Escape cascade: reader → hive (one level back, then close).
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (isReaderOpen()) closeReader();
    else if (isHiveOpen()) hiveBackPop();
  });
}

/* ---- boot ---- */
setLang(getLang());
initTheme();
initMotes();
initReader();
initHive();
initBrain();
initSearch();
wireChrome();
applyStatic();

api("/api/overview").then((o) => {
  setOverview(o);
  buildMinimap();
  renderCrumbs();
  renderAtrium();
}).catch(() => {
  document.getElementById("view").innerHTML = '<div class="loading">' + t("connError") + '</div>';
});
