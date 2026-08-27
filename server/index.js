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
  // DHCP IP each time. This used to mean regenerating the cert (a brand
  // new key + cert object, hence a new fingerprint) every time a genuinely
  // new IP showed up, which silently invalidated every phone's existing
  // "trust this certificate" decision — the whole install-and-trust dance
  // had to be redone from scratch, repeatedly, forever. Fixed: the cert is
  // now generated exactly once and never touched again. Phones are meant
  // to connect via the fixed "zehra-market.local" mDNS hostname (see the
  // responder started in startServer below) instead of a raw IP, so the
  // cert's SAN never actually needs to track the current address — trust
  // it once, and it stays valid across every future IP change.
  let knownIps = [];
  try {
    knownIps = JSON.parse(fs.readFileSync(ipsFile, "utf-8"));
  } catch {
    knownIps = [];
  }
  if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
    return { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) };
  }
  const currentIp = getLocalIp();
  if (currentIp && !knownIps.includes(currentIp)) knownIps.push(currentIp);

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
// The old version of this regex accepted ANY dotted-quad as "trusted" —
// `(\d{1,3}\.){3}\d{1,3}` matches a public IP just as happily as a LAN one,
// which defeated the whole point: a page served from any public address
// (e.g. an attacker's VPS) got a matching Origin header, so a victim's
// browser on the same LAN as the Admin PC could still have its background
// fetch() sail through this gate. Origins are now checked structurally
// (ts.net / localhost / the mDNS hostname) or, for a bare IP, validated
// against the actual private-range list below — a public IP no longer
// matches no matter how it's shaped.
const TS_NET_ORIGIN_RE = /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.ts\.net$/i;
const LOCAL_ORIGIN_RE = /^https?:\/\/(localhost|\[::1\]|zehra-market\.local)(:\d+)?$/i;
const IP_ORIGIN_RE = /^https?:\/\/((?:\d{1,3}\.){3}\d{1,3})(:\d+)?$/i;

function isPrivateIp(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return false;
  const [a, b] = parts;
  if (a === 127) return true; // loopback
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // Tailscale CGNAT range
  return false;
}

function isTrustedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin || origin === "null") return true; // file:// app, or a non-browser caller
  if (TS_NET_ORIGIN_RE.test(origin) || LOCAL_ORIGIN_RE.test(origin)) return true;
  const ipMatch = origin.match(IP_ORIGIN_RE);
  return !!ipMatch && isPrivateIp(ipMatch[1]);
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

// Strips every plaintext secret (admin password, scanner-login passwords,
// employee Növbə passwords) before a non-admin caller sees the response.
// /api/state already did this for GET, but several write routes that are
// reachable WITHOUT admin rights (a plain Kassa sale, a return) used to
// `res.json(data)` the raw object straight back — which meant a Kassa or
// Telefon device, on every single sale it made, got the admin password and
// every other device's password back in that same response. Route
// responses should go through this instead of res.json(data) directly
// unless the route already required admin.
function sanitizeForNonAdmin(req, data) {
  if (isAdminAuthorized(req, data)) return data;
  const { adminSifre, ...safeSettings } = data.settings;
  const safeScannerUsers = (data.scannerUsers || []).map((u) => ({ username: u.username }));
  const safeEmployees = (data.employees || []).map(({ sifre, ...rest }) => rest);
  return { ...data, settings: safeSettings, scannerUsers: safeScannerUsers, employees: safeEmployees };
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

// Same brute-force protection as the admin gate above, but for scanner
// (phone) login — this endpoint has to be reachable without the LAN token
// first (that's the whole point, the phone doesn't have it yet), so it
// needs its own lockout instead of relying on the token check to keep
// guessing attempts rare.
const scannerAttempts = new Map(); // ip -> { count, blockedUntil }
function isScannerLoginBlocked(ip) {
  const entry = scannerAttempts.get(ip);
  if (!entry || !entry.blockedUntil) return false;
  if (entry.blockedUntil > Date.now()) return true;
  scannerAttempts.delete(ip);
  return false;
}
function recordScannerLoginFailure(ip) {
  const entry = scannerAttempts.get(ip) || { count: 0 };
  entry.count += 1;
  if (entry.count >= ADMIN_ATTEMPT_LIMIT) entry.blockedUntil = Date.now() + ADMIN_BLOCK_MS;
  scannerAttempts.set(ip, entry);
}

// Same idea again for "Növbəyə başla" (per-cashier shift login) — a Kassa
// device already holds the LAN token, but that's shared by every cashier,
// so this is its own password check with its own lockout.
const shiftAttempts = new Map(); // ip -> { count, blockedUntil }
function isShiftLoginBlocked(ip) {
  const entry = shiftAttempts.get(ip);
  if (!entry || !entry.blockedUntil) return false;
  if (entry.blockedUntil > Date.now()) return true;
  shiftAttempts.delete(ip);
  return false;
}
function recordShiftLoginFailure(ip) {
  const entry = shiftAttempts.get(ip) || { count: 0 };
  entry.count += 1;
  if (entry.count >= ADMIN_ATTEMPT_LIMIT) entry.blockedUntil = Date.now() + ADMIN_BLOCK_MS;
  shiftAttempts.set(ip, entry);
}

// Tailscale's virtual adapter hands out addresses in 100.64.0.0/10 (CGNAT
// range) — it's a real, non-internal interface, so a plain "first
// non-internal IPv4" scan picks it over the actual WiFi/LAN adapter once
// Tailscale is installed. That's exactly backwards for this field's
// purpose: it's shown to Kassa/Telefon devices as "connect to this IP over
// your local network", not "connect over Tailscale" (that's the separate
// admin.tailXXXX.ts.net hostname). Real LAN ranges are preferred first;
// Tailscale's is only used as a last resort if nothing else is found.
function isTailscaleIp(ip) {
  const parts = ip.split(".").map(Number);
  return parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127;
}
function getLocalIp() {
  const nets = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) candidates.push(net.address);
    }
  }
  return candidates.find((ip) => !isTailscaleIp(ip)) || candidates[0] || null;
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
  if (!Array.isArray(data.priceChanges)) data.priceChanges = [];
  if (!Array.isArray(data.scannerUsers)) data.scannerUsers = [];
  if (!Array.isArray(data.shifts)) data.shifts = [];
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
    if (!req.path.startsWith("/api/") || req.path === "/api/ping" || req.path === "/api/https-cert" || req.path === "/api/scanner-login" || isLocalRequest(req)) return next();
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
    res.json(sanitizeForNonAdmin(req, data));
  });

  app.post("/api/products", (req, res) => {
    const data = loadData(dataFile);
    if (!requireAdmin(req, res, data)) return;
    const kod = req.body && req.body.kod;
    if (!kod) return res.status(400).json({ error: "Barkod (kod) tələb olunur." });
    // Without this, two products could silently share the same kod — PUT
    // (uses .map) would then update BOTH at once, while stock/adjust and
    // purchases (use .find) would only ever touch the first, so the two
    // "same" products would quietly diverge in stock and price over time.
    if (data.products.some((p) => p.kod === kod)) {
      return res.status(400).json({ error: "Bu barkodla məhsul artıq mövcuddur." });
    }
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

  // Used specifically by the phone's "Qiymət yoxla → Qiyməti dəyiş" — a
  // separate route from the generic PUT above so this one specific kind of
  // change (a price edit made away from the desktop, while scanning) gets
  // its own audit trail. The desktop Qiymət yoxla page shows this log
  // instead of running its own camera, same reasoning as Stok sayımı.
  app.post("/api/products/:kod/price", (req, res) => {
    const data = loadData(dataFile);
    if (!requireAdmin(req, res, data)) return;
    const product = data.products.find((p) => p.kod === req.params.kod);
    if (!product) return res.status(404).json({ error: "Məhsul tapılmadı." });
    const yeni = Number(req.body && req.body.satish);
    if (isNaN(yeni) || yeni < 0) return res.status(400).json({ error: "Düzgün qiymət tələb olunur." });
    const eski = product.satish;
    product.satish = yeni;
    if (eski !== yeni) {
      data.priceChanges.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        tarix: nowStr(),
        kod: product.kod,
        ad: product.ad,
        eskiQiymet: eski,
        yeniQiymet: yeni,
      });
    }
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
    if (!req.body || !String(req.body.ad || "").trim()) {
      return res.status(400).json({ error: "Ad Soyad tələb olunur." });
    }
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

  // Admin resets an employee's Növbə (shift) login password from here —
  // the only field this route is meant to touch, though it merges whatever
  // else is sent too for consistency with the other PUT routes.
  app.put("/api/employees/:ad", (req, res) => {
    const data = loadData(dataFile);
    if (!requireAdmin(req, res, data)) return;
    const target = decodeURIComponent(req.params.ad);
    const idx = data.employees.findIndex((e) => e.ad === target);
    if (idx < 0) return res.status(404).json({ error: "İşçi tapılmadı." });
    data.employees[idx] = { ...data.employees[idx], ...req.body };
    saveData(dataFile, data);
    res.json(data);
  });

  // Named login for a Telefon (Skaner) device — Admin creates a
  // username/password pair here instead of the phone needing the raw LAN
  // token (an opaque code that has to be copied character-for-character).
  // Managed from Admin, so it's admin-gated like employees/suppliers.
  app.post("/api/scanner-users", (req, res) => {
    const data = loadData(dataFile);
    if (!requireAdmin(req, res, data)) return;
    const { username, password } = req.body || {};
    if (!username || !String(username).trim() || !password) {
      return res.status(400).json({ error: "İstifadəçi adı və şifrə tələb olunur." });
    }
    const uname = String(username).trim();
    if (data.scannerUsers.some((u) => u.username.toLowerCase() === uname.toLowerCase())) {
      return res.status(400).json({ error: "Bu istifadəçi adı artıq mövcuddur." });
    }
    data.scannerUsers.unshift({ username: uname, password: String(password) });
    saveData(dataFile, data);
    res.json(data);
  });

  app.delete("/api/scanner-users/:username", (req, res) => {
    const data = loadData(dataFile);
    if (!requireAdmin(req, res, data)) return;
    const target = decodeURIComponent(req.params.username).toLowerCase();
    data.scannerUsers = data.scannerUsers.filter((u) => u.username.toLowerCase() !== target);
    saveData(dataFile, data);
    res.json(data);
  });

  // Bootstrap login for a phone — no LAN token yet at this point (that's
  // the whole problem this replaces), so it's exempted from the token-check
  // middleware above and protected by its own brute-force lockout instead.
  // On success, hands back the same shared LAN token every other route
  // already expects in x-api-token — the rest of the app is unchanged.
  app.post("/api/scanner-login", (req, res) => {
    const data = loadData(dataFile);
    const ip = getClientIp(req);
    if (isScannerLoginBlocked(ip)) {
      return res.status(429).json({ error: "Çox sayda səhv cəhd. 20 dəqiqə sonra yenidən sınayın." });
    }
    const { username, password } = req.body || {};
    const uname = String(username || "").trim().toLowerCase();
    const match = data.scannerUsers.find((u) => u.username.toLowerCase() === uname && u.password === password);
    if (!match) {
      recordScannerLoginFailure(ip);
      return res.status(401).json({ error: "İstifadəçi adı və ya şifrə yanlışdır." });
    }
    scannerAttempts.delete(ip);
    res.json({ token: data.settings.apiToken });
  });

  app.post("/api/sales", (req, res) => {
    const data = loadData(dataFile);
    const sale = req.body;
    data.sales.unshift(sale);
    data.products = data.products.map((p) => {
      const item = sale.items.find((i) => i.kod === p.kod);
      // Deliberately allowed to go negative (not clamped to 0): if stock
      // reads 0 because a delivery hasn't been entered yet but the cashier
      // still sells the item, the deficit stays visible instead of being
      // silently absorbed — the next "Mal gəldi" for this product then
      // nets correctly against the real shortfall instead of resetting it.
      return item ? { ...p, stok: p.stok - item.miqdar } : p;
    });
    saveData(dataFile, data);
    res.json(sanitizeForNonAdmin(req, data));
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
    res.json(sanitizeForNonAdmin(req, data));
  });

  // "Növbəyə başla" — a cashier picks their own name and types their own
  // password (set by Admin in İşçilər) instead of every sale on a shared
  // Kassa terminal being attributed to whatever name happened to be
  // hardcoded. No admin gate (any cashier can start their own shift) but
  // its own brute-force lockout, same reasoning as /api/scanner-login: the
  // Kassa device's LAN token alone doesn't prove which *person* is typing.
  app.post("/api/shifts/start", (req, res) => {
    const data = loadData(dataFile);
    const ip = getClientIp(req);
    if (isShiftLoginBlocked(ip)) {
      return res.status(429).json({ error: "Çox sayda səhv cəhd. 20 dəqiqə sonra yenidən sınayın." });
    }
    const { kassir, sifre } = req.body || {};
    const employee = data.employees.find((e) => e.ad === kassir);
    if (!employee || !employee.sifre || employee.sifre !== sifre) {
      recordShiftLoginFailure(ip);
      return res.status(401).json({ error: "Ad və ya şifrə yanlışdır." });
    }
    if (data.shifts.some((s) => s.kassir === kassir && s.status === "Aktiv")) {
      return res.status(400).json({ error: `${kassir} üçün artıq açıq növbə var.` });
    }
    shiftAttempts.delete(ip);
    const shift = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kassir,
      baslama: nowStr(),
      bitme: null,
      status: "Aktiv",
    };
    data.shifts.unshift(shift);
    saveData(dataFile, data);
    res.json(sanitizeForNonAdmin(req, data));
  });

  // "Növbəni bitir" — closes the shift and freezes its totals at this exact
  // moment (nağd/kart/qaytarma/cəmi), computed from every sale tagged with
  // this shiftId. Frozen rather than computed live later because the sales
  // list keeps growing/changing (returns can happen after shift end) — the
  // end-of-shift receipt should reflect what was true at handover time, not
  // whatever the numbers happen to be whenever someone looks later.
  app.post("/api/shifts/:id/close", (req, res) => {
    const data = loadData(dataFile);
    const shift = data.shifts.find((s) => s.id === req.params.id);
    if (!shift) return res.status(404).json({ error: "Növbə tapılmadı." });
    if (shift.status !== "Aktiv") return res.status(400).json({ error: "Bu növbə artıq bağlanıb." });
    const shiftSales = data.sales.filter((s) => s.shiftId === shift.id);
    let nagdCemi = 0;
    let kartCemi = 0;
    let qaytarmaCemi = 0;
    let qaytarmaSayi = 0;
    let satisSayi = 0;
    for (const s of shiftSales) {
      if (s.status === "İadə edilib") {
        qaytarmaCemi += s.meblegh || 0;
        qaytarmaSayi += 1;
        continue;
      }
      satisSayi += 1;
      if (s.method === "qarisiq") {
        nagdCemi += s.cashPart || 0;
        kartCemi += s.cardPart || 0;
      } else if (s.method === "kart") {
        kartCemi += s.meblegh || 0;
      } else {
        nagdCemi += s.meblegh || 0;
      }
    }
    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
    shift.bitme = nowStr();
    shift.status = "Bağlı";
    shift.satisSayi = satisSayi;
    shift.nagdCemi = round2(nagdCemi);
    shift.kartCemi = round2(kartCemi);
    shift.qaytarmaSayi = qaytarmaSayi;
    shift.qaytarmaCemi = round2(qaytarmaCemi);
    shift.umumiCemi = round2(nagdCemi + kartCemi - qaytarmaCemi);
    saveData(dataFile, data);
    res.json(sanitizeForNonAdmin(req, data));
  });

  // Stock-in ("Mal gəldi", delta > 0) and stock-out / write-off ("Stokdan
  // çıxar", delta < 0 — reason required) both go through here instead of the
  // product PUT route, so every change to the total is recorded as its own
  // movement with a reason, not just silently overwritten.
  app.post("/api/stock/adjust", (req, res) => {
    const data = loadData(dataFile);
    if (!requireAdmin(req, res, data)) return;
    const { kod, delta, reason } = req.body || {};
    // parseInt would silently truncate a weighed product's fractional delta
    // (e.g. 0.5 kg found/adjusted) down to 0, both losing the adjustment and
    // failing the !change check below — same class of bug /api/stock/count
    // already avoids for exactly this reason (see its own comment).
    const change = Math.round((Number(delta) + Number.EPSILON) * 1000) / 1000;
    if (!kod || !change) return res.status(400).json({ error: "kod və delta tələb olunur." });
    if (change < 0 && !reason) return res.status(400).json({ error: "Stokdan çıxarmaq üçün səbəb tələb olunur." });
    const product = data.products.find((p) => p.kod === kod);
    if (!product) return res.status(404).json({ error: "Məhsul tapılmadı." });
    // Not clamped to 0 — a partial "Mal gəldi" against a product that's
    // already negative (oversold while waiting on a delivery) should net
    // correctly against the real deficit instead of jumping straight to 0.
    product.stok = (product.stok || 0) + change;
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
    const { tedarukcu, items, endirimPct, sened, ekspeditor } = req.body || {};
    if (!tedarukcu || !String(tedarukcu).trim() || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Təchizatçı adı və ən azı bir mal tələb olunur." });
    }
    const savedItems = [];
    let cemi = 0;
    for (const it of items) {
      // parseInt would silently drop a weighed product's fractional
      // quantity (e.g. 2.5 kg received) down to 2 — same fix as
      // /api/stock/adjust above.
      const n = Math.round((Number(it.miqdar) + Number.EPSILON) * 1000) / 1000;
      const product = data.products.find((p) => p.kod === it.kod);
      if (!n || n <= 0 || !product) continue;
      const alish = Number(it.alish);
      const satish = Number(it.satish);
      if (!isNaN(alish)) product.alish = alish;
      if (!isNaN(satish)) product.satish = satish;
      // Not clamped to 0 — same reasoning as /api/stock/adjust above.
      product.stok = (product.stok || 0) + n;
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
      sened: sened ? String(sened).trim() : "",
      ekspeditor: ekspeditor ? String(ekspeditor).trim() : "",
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
      priceChanges: Array.isArray(incoming.priceChanges) ? incoming.priceChanges : [],
      scannerUsers: Array.isArray(incoming.scannerUsers) ? incoming.scannerUsers : [],
      shifts: Array.isArray(incoming.shifts) ? incoming.shifts : [],
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

  // Answers mDNS ("Bonjour") queries for zehra-market.local with whatever
  // this machine's current LAN IP actually is, resolved fresh on every
  // query — not baked in anywhere. This is what lets a phone type a fixed
  // hostname once and never need to know/retype the real IP again, and
  // (paired with the cert above no longer regenerating) is what makes the
  // one-time certificate trust survive the admin computer roaming to a new
  // IP or network. iOS/macOS resolve .local names out of the box (Bonjour);
  // most desktop/Android browsers can too where an mDNS resolver is present
  // — raw-IP entry still works as a fallback for anything that doesn't.
  try {
    const mdns = require("multicast-dns")();
    const HOSTNAME = "zehra-market.local";
    mdns.on("query", (query) => {
      const asked = query.questions.some(
        (q) => q.type === "A" && q.name.toLowerCase() === HOSTNAME
      );
      if (!asked) return;
      const ip = getLocalIp();
      if (!ip) return;
      mdns.respond({ answers: [{ name: HOSTNAME, type: "A", ttl: 120, data: ip }] });
    });
    mdns.on("error", (err) => console.error("mDNS responder error:", err));
  } catch (err) {
    console.error("mDNS responder could not start (zehra-market.local won't resolve):", err);
  }

  return httpServer;
}

module.exports = { startServer };