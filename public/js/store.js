/*
 * Shared state + event bus.
 *
 * `state`/`data` are plain mutable objects owned here and imported wherever
 * needed. `bus` is a tiny Observer: modules that would otherwise need to
 * import each other in a cycle (e.g. brain ↔ search) communicate through
 * events instead. Known events:
 *   "atrium-rendered"  the atrium view was (re)painted → re-apply filters
 *   "brain-view"       the brain was opened/closed → refresh chrome texts
 */

export const state = { where: "atrium", wing: null, brain: false };

export const data = { overview: null, wingsById: {}, maxDrawers: 1 };

export function setOverview(o) {
  data.overview = o;
  data.wingsById = {};
  o.wings.forEach((w) => { data.wingsById[w.id] = w; });
  data.maxDrawers = o.wings.length ? o.wings[0].drawers : 1;
}

export const bus = new EventTarget();
export const emit = (type, detail) => bus.dispatchEvent(new CustomEvent(type, { detail }));
export const on = (type, fn) => bus.addEventListener(type, fn);
