"use strict";

/*
 * Configuration — resolves everything from the environment once, at startup.
 *
 * The MemPalace database is auto-discovered the same way the MemPalace CLI
 * does it, so Paloci just works for a standard install with zero config:
 *   1. $MEMPALACE_DB, if set (explicit override)
 *   2. the "palace_path" in ~/.mempalace/config.json (handles custom locations)
 *   3. the default ~/.mempalace/palace/chroma.sqlite3
 *
 * Environment variables:
 *   PORT           HTTP port (default 8787)
 *   MEMPALACE_DB   path to chroma.sqlite3 (overrides auto-discovery)
 *   MEMPALACE_BIN  MemPalace CLI binary, used for semantic search
 */

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const HOME = os.homedir();
const MEMPALACE_HOME = path.join(HOME, ".mempalace");

const PORT = Number(process.env.PORT) || 8787;

function resolveDbPath() {
  if (process.env.MEMPALACE_DB) return process.env.MEMPALACE_DB;
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(MEMPALACE_HOME, "config.json"), "utf8"));
    if (cfg && cfg.palace_path) return path.join(cfg.palace_path, "chroma.sqlite3");
  } catch (e) { /* no/unreadable config → fall back to the default location */ }
  return path.join(MEMPALACE_HOME, "palace", "chroma.sqlite3");
}

const DB_PATH = resolveDbPath();

// MemPalace CLI binary (used for semantic search).
let MEMPALACE_BIN = process.env.MEMPALACE_BIN;
if (!MEMPALACE_BIN) {
  const local = path.join(HOME, ".local", "bin", "mempalace");
  MEMPALACE_BIN = fs.existsSync(local) ? local : "mempalace";
}

const PUBLIC_DIR = path.join(__dirname, "..", "public");

module.exports = { PORT, DB_PATH, MEMPALACE_BIN, PUBLIC_DIR };
