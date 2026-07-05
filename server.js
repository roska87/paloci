#!/usr/bin/env node
"use strict";

/*
 * Paloci — the Memory Palace · local server (entry point)
 * Reads your MemPalace (ChromaDB / SQLite) READ-ONLY and serves it as a
 * navigable web app. No external dependencies: uses the native node:sqlite module.
 *
 * Usage:  node --no-warnings server.js
 *         (or: npm start)  →  http://localhost:8787
 *
 * Environment variables:
 *   PORT           HTTP port (default 8787)
 *   MEMPALACE_DB   path to chroma.sqlite3 (default ~/.mempalace/palace/chroma.sqlite3)
 *   MEMPALACE_BIN  MemPalace CLI binary for semantic search (default ~/.local/bin/mempalace)
 *
 * Layout:
 *   lib/config.js    environment & paths
 *   lib/db.js        read-only SQLite connection + prepared statements
 *   lib/meta.js      structural wing metadata (seal + kind)
 *   lib/palace.js    domain: builds the JSON responses
 *   lib/semantic.js  MemPalace CLI integration (semantic search)
 *   lib/server.js    HTTP routes + static files
 */

// Friendly preflight before anything pulls in node:sqlite (Node 22.5+).
const [maj, min] = process.versions.node.split(".").map(Number);
if (maj < 22 || (maj === 22 && min < 5)) {
  console.error("✗ Paloci needs Node ≥ 22.5 (for the built-in node:sqlite module).");
  console.error("  You're on Node " + process.versions.node + ". Please upgrade and retry.");
  process.exit(1);
}

const { start } = require("./lib/server");
const { close } = require("./lib/db");

start();

process.on("SIGINT", () => { close(); process.exit(0); });
