"use strict";

/*
 * Data access — opens the MemPalace ChromaDB (SQLite) READ-ONLY and exposes
 * the prepared statements the rest of the backend uses. This is the only
 * module that talks to the database.
 */

const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");
const { DB_PATH } = require("./config");

if (!fs.existsSync(DB_PATH)) {
  console.error("✗ Can't find the MemPalace database at:\n  " + DB_PATH);
  console.error("  Set MEMPALACE_DB=/path/to/chroma.sqlite3 if it lives elsewhere.");
  process.exit(1);
}

let db;
try {
  db = new DatabaseSync(DB_PATH, { readOnly: true });
} catch (e) {
  console.error("✗ Couldn't open the database read-only: " + e.message);
  process.exit(1);
}

const Q = {
  taxonomy: db.prepare(
    `SELECT w.string_value AS wing, r.string_value AS room, COUNT(*) AS n
       FROM embedding_metadata w
       JOIN embedding_metadata r ON w.id = r.id AND r.key = 'room'
      WHERE w.key = 'wing'
      GROUP BY w.string_value, r.string_value`
  ),
  // The N most recent drawers PER ROOM (not per wing): a global LIMIT would
  // let one busy room swallow the whole quota and leave others with none,
  // even when they hold thousands of (older) memories.
  wingDrawers: db.prepare(
    `SELECT id, room, filed_at, src, doc FROM (
       SELECT id, room, filed_at, src, doc,
              ROW_NUMBER() OVER (PARTITION BY room ORDER BY filed_at DESC, id DESC) AS rn
         FROM (
           SELECT m.id AS id,
                  MAX(CASE WHEN m.key='room'            THEN m.string_value END) AS room,
                  MAX(CASE WHEN m.key='filed_at'        THEN m.string_value END) AS filed_at,
                  MAX(CASE WHEN m.key='source_file'     THEN m.string_value END) AS src,
                  MAX(CASE WHEN m.key='chroma:document' THEN m.string_value END) AS doc
             FROM embedding_metadata m
            WHERE m.id IN (SELECT id FROM embedding_metadata WHERE key='wing' AND string_value = ?)
            GROUP BY m.id
         )
     )
     WHERE rn <= 50
     ORDER BY room, rn`
  ),
  drawer: db.prepare(
    `SELECT MAX(CASE WHEN key='wing'            THEN string_value END) AS wing,
            MAX(CASE WHEN key='room'            THEN string_value END) AS room,
            MAX(CASE WHEN key='filed_at'        THEN string_value END) AS filed_at,
            MAX(CASE WHEN key='source_file'     THEN string_value END) AS src,
            MAX(CASE WHEN key='added_by'        THEN string_value END) AS added_by,
            MAX(CASE WHEN key='chroma:document' THEN string_value END) AS doc
       FROM embedding_metadata WHERE id = ?`
  ),
  search: db.prepare(
    `SELECT m.id AS id,
            MAX(CASE WHEN m.key='wing'            THEN m.string_value END) AS wing,
            MAX(CASE WHEN m.key='room'            THEN m.string_value END) AS room,
            MAX(CASE WHEN m.key='filed_at'        THEN m.string_value END) AS filed_at,
            MAX(CASE WHEN m.key='chroma:document' THEN m.string_value END) AS doc
       FROM embedding_metadata m
      WHERE m.id IN (
              SELECT id FROM embedding_metadata
               WHERE key='chroma:document' AND string_value LIKE ? ESCAPE '\\'
               LIMIT 60)
      GROUP BY m.id
      ORDER BY filed_at DESC`
  ),
  // Resolves a semantic result's drawer id from the start of its text +
  // its wing/room, so the reader can open the full content.
  resolveId: db.prepare(
    `SELECT id FROM embedding_metadata
      WHERE key='chroma:document' AND string_value LIKE ? ESCAPE '\\'
        AND id IN (SELECT id FROM embedding_metadata WHERE key='wing' AND string_value = ?)
        AND id IN (SELECT id FROM embedding_metadata WHERE key='room' AND string_value = ?)
      LIMIT 1`
  ),
  filedAt: db.prepare(
    `SELECT string_value AS v FROM embedding_metadata WHERE id = ? AND key='filed_at'`
  ),
  // All neurons (one row per drawer): id + wing + room. For the "full brain" mode.
  allNodes: db.prepare(
    `SELECT wm.id AS id, wm.string_value AS w,
            (SELECT rm.string_value FROM embedding_metadata rm WHERE rm.id = wm.id AND rm.key='room') AS r
       FROM embedding_metadata wm
      WHERE wm.key='wing'`
  ),
  // Ids of every drawer whose text matches a word query (to light up neurons in the Brain view).
  matchIds: db.prepare(
    `SELECT id FROM embedding_metadata
      WHERE key='chroma:document' AND string_value LIKE ? ESCAPE '\\'
      LIMIT 5000`
  )
};

function close() { try { db.close(); } catch { /* already closed */ } }

module.exports = { Q, close };
