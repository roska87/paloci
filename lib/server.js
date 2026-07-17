"use strict";

/*
 * Transport layer — the HTTP server: API routes + static file serving.
 * index.html is always served fresh (no-store); hashed-ish static assets
 * (css/js/vendor) get a short client cache.
 */

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { PORT, HOST, DB_PATH, PUBLIC_DIR } = require("./config");
const palace = require("./palace");
const { semanticSearch } = require("./semantic");

const INDEX = path.join(PUBLIC_DIR, "index.html");

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json"
};

function sendJSON(res, obj, code = 200) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}

// Serves a file from public/ with a path-traversal guard.
function sendStatic(res, urlPath) {
  const file = path.join(PUBLIC_DIR, path.normalize(urlPath).replace(/^([./\\])+/, ""));
  if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404).end("404");
    return;
  }
  const ct = MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
  const cache = urlPath.startsWith("/vendor/") ? "public, max-age=86400" : "no-store";
  res.writeHead(200, { "Content-Type": ct + "; charset=utf-8", "Cache-Control": cache });
  fs.createReadStream(file).pipe(res);
}

function handler(req, res) {
  let url;
  try { url = new URL(req.url, "http://localhost"); } catch { res.writeHead(400).end(); return; }
  const p = url.pathname;

  try {
    if (p === "/" || p === "/index.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      fs.createReadStream(INDEX).pipe(res);
      return;
    }
    if (p.startsWith("/vendor/") || p.startsWith("/js/") || p.startsWith("/css/")) {
      return sendStatic(res, p);
    }
    if (p === "/api/overview")  return sendJSON(res, palace.buildOverview());
    if (p === "/api/nodes")     return sendJSON(res, palace.buildNodes());
    if (p === "/api/match") {
      const q = (url.searchParams.get("q") || "").trim();
      return sendJSON(res, q.length < 2 ? [] : palace.buildMatch(q));
    }
    if (p === "/api/wing")      return sendJSON(res, palace.buildWing(url.searchParams.get("id") || ""));
    if (p === "/api/drawer") {
      const d = palace.buildDrawer(url.searchParams.get("id"));
      return d ? sendJSON(res, d) : sendJSON(res, { error: "not found" }, 404);
    }
    if (p === "/api/search") {
      const q = (url.searchParams.get("q") || "").trim();
      const mode = url.searchParams.get("mode") === "semantic" ? "semantic" : "text";
      if (q.length < 2) return sendJSON(res, { mode, results: [] });
      if (mode === "text") return sendJSON(res, { mode, results: palace.buildSearch(q) });
      const limit = Math.min(60, Math.max(1, parseInt(url.searchParams.get("limit"), 10) || 15));
      return semanticSearch(q, limit).then((out) =>
        sendJSON(res, { mode, results: out.results, error: out.error })
      ).catch((e) => sendJSON(res, { mode, results: [], error: e.message }));
    }
    res.writeHead(404, { "Content-Type": "text/plain" }).end("404");
  } catch (e) {
    console.error("Error on " + p + ":", e.message);
    sendJSON(res, { error: e.message }, 500);
  }
}

function start() {
  const server = http.createServer(handler);
  server.listen(PORT, HOST, () => {
    const { stats } = palace.buildOverview();
    console.log("");
    console.log("  🏛  Paloci — the Memory Palace");
    console.log("  ────────────────────────────────────────────");
    console.log("  Database: " + DB_PATH);
    console.log("  Memories: " + stats.drawers.toLocaleString("en-US") +
                "  ·  Wings: " + stats.wings + "  ·  Rooms: " + stats.rooms);
    console.log("  Open:     http://localhost:" + PORT);
    console.log("  ────────────────────────────────────────────");
    console.log("  (Ctrl+C to stop · the database is read-only)");
    console.log("");
  });
  return server;
}

module.exports = { start };
