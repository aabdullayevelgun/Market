// Zəhrə Market — local network server.
// Runs on the "Admin" computer. Stores all data in a JSON file on disk and
// exposes a small REST API so the "Kassa" computer(s) on the same network
// can read/write the same shared data over Wi-Fi/LAN.

const express = require("express");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const https = require("https");

function generateToken() {
  return crypto.randomBytes(16).toString("hex").toUpperCase();
}

// A phone's browser will not grant camera access (getUserMedia) on a plain
// http://<lan-ip> page — only "secure contexts" (https:, or http://localhost)
// are allowed to ask, regardless of what the user taps on the permission
// prompt. The Admin/Kassa desktop traffic on the main HTTP port doesn't need
// this (no camera involved there), so instead of moving the whole app to
// HTTPS — which would touch every hardcoded http://127.0.0.1:4000 call in
// the Electron/client code — a second HTTPS listener is added on its own
// port, serving the exact same Express app, just for the "Telefon (Skaner)"
// role to connect through. Cached to disk so the cert doesn't regenerate
// (and force the phone to re-accept the self-signed warning) every restart.
// selfsigned@5's generate() is async (returns a Promise) — this whole
// function has to be too.
async function getOrCreateHttpsCert(userDataDir) {
  const keyFile = path.join(userDataDir, "https-key.pem");
  const certFile = path.join(userDataDir, "https-cert.pem");
  const ipsFile = path.join(userDataDir, "https-cert-ips.json");

  // A laptop moving between networks (shop, home, ...) gets a different
  // DHCP IP each time — the cert's SAN has to actually list whichever IP
  // the phone is connecting to, or the browser refuses the connection
  // outright (unlike the "not secure" warning, a SAN mismatch has no
  // "proceed anyway" option on most browsers). Every IP this has ever run
  // under gets accumulated into the same cert instead of overwritten, so a
  // phone that already trusted this cert on one network doesn't have to
  // redo the whole install-and-trust dance after going to another.
  let knownIps = [];
  try {
    knownIps = JSON.parse(fs.readFileSync(ipsFile, "utf-8"));
  } catch {
    knownIps = [];
  }
  const currentIp = getLocalIp();
  const needsNewIp = currentIp && !knownIps.includes(currentIp);

  if (fs.existsSync(keyFile) && fs.existsSync(certFile) && !needsNewIp) {
    return { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) };
  }
  if (needsNewIp) knownIps.push(currentIp);

  const selfsigned = require("selfsigned");
  const attrs = [{ name: "commonName", value: "zehra-market.local" }];
  const altNames = [
    { type: 7, ip: "127.0.0.1" },
    { type: 2, value: "localhost" },
    { type: 2, value: "zehra-market.local" },
    ...knownIps.map((ip) => ({ type: 7, ip })),
  ];
  const pems = await selfsigned.generate(attrs, {
    days: 3650,
    keySize: 2048,
    extensions: [
      { name: "subjectAltName", altNames },
      // iOS only offers manual trust (Settings > General > About >
      // Certificate Trust Settings) for certs flagged as a CA — without
      // this, ours never even shows up there for the user to trust.
      { name: "basicConstraints", cA: true },
      { name: "keyUsage", keyCertSign: true, digitalSignature: true, keyEncipherment: true, cRLSign: true },
    ],
  });
  fs.mkdirSync(userDataDir, { recursive: true });
  fs.writeFileSync(keyFile, pems.private);
  fs.writeFileSync(certFile, pems.cert);
  fs.writeFileSync(ipsFile, JSON.stringify(knownIps));
  return { key: pems.private, cert: pems.cert };
}

function isLocalRequest(req) {
  const ip = req.ip || (req.connection && req.connection.remoteAddress) || "";
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

// A raw TCP source-IP check (isLocalRequest) is not enough on its own: a
// malicious page open in any OTHER browser tab on the Admin PC can silently
// fetch("http://localhost:4000/...") too, and the request still arrives
// from 127.0.0.1 — indistinguishable, by IP alone, from the real app. The
// browser is required to tell the server which page's JS actually made the
// request via the Origin header, and it cannot be spoofed by page content
// (only the browser sets it). Our own app — the packaged Electron build
// (file://, so Origin is absent/"null") or the Vite dev server — never
// presents an arbitrary public-website Origin, so anything that does is
// rejected outright, regardless of what isLocalRequest or the token say.
// A *.ts.net origin is also trusted: that's a Tailscale Serve address (see
// "Telefon (Skaner)" role), reachable only by devices already inside this
// specific private tailnet — nobody outside it can get DNS or a cert for
// it, so it's exactly as trustworthy as a bare LAN IP.
const TRUSTED_ORIGIN_RE = /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.ts\.net$|^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|(\d{1,3}\.){3}\d{1,3})(:\d+)?$/i;
function isTrustedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin || origin === "null") return true; // file:// app, or a non-browser caller
  return TRUSTED_ORIGIN_RE.test(origin);
}

// The Admin PC (physically trusted, talks to its own server over loopback)
// is always authorized. Any other device — a Kassa PC, or anyone else on the
// LAN who has the shared token — must also present the admin password before
// it can touch admin-only data (settings, restore, delete, sales reset).
// Without this, the client-side "admin panel password" screen was cosmetic:
// a Kassa device could call these routes directly over HTTP and skip it.
function isAdminAuthorized(req, data) {
  if (isLocalRequest(req)) return true;
  const pw = req.header("x-admin-password");
  return !!pw && !!data.settings.adminSifre && pw === data.settings.adminSifre;
}

// Wrong-password attempts against the admin gate are not rate-limited by
// isAdminAuthorized itself (it's also used just to decide what /api/state
// filters out, where "counting" a mismatch makes no sense). A LAN device —
// or, now that isTrustedOrigin blocks browser-CSRF, anything actually on
// the network — could otherwise try passwords as fast as it can open TCP
// connections. 15 wrong attempts from one IP locks that IP out for 20
// minutes; this resets on the next successful login from that IP.
const ADMIN_ATTEMPT_LIMIT = 15;
const ADMIN_BLOCK_MS = 20 * 60 * 1000;
const adminAttempts = new Map(); // ip -> { count, blockedUntil }

function getClientIp(req) {
  return req.ip || (req.connection && req.connection.remoteAddress) || "unknown";
}

function isAdminBlocked(ip) {
  const entry = adminAttempts.get(ip);
  if (!entry || !entry.blockedUntil) return false;
  if (entry.blockedUntil > Date.now()) return true;
  adminAttempts.delete(ip); // block window passed — start clean
  return false;
}

// Gate for the admin-only write routes: does the isAdminAuthorized check,
// but also tracks/blocks repeated failures per IP and writes the response
// itself (so every call site collapses to one line instead of repeating
// the same three checks and error message ten times over).
function requireAdmin(req, res, data) {
  if (isLocalRequest(req)) return true;
  const ip = getClientIp(req);
  if (isAdminBlocked(ip)) {
    res.status(429).json({ error: "Çox sayda səhv cəhd. 20 dəqiqə sonra yenidən sınayın." });
    return false;
  }
  if (isAdminAuthorized(req, data)) {
    adminAttempts.delete(ip);
    return true;
  }
  const entry = adminAttempts.get(ip) || { count: 0 };
  entry.count += 1;
  if (entry.count >= ADMIN_ATTEMPT_LIMIT) entry.blockedUntil = Date.now() + ADMIN_BLOCK_MS;
  adminAttempts.set(ip, entry);
  res.status(403).json({ error: "Admin şifrəsi tələb olunur." });
  return false;
}

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

function nowStr() {
  const d = new Date();
  const pad2 = (n) => String(n).padStart(2, "0");
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function getDataFile(userDataDir) {
  return path.join(userDataDir, "zehra-market-data.json");
}

// Writes atomically: a half-written file (e.g. from a power cut mid-save)
// can never be left as the real data file, because we only rename the temp
// file over it once the write has fully landed on disk.
function writeFileAtomic(filePath, content) {
  const tmpPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmpPath, content);
  fs.renameSync(tmpPath, filePath);
}

// If the main data file is ever unreadable (corrupted by a crash, an
// interrupted write on an older version, manual editing, etc.), restore the
// most recent rolling backup instead of taking the whole store down.
function recoverFromLatestBackup(dataFile) {
  const dir = path.join(path.dirname(dataFile), "backups");
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter((f) => f.startsWith("backup-")).sort();
  for (let i = files.length - 1; i >= 0; i--) {
    try {
      const raw = fs.readFileSync(path.join(dir, files[i]), "utf-8");
      const data = JSON.parse(raw);
      writeFileAtomic(dataFile, raw);
      console.error(`Data file was corrupted — recovered from ${files[i]}.`);
      return data;
    } catch {
      continue; // that backup is also bad, try the next-oldest one
    }
  }
  return null;
}

function loadData(dataFile) {
  if (!fs.existsSync(dataFile)) {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    const seed = JSON.parse(fs.readFileSync(path.join(__dirname, "seed.json"), "utf-8"));
    writeFileAtomic(dataFile, JSON.stringify(seed, null, 2));
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
  } catch (err) {
    data = recoverFromLatestBackup(dataFile);
    if (!data) throw err; // no usable backup either — nothing more we can do
  }
  if (!data.settings) data.settings = {};
  let settingsChanged = false;
  if (!data.settings.apiToken) {
    data.settings.apiToken = generateToken();
    settingsChanged = true;
  }
  // A shared, publicly-documented fallback password (this app's old default
  // was "2580", visible to anyone reading the source) is exactly as weak as
  // having no password at all — every install would share the same one
  // unless someone remembered to change it. A random one generated per
  // install, like the LAN token above, closes that off without needing the
  // person to do anything on first run.
  if (!data.settings.adminSifre) {
    data.settings.adminSifre = generateToken().slice(0, 8);
    settingsChanged = true;
  }
  if (settingsChanged) {
    writeFileAtomic(dataFile, JSON.stringify(data, null, 2));
  }
  if (!Array.isArray(data.stockMovements)) data.stockMovements = [];
  if (!Array.isArray(data.purchases)) data.purchases = [];
  return data;
}

function saveData(dataFile, data) {
  writeFileAtomic(dataFile, JSON.stringify(data, null, 2));
  writeBackup(dataFile, data);
}

// Keeps a rolling set of timestamped snapshots next to the main data file,
// so a bad edit or a corrupted save can be recovered from.
function writeBackup(dataFile, data) {
  try {
    const dir = path.join(path.dirname(dataFile), "backups");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fs.writeFileSync(path.join(dir, `backup-${stamp}.json`), JSON.stringify(data, null, 2));
    const files = fs.readdirSync(dir).filter((f) => f.startsWith("backup-")).sort();
    const excess = files.length - 200;
    for (let i = 0; i < excess; i++) fs.unlinkSync(path.join(dir, files[i]));
  } catch (err) {
    console.error("Backup could not be written:", err);
  }
}

function startServer(userDataDir, port = 4000, onError) {
  const dataFile = getDataFile(userDataDir);
  const app = express();
  app.use(express.json());

  // Filled in once getOrCreateHttpsCert resolves (see the HTTPS listener
  // setup further down) — read by the /api/https-cert download route below.
  let cachedCertPem = null;

  // Allow requests from the Kassa computer(s) on the local network — but
  // only ones our own app could plausibly have sent (see isTrustedOrigin).
  // A response is never made CORS-readable to a page we don't trust, even
  // for routes that don't otherwise require a password/token.
  app.use((req, res, next) => {
    if (isTrustedOrigin(req)) {
      res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
      res.header("Access-Control-Allow-Headers", "*");
      res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    }
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });

  // Reject outright — before any auth/token logic even runs — any request
  // whose Origin header shows it was fired from a page we don't trust (see
  // isTrustedOrigin's comment). This is what actually stops a malicious
  // website's background fetch() from acting through the Admin PC's own
  // browser, since IP-based "isLocalRequest" trust alone can't tell the
  // difference between our app and any other open tab on that machine.
  app.use((req, res, next) => {
    if (req.path === "/api/ping" || isTrustedOrigin(req)) return next();
    res.status(403).json({ error: "Etibarsız mənşə (origin)." });
  });

  // The Admin PC talks to its own server over localhost and is always trusted.
  // Any other computer on the network (a Kassa PC, or a phone used as a
  // barcode scanner) must present the shared token so a stranger on the same
  // Wi-Fi can't read or edit the store data. Only /api/* is gated — the
  // static app files below (index.html, JS, CSS) must load token-free, or a
  // phone could never reach the RoleSetup screen where the token is entered
  // in the first place.
  app.use((req, res, next) => {
    if (!req.path.startsWith("/api/") || req.path === "/api/ping" || isLocalRequest(req)) return next();
    const data = loadData(dataFile);
    const token = req.header("x-api-token");
    if (token && token === data.settings.apiToken) return next();
    res.status(401).json({ error: "Yanlış və ya boş token." });
  });

  // Lets a phone on the same LAN open http://<admin-ip>:4000 directly in its
  // browser and get the same app a Kassa PC uses — this is what makes "use
  // your phone as a barcode scanner" possible at all, since otherwise only
  // the packaged Electron window could ever load the UI.
  app.use(express.static(path.join(__dirname, "../dist")));

  app.get("/api/ping", (req, res) => res.json({ ok: true, name: "Zəhrə Market Server" }));

  // Plain-HTTP download of our self-signed HTTPS cert, meant to be opened
  // directly on the phone (http://<ip>:PORT/api/https-cert — no https, no
  // token needed, this is just a public cert file). iOS in particular won't
  // grant camera access on the HTTPS port until this is installed AND
  // marked fully trusted under Settings → General → About → Certificate
  // Trust Settings — tapping through the in-browser "not secure" warning
  // alone isn't enough there, unlike Android.
  app.get("/api/https-cert", (req, res) => {
    if (!cachedCertPem) return res.status(503).send("Sertifikat hələ hazırlanır, bir neçə saniyə sonra yenidən cəhd edin.");
    res.set("Content-Type", "application/x-x509-ca-cert");
    res.set("Content-Disposition", "attachment; filename=zehra-market.pem");
    res.send(cachedCertPem);
  });

  app.get("/api/network-info", (req, res) => {
    const data = loadData(dataFile);
    res.json({ ip: getLocalIp(), port, token: isLocalRequest(req) ? data.settings.apiToken : undefined });
  });

  app.get("/api/state", (req, res) => {
    const data = loadData(dataFile);
    // Never let a non-admin caller (a Kassa PC, or anyone else holding just
    // the LAN token) read the admin password in plaintext — that would let
    // them skip the admin-panel password prompt entirely.
    if (isAdminAuthorized(req, data)) return res.json(data);
    const { adminSifre, ...safeSettings } = data.settings;
    res.json({ ...data, settings: safeSettings });
  });

  app.post("/api/products", (req, res) => {
    const data = loadData(dataFile);
    if (!requireAdmin(req, res, data)) return;
    data.products.push(req.body);
    saveData(dataFile, data);
    res.json(data);
  });

  app.put("/api/products/:kod", (req, res) => {
    const data = loadData(dataFile);
    if (!requireAdmin(req, res, data)) return;
    data.products = data.products.map((p) =>
      p.kod === req.params.kod ? { ...p, ...req.body } : p
    );
    saveData(dataFile, data);
    res.json(data);
  });

  app.delete("/api/products/:kod", (req, res) => {
    const data = loadData(dataFile);
    if (!requireAdmin(req, res, data)) return;
    data.products = data.products.filter((p) => p.kod !== req.params.kod);
    saveData(dataFile, data);
    res.json(data);
  });

  app.post("/api/suppliers", (req, res) => {
    const data = loadData(dataFile);
    if (!requireAdmin(req, res, data)) return;
    data.suppliers.unshift(req.body);
    saveData(dataFile, data);
    res.json(data);
  });

  app.put("/api/suppliers/:ad", (req, res) => {
    const data = loadData(dataFile);
    if (!requireAdmin(req, res, data)) return;
    const target = decodeURIComponent(req.params.ad);
    data.suppliers = data.suppliers.map((s) => (s.ad === target ? { ...s, ...req.body } : s));
    saveData(dataFile, data);
    res.json(data);
  });

  app.delete("/api/suppliers/:ad", (req, res) => {
    const data = loadData(dataFile);
    if (!requireAdmin(req, res, data)) return;
    const target = decodeURIComponent(req.params.ad);
    data.suppliers = data.suppliers.filter((s) => s.ad !== target);
    saveData(dataFile, data);
    res.json(data);
  });

  app.post("/api/employees", (req, res) => {
    const data = loadData(dataFile);
    if (!requireAdmin(req, res, data)) return;
    data.employees.unshift(req.body);
    saveData(dataFile, data);
    res.json(data);
  });

  app.delete("/api/employees/:ad", (req, res) => {
    const data = loadData(dataFile);
    if (!requireAdmin(req, res, data)) return;
    data.employees = data.employees.filter((e) => e.ad !== decodeURIComponent(req.params.ad));
    saveData(dataFile, data);
    res.json(data);
  });

  app.post("/api/sales", (req, res) => {
    const data = loadData(dataFile);
    const sale = req.body;
    data.sales.unshift(sale);
    data.products = data.products.map((p) => {
      const item = sale.items.find((i) => i.kod === p.kod);
      return item ? { ...p, stok: Math.max(0, p.stok - item.miqdar) } : p;
    });
    saveData(dataFile, data);
    res.json(data);
  });

  // Reverses a completed sale: gives every line item's quantity back to
  // stock and marks the receipt as returned, so a customer bringing
  // something back doesn't need the cashier to re-do the stock math by hand
  // via "Mal gəldi". Runs from the Kassa screen itself (no admin gate),
  // same as creating the sale did.
  app.post("/api/sales/return", (req, res) => {
    const data = loadData(dataFile);
    const { no } = req.body || {};
    const sale = data.sales.find((s) => s.no === no);
    if (!sale) return res.status(404).json({ error: "Çek tapılmadı." });
    if (sale.status === "İadə edilib") return res.status(400).json({ error: "Bu çek artıq geri qaytarılıb." });
    sale.status = "İadə edilib";
    (sale.items || []).forEach((item) => {
      const product = data.products.find((p) => p.kod === item.kod);
      if (!product) return;
      product.stok = (product.stok || 0) + item.miqdar;
      data.stockMovements.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        tarix: nowStr(),
        kod: product.kod,
        ad: product.ad,
        tip: "Giriş",
        miqdar: item.miqdar,
        sebeb: `Qaytarma (çek ${no})`,
        qaliq: product.stok,
      });
    });
    saveData(dataFile, data);
    res.json(data);
  });

  // Stock-in ("Mal gəldi", delta > 0) and stock-out / write-off ("Stokdan
  // çıxar", delta < 0 — reason required) both go through here instead of the
  // product PUT route, so every change to the total is recorded as its own
  // movement with a reason, not just silently overwritten.
  app.post("/api/stock/adjust", (req, res) => {
    const data = loadData(dataFile);
    if (!requireAdmin(req, res, data)) return;
    const { kod, delta, reason } = req.body || {};
    const change = parseInt(delta, 10);
    if (!kod || !change) return res.status(400).json({ error: "kod və delta tələb olunur." });
    if (change < 0 && !reason) return res.status(400).json({ error: "Stokdan çıxarmaq üçün səbəb tələb olunur." });
    const product = data.products.find((p) => p.kod === kod);
    if (!product) return res.status(404).json({ error: "Məhsul tapılmadı." });
    product.stok = Math.max(0, (product.stok || 0) + change);
    data.stockMovements.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tarix: nowStr(),
      kod: product.kod,
      ad: product.ad,
      tip: change > 0 ? "Giriş" : "Çıxış",
      miqdar: Math.abs(change),
      sebeb: change > 0 ? reason || "Mal gəlişi" : reason,
      qaliq: product.stok,
    });
    saveData(dataFile, data);
    res.json(data);
  });

  // "Stok sayımı" (physical inventory count) confirmation — each item's
  // final counted quantity REPLACES the recorded stok (not added to it),
  // since the whole point of a count is reconciling what's on the shelf
  // against what the system thinks is there. Recorded as one "Sayım"
  // stock-movement per product, logging the delta so the audit trail still
  // shows what changed and by how much.
  app.post("/api/stock/count", (req, res) => {
    const data = loadData(dataFile);
    if (!requireAdmin(req, res, data)) return;
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Sayım siyahısı boşdur." });
    }
    let applied = 0;
    for (const it of items) {
      // Not parseInt: a weighed product's tally is scanned off the scale's
      // barcode in kg (e.g. 0.35), not whole units — truncating it here
      // would silently zero out any count under 1kg.
      const sayilan = Math.round((Number(it.sayilan) + Number.EPSILON) * 1000) / 1000;
      const product = data.products.find((p) => p.kod === it.kod);
      if (!product || isNaN(sayilan) || sayilan < 0) continue;
      const eskiStok = product.stok || 0;
      const delta = Math.round((sayilan - eskiStok + Number.EPSILON) * 1000) / 1000;
      product.stok = sayilan;
      if (delta !== 0) {
        data.stockMovements.unshift({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          tarix: nowStr(),
          kod: product.kod,
          ad: product.ad,
          tip: delta > 0 ? "Giriş" : "Çıxış",
          miqdar: Math.abs(delta),
          sebeb: `Sayım (əvvəlki: ${eskiStok}, sayılan: ${sayilan})`,
          qaliq: product.stok,
        });
      }
      applied++;
    }
    if (applied === 0) return res.status(400).json({ error: "Heç bir düzgün sətir tapılmadı." });
    saveData(dataFile, data);
    res.json(data);
  });

  // A whole "Mal qəbulu" batch — one supplier, many scanned line items — is
  // saved as a single purchase record (for the Təchizatçı history view) plus
  // one stock-movement per line (so it still shows up in the existing Stok
  // hərəkətləri log), instead of the client looping N separate requests.
  app.post("/api/purchases", (req, res) => {
    const data = loadData(dataFile);
    if (!requireAdmin(req, res, data)) return;
    const { tedarukcu, items, endirimPct } = req.body || {};
    if (!tedarukcu || !String(tedarukcu).trim() || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Təchizatçı adı və ən azı bir mal tələb olunur." });
    }
    const savedItems = [];
    let cemi = 0;
    for (const it of items) {
      const n = parseInt(it.miqdar, 10);
      const product = data.products.find((p) => p.kod === it.kod);
      if (!n || n <= 0 || !product) continue;
      const alish = Number(it.alish);
      const satish = Number(it.satish);
      if (!isNaN(alish)) product.alish = alish;
      if (!isNaN(satish)) product.satish = satish;
      product.stok = Math.max(0, (product.stok || 0) + n);
      data.stockMovements.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        tarix: nowStr(),
        kod: product.kod,
        ad: product.ad,
        tip: "Giriş",
        miqdar: n,
        sebeb: `Mal qəbulu — ${tedarukcu}`,
        qaliq: product.stok,
      });
      const xett = n * (isNaN(alish) ? product.alish : alish);
      cemi += xett;
      savedItems.push({ kod: product.kod, ad: product.ad, miqdar: n, alish: product.alish, satish: product.satish, mebleg: Math.round((xett + Number.EPSILON) * 100) / 100 });
    }
    if (savedItems.length === 0) return res.status(400).json({ error: "Heç bir düzgün sətir tapılmadı." });
    const pct = Number(endirimPct) || 0;
    cemi = Math.round((cemi + Number.EPSILON) * 100) / 100;
    const odeniler = Math.round((cemi * (1 - pct / 100) + Number.EPSILON) * 100) / 100;
    // Its own sequence (separate from sales' "#000921"-style receipt
    // numbers) — this is what a Kassa/warehouse person reads off a paper
    // delivery slip and later types in to pull the goods list back up.
    const cekNums = data.purchases.map((p) => parseInt(String(p.cekNo || "").replace("M-", ""), 10)).filter((n) => !isNaN(n));
    const cekNo = "M-" + String((cekNums.length ? Math.max(...cekNums) : 0) + 1).padStart(6, "0");
    const purchase = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      cekNo,
      tarix: nowStr(),
      tedarukcu: String(tedarukcu).trim(),
      items: savedItems,
      cemi,
      endirimPct: pct,
      odeniler,
    };
    data.purchases.unshift(purchase);
    // A tədarükçü typed here for the first time still needs to show up in
    // Təchizatçılar (that's where the purchase history is browsed from) —
    // not just silently record the purchase with nothing to click into.
    const supplier = data.suppliers.find((s) => s.ad === purchase.tedarukcu);
    if (supplier) {
      supplier.sonAlish = purchase.tarix;
      supplier.meblegh = odeniler;
    } else {
      data.suppliers.unshift({ ad: purchase.tedarukcu, tel: "", sonAlish: purchase.tarix, meblegh: odeniler, borc: 0, status: "Aktiv" });
    }
    saveData(dataFile, data);
    res.json(data);
  });

  app.put("/api/settings", (req, res) => {
    const data = loadData(dataFile);
    if (!requireAdmin(req, res, data)) return;
    // Merge instead of replacing wholesale, and never let a client overwrite
    // the LAN token through this route — that would let anyone who currently
    // holds it lock every other device out by rotating it from underneath them.
    const { apiToken, ...incoming } = req.body || {};
    data.settings = { ...data.settings, ...incoming, apiToken: data.settings.apiToken };
    saveData(dataFile, data);
    res.json(data);
  });

  app.post("/api/products/import", (req, res) => {
    const data = loadData(dataFile);
    if (!requireAdmin(req, res, data)) return;
    const incoming = Array.isArray(req.body.products) ? req.body.products : [];
    incoming.forEach((p) => {
      const idx = data.products.findIndex((existing) => existing.kod === p.kod);
      if (idx >= 0) data.products[idx] = { ...data.products[idx], ...p };
      else data.products.push(p);
    });
    saveData(dataFile, data);
    res.json(data);
  });

  app.post("/api/sales/reset", (req, res) => {
    const data = loadData(dataFile);
    if (!requireAdmin(req, res, data)) return;
    data.sales = [];
    saveData(dataFile, data);
    res.json(data);
  });

  app.post("/api/restore", (req, res) => {
    const data = loadData(dataFile);
    if (!requireAdmin(req, res, data)) return;
    const incoming = req.body;
    const restored = {
      products: Array.isArray(incoming.products) ? incoming.products : [],
      sales: Array.isArray(incoming.sales) ? incoming.sales : [],
      employees: Array.isArray(incoming.employees) ? incoming.employees : [],
      suppliers: Array.isArray(incoming.suppliers) ? incoming.suppliers : [],
      stockMovements: Array.isArray(incoming.stockMovements) ? incoming.stockMovements : [],
      purchases: Array.isArray(incoming.purchases) ? incoming.purchases : [],
      // apiToken is never replaced by a restore, same reasoning as PUT /api/settings.
      settings:
        incoming.settings && typeof incoming.settings === "object"
          ? { ...data.settings, ...incoming.settings, apiToken: data.settings.apiToken }
          : data.settings,
    };
    saveData(dataFile, restored);
    res.json(restored);
  });

  const httpServer = app.listen(port, "0.0.0.0", () => {
    console.log(`Zəhrə Market server: http://0.0.0.0:${port} (data: ${dataFile})`);
  });
  // app.listen() never throws on failure (e.g. the port already being used
  // by another program) — it fails silently via this 'error' event instead.
  // Without handling it, the whole app looks "broken" with zero indication
  // why. The caller (Electron's main process) uses this to show a real
  // error dialog instead of a silent, permanent failure to start.
  httpServer.on("error", (err) => {
    console.error(`Server could not bind to port ${port}:`, err);
    if (typeof onError === "function") onError(err);
  });

  // HTTPS listener for the "Telefon (Skaner)" role — see getOrCreateHttpsCert's
  // comment above for why this exists as a second port instead of moving the
  // whole app to HTTPS. Its failure is non-fatal: Admin/Kassa on the main
  // HTTP port keeps working either way, so this only logs, it doesn't call
  // onError (which would show the user a blocking "server failed" dialog for
  // a feature they may not even be using).
  const httpsPort = port + 443;
  getOrCreateHttpsCert(userDataDir)
    .then(({ key, cert }) => {
      cachedCertPem = cert;
      const httpsServer = https.createServer({ key, cert }, app).listen(httpsPort, "0.0.0.0", () => {
        console.log(`Zəhrə Market HTTPS (Telefon/Skaner): https://0.0.0.0:${httpsPort}`);
      });
      httpsServer.on("error", (err) => {
        console.error(`HTTPS server could not bind to port ${httpsPort}:`, err);
      });
    })
    .catch((err) => {
      console.error("HTTPS server could not start (Telefon/Skaner role will be unavailable):", err);
    });

  return httpServer;
}

module.exports = { startServer };