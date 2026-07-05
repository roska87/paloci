"use strict";

/*
 * Semantic search — integration with the MemPalace CLI.
 * The CLI prints human-readable text; we parse it into [N] wing/room + text
 * blocks and resolve each one to its drawer id so the content can be opened.
 */

const { execFile } = require("node:child_process");
const { MEMPALACE_BIN } = require("./config");
const { Q } = require("./db");
const { preview, likeEscape } = require("./palace");

function parseSemantic(raw) {
  const out = [];
  if (!raw) return out;
  const start = raw.search(/\[\d+\]\s+\S+\s*\/\s*\S+/);
  if (start === -1) return out;
  const body = raw.slice(start);
  const parts = body.split(/\n(?=\s*\[\d+\]\s+\S+\s*\/\s*\S+)/);
  for (const part of parts) {
    const head = part.match(/\[\d+\]\s+(\S+)\s*\/\s*(\S+)/);
    if (!head) continue;
    const wing = head[1], room = head[2];
    const cm = part.match(/cosine=([\d.]+)/);
    const cosine = cm ? parseFloat(cm[1]) : null;

    let text = "";
    const mi = part.search(/Match:\s*cosine=[\d.]+/);
    if (mi !== -1) {
      let after = part.slice(mi).replace(/^Match:.*\n?/, "");
      after = after.replace(/\n\s*[─━\-]{3,}[\s\S]*$/, ""); // cut at the separator
      text = after.split("\n").map((l) => l.replace(/^ {0,6}/, "")).join("\n").trim();
    }

    const firstLine = (text.split("\n").find((l) => l.trim().length > 8) || text).trim();
    const probe = firstLine.slice(0, 46);
    let id = null, filed = null;
    if (probe.length >= 6) {
      try {
        const r = Q.resolveId.get(likeEscape(probe), wing, room);
        if (r) { id = r.id; const f = Q.filedAt.get(id); filed = f ? f.v : null; }
      } catch { /* no match, stays null */ }
    }

    out.push({
      id, wing, room,
      cosine, filed_at: filed, preview: preview(text, 220), text
    });
  }
  return out;
}

function semanticSearch(q, limit) {
  return new Promise((resolve) => {
    execFile(MEMPALACE_BIN, ["search", q, "--results", String(limit)],
      { timeout: 45000, maxBuffer: 16 * 1024 * 1024, env: process.env },
      (err, stdout) => {
        if (err && !stdout) {
          const msg = err.code === "ENOENT"
            ? "Can't find the 'mempalace' CLI (set MEMPALACE_BIN if it's on another path)."
            : (err.killed ? "Semantic search took too long." : "Semantic search failed.");
          return resolve({ error: msg, results: [] });
        }
        resolve({ results: parseSemantic(stdout || "") });
      });
  });
}

module.exports = { parseSemantic, semanticSearch };
