/*
 * i18n — dictionaries and translation helpers.
 * Default language = system locale (Spanish → es, anything else → en).
 * The choice persists in localStorage. Memory CONTENT is never translated,
 * only the interface.
 */

const I18N = {
  en: {
    ui: {
      searchPlaceholder:"Search your memories…", searchPlaceholderSem:"Search by meaning (Enter)…",
      modeWord:"Word", modeMeaning:"Meaning",
      docTitle:"Paloci — The Memory Palace",
      viewAtrium:"Atrium", viewBrain:"Brain", brainDetail:"Detail", brainFull:"Full",
      brainHint:"drag to orbit · scroll to zoom · click any node to open it",
      passageLabel:"Passage",
      brainSearchPlaceholder:"Light up neurons…", brainSearchPlaceholderSem:"Light up by meaning (Enter)…",
      matchCount:"🔦 {n} lit up", brainSearching:"🔦 searching…",
      brainLoadingFull:"Lighting ~13,600 neurons… (the heaviest mode)",
      brainFail:"Couldn't load the 3D view. Check that the vendored library exists in /vendor.",
      legendTitle:"Lobes",
      crumbPalace:"Palace", crumbSearch:"Search",
      heroEyebrow:"Memory Palace", heroTitle:"Wander what<br>you remember",
      heroSub:"Each wing is a world; each drawer, a memory you left behind.",
      statMemories:"Memories", statWings:"Wings", statRooms:"Rooms", statPassages:"Passages",
      wingsHead:"The Wings", wingsNote:"Choose a door",
      passagesHead:"Passages", passagesNote:"Rooms shared across wings",
      roomsWord:"rooms", memoriesWord:"memories", wingsWord:"wings",
      drawersHead:"Drawers", drawersNote:"Pull a drawer to open it", backAtrium:"← Back to the atrium",
      memAbbr:"mem.", showingRecent:"Showing the {shown} most recent of {total} · use search for the rest.",
      roomHas:"{n} memories in this room.", noText:"(no text)",
      searchHead:"Search", resSemantic:"{n} memories akin to «{q}»", resText:"{n} memories containing «{q}»",
      noneSemantic:"No similar memories found. Try other words.",
      noneText:"No memory contains those words. Try «Meaning».",
      searchingSem:"searching by meaning…",
      searchNote:"Looking for memories akin to «{q}». The first query lights the oracle, it may take a few seconds…",
      interrogating:"Questioning the memory…", searchFailed:"The search failed. Is the server still running?",
      affinity:"affinity", loadingReader:"Loading…", filed:"filed", by:"by",
      readerError:"Couldn't open this memory.", errorTag:"Error",
      noContent:"(no content)", memoryFallback:"Memory",
      openingWing:"Opening the wing…", wingError:"Couldn't open this wing.",
      bootMsg:"Lighting the palace candles…", connError:"Couldn't reach MemPalace.<br>Is the server running?",
      foot:'<b>Paloci</b> · a palace for your memory, read live from <span class="mono">MemPalace</span>',
      floorPlan:"Plan", genericBlurb:"Memories filed in this wing."
    },
    kinds:{ log:"Log", project:"Project", journal:"Journal", personal:"Personal", wing:"Wing" },
    // Per-wing display names and descriptions for YOUR palace. Empty by
    // default: unlisted wings get a readable name derived from their id and
    // no blurb. Add entries keyed by wing id, e.g.:
    //   my_notes:{ name:"My Notes", blurb:"What lives in this wing." }
    wings:{},
    // Room names are the user's own data, shown dynamically from their id
    // (e.g. "gap-analysis" → "Gap Analysis"). Empty by default; add an entry
    // only to override how a specific room id is displayed.
    rooms:{}
  },
  es: {
    ui: {
      searchPlaceholder:"Buscar en los recuerdos…", searchPlaceholderSem:"Buscar por significado (Enter)…",
      modeWord:"Palabra", modeMeaning:"Significado",
      docTitle:"Paloci — El Palacio de la Memoria",
      viewAtrium:"Atrio", viewBrain:"Cerebro", brainDetail:"Detalle", brainFull:"Completo",
      brainHint:"arrastrá para girar · rueda para zoom · clic en un nodo para abrirlo",
      passageLabel:"Pasadizo",
      brainSearchPlaceholder:"Iluminar neuronas…", brainSearchPlaceholderSem:"Iluminar por significado (Enter)…",
      matchCount:"🔦 {n} iluminadas", brainSearching:"🔦 buscando…",
      brainLoadingFull:"Encendiendo ~13.600 neuronas… (el modo más pesado)",
      brainFail:"No se pudo cargar la vista 3D. Verificá que la librería vendorizada esté en /vendor.",
      legendTitle:"Lóbulos",
      crumbPalace:"Palacio", crumbSearch:"Búsqueda",
      heroEyebrow:"Palacio de la Memoria", heroTitle:"Recorre lo que<br>recuerdas",
      heroSub:"Cada ala es un mundo; cada cajón, un recuerdo que dejaste guardado.",
      statMemories:"Recuerdos", statWings:"Alas", statRooms:"Salas", statPassages:"Pasadizos",
      wingsHead:"Las Alas", wingsNote:"Elige una puerta",
      passagesHead:"Pasadizos", passagesNote:"Salas compartidas entre alas",
      roomsWord:"salas", memoriesWord:"recuerdos", wingsWord:"alas",
      drawersHead:"Cajones", drawersNote:"Tira de un cajón para abrirlo", backAtrium:"← Volver al atrio",
      memAbbr:"rec.", showingRecent:"Mostrando los {shown} más recientes de {total} · usa el buscador para el resto.",
      roomHas:"{n} recuerdos en esta sala.", noText:"(sin texto)",
      searchHead:"Búsqueda", resSemantic:"{n} recuerdos afines a «{q}»", resText:"{n} recuerdos con «{q}»",
      noneSemantic:"No hallé recuerdos parecidos. Probá con otras palabras.",
      noneText:"Ningún recuerdo contiene esas palabras. Probá con «Significado».",
      searchingSem:"consultando por significado…",
      searchNote:"Buscando recuerdos afines a «{q}». La primera consulta enciende el oráculo, puede tardar unos segundos…",
      interrogating:"Interrogando la memoria…", searchFailed:"La búsqueda falló. ¿Sigue corriendo el servidor?",
      affinity:"afinidad", loadingReader:"Cargando…", filed:"archivado", by:"por",
      readerError:"No se pudo abrir este recuerdo.", errorTag:"Error",
      noContent:"(sin contenido)", memoryFallback:"Recuerdo",
      openingWing:"Abriendo el ala…", wingError:"No se pudo abrir esta ala.",
      bootMsg:"Encendiendo las velas del palacio…", connError:"No pude conectar con MemPalace.<br>¿Está corriendo el servidor?",
      foot:'<b>Paloci</b> · un palacio de tu memoria, leído en vivo desde <span class="mono">MemPalace</span>',
      floorPlan:"Plano", genericBlurb:"Recuerdos archivados en esta ala."
    },
    kinds:{ log:"Bitácora", project:"Proyecto", journal:"Diario", personal:"Personal", wing:"Ala" },
    // See the English block above: add your own wings here to curate names
    // and descriptions; unlisted wings get an auto-derived name.
    wings:{},
    // See the English block: room names come from the id; this is an
    // optional per-id override, empty by default.
    rooms:{}
  }
};

function detectLang() {
  try { const s = localStorage.getItem("paloci_lang"); if (s === "en" || s === "es") return s; } catch (e) { /* private mode */ }
  const sys = ((navigator.language || "") + "").toLowerCase();
  return sys.indexOf("es") === 0 ? "es" : "en";
}

let lang = detectLang();

export function getLang() { return lang; }
export function setLang(l) {
  lang = l;
  try { localStorage.setItem("paloci_lang", l); } catch (e) { /* private mode */ }
  document.documentElement.setAttribute("lang", l);
}

const L = () => I18N[lang];

export function t(k, vars) {
  let s = (L().ui[k] != null) ? L().ui[k] : (I18N.en.ui[k] != null ? I18N.en.ui[k] : k);
  if (vars) Object.keys(vars).forEach((v) => { s = s.split("{" + v + "}").join(vars[v]); });
  return s;
}

function prettyId(id) {
  return String(id).replace(/^wing_/, "").replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
export function wname(id) { const w = L().wings[id] || I18N.en.wings[id]; return w ? w.name : prettyId(id); }
export function wblurb(id) { const w = L().wings[id] || I18N.en.wings[id]; return w ? w.blurb : t("genericBlurb"); }
export function klabel(kind) { return L().kinds[kind] || I18N.en.kinds[kind] || kind; }
export function rname(id) { return L().rooms[id] || I18N.en.rooms[id] || prettyId(id); }
