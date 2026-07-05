/* Small shared helpers: HTML escaping, dates, number formatting and the
   fetch wrapper every module uses to talk to the local API. */

import { getLang } from "./i18n.js";

export function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export function fdate(s) { return s ? String(s).slice(0, 10) : ""; }

export function fmt(n) { return (n || 0).toLocaleString(getLang() === "es" ? "es-ES" : "en-US"); }

export function api(p) {
  return fetch(p, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  });
}
