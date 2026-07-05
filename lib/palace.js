"use strict";

/*
 * Domain layer — turns raw rows from the database into the JSON shapes the
 * frontend consumes: the palace overview, a wing with its rooms, a single
 * drawer (memory), the full neuron list and word-match ids for the Brain.
 */

const { Q } = require("./db");
const { wingMeta } = require("./meta");

const preview = (s, n = 260) => {
  if (!s) return "";
  s = String(s).replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n).trimEnd() + "…" : s;
};

const likeEscape = (q) => "%" + String(q).replace(/[\\%_]/g, (c) => "\\" + c) + "%";

function buildOverview() {
  const rows = Q.taxonomy.all();
  const wings = {};
  const roomAcross = {}; // room -> { wings: Set, count }
  let totalDrawers = 0;
  const roomNames = new Set();

  for (const { wing, room, n } of rows) {
    totalDrawers += n;
    roomNames.add(room);
    if (!wings[wing]) wings[wing] = { rooms: [], drawers: 0 };
    wings[wing].rooms.push({ id: room, count: n });
    wings[wing].drawers += n;
    if (!roomAcross[room]) roomAcross[room] = { wings: new Set(), count: 0 };
    roomAcross[room].wings.add(wing);
    roomAcross[room].count += n;
  }

  const wingList = Object.keys(wings).map((id) => {
    const m = wingMeta(id);
    wings[id].rooms.sort((a, b) => b.count - a.count);
    return { id, kind: m.kind, seal: m.seal,
             drawers: wings[id].drawers, rooms: wings[id].rooms };
  }).sort((a, b) => b.drawers - a.drawers);

  const tunnels = Object.keys(roomAcross)
    .filter((r) => roomAcross[r].wings.size > 1)
    .map((r) => ({
      room: r, count: roomAcross[r].count,
      wings: [...roomAcross[r].wings]
    }))
    .sort((a, b) => b.count - a.count);

  return {
    stats: { drawers: totalDrawers, wings: wingList.length, rooms: roomNames.size, tunnels: tunnels.length },
    wings: wingList, tunnels
  };
}

function buildWing(id) {
  const meta = wingMeta(id);
  const rows = Q.wingDrawers.all(id);
  const roomsMap = {};
  // exact per-room counts from the taxonomy
  for (const { wing, room, n } of Q.taxonomy.all()) {
    if (wing !== id) continue;
    roomsMap[room] = { id: room, count: n, drawers: [] };
  }
  for (const r of rows) {
    const room = r.room || "general";
    if (!roomsMap[room]) roomsMap[room] = { id: room, count: 0, drawers: [] };
    roomsMap[room].drawers.push({
      id: r.id, filed_at: r.filed_at, src: r.src, preview: preview(r.doc)
    });
  }
  const rooms = Object.values(roomsMap).sort((a, b) => b.count - a.count);
  return { id, kind: meta.kind, seal: meta.seal,
           drawers: rooms.reduce((s, r) => s + r.count, 0), rooms };
}

function buildDrawer(id) {
  const r = Q.drawer.get(Number(id));
  if (!r || r.doc == null) return null;
  return {
    id: Number(id), wing: r.wing, room: r.room,
    filed_at: r.filed_at, src: r.src, added_by: r.added_by, text: r.doc
  };
}

// All neurons for the "full brain" mode: short keys to shrink the payload.
function buildNodes() {
  return Q.allNodes.all().map((n) => ({ i: n.id, w: n.w, r: n.r || "general" }));
}

// Drawer ids whose text contains the query — used to light up matching neurons.
function buildMatch(q) {
  return Q.matchIds.all(likeEscape(q)).map((r) => r.id);
}

function buildSearch(q) {
  return Q.search.all(likeEscape(q)).map((r) => ({
    id: r.id, wing: r.wing, room: r.room,
    filed_at: r.filed_at, preview: preview(r.doc, 220)
  }));
}

module.exports = { preview, likeEscape, buildOverview, buildWing, buildDrawer, buildNodes, buildMatch, buildSearch };
