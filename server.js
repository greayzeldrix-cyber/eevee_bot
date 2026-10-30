// Speichert die Einstellungen (data/config.json), liefert die App aus und pusht Änderungen live ans Overlay.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { DEFAULTS } from "./shared/shared.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const FILE = path.join(root, "data", "config.json");
const DIST = path.join(root, "dist");
fs.mkdirSync(path.dirname(FILE), { recursive: true });

let config;
try { config = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(FILE, "utf8")) }; } catch { config = structuredClone(DEFAULTS); }

const CFILE = path.join(root, "data", "counters.json");
let counters;
try { counters = JSON.parse(fs.readFileSync(CFILE, "utf8")); } catch { counters = { pet: 0, star: 0 }; }
const saveCounters = () => fs.writeFileSync(CFILE, JSON.stringify(counters, null, 2));
saveCounters(); // creates the file on first start

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json" };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/config") {
    if (req.method === "PUT") {
      let body = "";
      req.on("data", (d) => (body += d));
      req.on("end", () => {
        try {
          config = JSON.parse(body);
          fs.writeFileSync(FILE, JSON.stringify(config, null, 2));
          broadcast({ type: "config", config });
          res.end('{"ok":true}');
        } catch { res.statusCode = 400; res.end(); }
      });
      return;
    }
    res.setHeader("content-type", "application/json");
    return res.end(JSON.stringify(config));
  }
  const cm = url.pathname.match(/^\/api\/counter\/(\w+)$/);
    if (cm && req.method === "POST") {
      const n = (counters[cm[1]] || 0) + 1;
      if (!url.searchParams.has("peek")) { counters[cm[1]] = n; saveCounters(); } // peek = test button, doesn't count
      res.setHeader("content-type", "application/json");
      return res.end(JSON.stringify({ n }));
  }
  let f = path.join(DIST, path.normalize(url.pathname));
  if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, "index.html");
  if (!fs.existsSync(f)) { res.statusCode = 404; return res.end('Bitte zuerst "npm run build" ausführen (oder "npm start").'); }
  res.setHeader("content-type", MIME[path.extname(f)] || "application/octet-stream");
  fs.createReadStream(f).pipe(res);
});

// Nur Seiten von localhost dürfen sich verbinden (die Config enthält ggf. dein Bot-Token).
const wss = new WebSocketServer({
  server, path: "/ws",
  verifyClient: ({ origin }) => { try { return !origin || ["localhost", "127.0.0.1"].includes(new URL(origin).hostname); } catch { return false; } },
});
const broadcast = (msg, except) => wss.clients.forEach((c) => c !== except && c.readyState === 1 && c.send(JSON.stringify(msg)));
wss.on("connection", (ws) => ws.on("message", (raw) => {
  try { const m = JSON.parse(raw); if (m.type === "test") broadcast(m, ws); } catch {}
}));

server.listen(PORT, "127.0.0.1", () => console.log(`\n✦ Dashboard: http://localhost:${PORT}/\n✦ OBS-Overlay: http://localhost:${PORT}/overlay\n`));
