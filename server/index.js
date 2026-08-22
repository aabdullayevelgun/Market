// Zəhrə Market — local network server.
// Runs on the "Admin" computer. Stores all data in a JSON file on disk and
// exposes a small REST API so the "Kassa" computer(s) on the same network
// can read/write the same shared data over Wi-Fi/LAN.

const express = require("express");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

function generateToken() {
  return crypto.randomBytes(16).toString("hex").toUpperCase();
}

function isLocalRequest(req) {
  const ip = req.ip || (req.connection && req.connection.remoteAddress) || "";
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
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
  return !!pw && pw === (data.settings.adminSifre || "2580");
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
  if (!data.settings.apiToken) {
    data.settings.apiToken = generateToken();
    writeFileAtomic(dataFile, JSON.stringify(data, null, 2));
  }
  if (!Array.isArray(data.stockMovements)) data.stockMovements = [];
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

  // Allow requests from the Kassa computer(s) on the local network.
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });

  // The Admin PC talks to its own server over localhost and is always trusted.
  // Any other computer on the network (a Kassa PC) must present the shared
  // token so a stranger on the same Wi-Fi can't read or edit the store data.
  app.use((req, res, next) => {
    if (req.path === "/api/ping" || isLocalRequest(req)) return next();
    const data = loadData(dataFile);
    const token = req.header("x-api-token");
    if (token && token === data.settings.apiToken) return next();
    res.status(401).json({ error: "Yanlış və ya boş token." });
  });

  app.get("/api/ping", (req, res) => res.json({ ok: true, name: "Zəhrə Market Server" }));

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
    if (!isAdminAuthorized(req, data)) return res.status(403).json({ error: "Admin şifrəsi tələb olunur." });
    data.products.push(req.body);
    saveData(dataFile, data);
    res.json(data);
  });

  app.put("/api/products/:kod", (req, res) => {
    const data = loadData(dataFile);
    if (!isAdminAuthorized(req, data)) return res.status(403).json({ error: "Admin şifrəsi tələb olunur." });
    data.products = data.products.map((p) =>
      p.kod === req.params.kod ? { ...p, ...req.body } : p
    );
    saveData(dataFile, data);
    res.json(data);
  });

  app.delete("/api/products/:kod", (req, res) => {
    const data = loadData(dataFile);
    if (!isAdminAuthorized(req, data)) return res.status(403).json({ error: "Admin şifrəsi tələb olunur." });
    data.products = data.products.filter((p) => p.kod !== req.params.kod);
    saveData(dataFile, data);
    res.json(data);
  });

  app.post("/api/suppliers", (req, res) => {
    const data = loadData(dataFile);
    if (!isAdminAuthorized(req, data)) return res.status(403).json({ error: "Admin şifrəsi tələb olunur." });
    data.suppliers.unshift(req.body);
    saveData(dataFile, data);
    res.json(data);
  });

  app.put("/api/suppliers/:ad", (req, res) => {
    const data = loadData(dataFile);
    if (!isAdminAuthorized(req, data)) return res.status(403).json({ error: "Admin şifrəsi tələb olunur." });
    const target = decodeURIComponent(req.params.ad);
    data.suppliers = data.suppliers.map((s) => (s.ad === target ? { ...s, ...req.body } : s));
    saveData(dataFile, data);
    res.json(data);
  });

  app.delete("/api/suppliers/:ad", (req, res) => {
    const data = loadData(dataFile);
    if (!isAdminAuthorized(req, data)) return res.status(403).json({ error: "Admin şifrəsi tələb olunur." });
    const target = decodeURIComponent(req.params.ad);
    data.suppliers = data.suppliers.filter((s) => s.ad !== target);
    saveData(dataFile, data);
    res.json(data);
  });

  app.post("/api/employees", (req, res) => {
    const data = loadData(dataFile);
    if (!isAdminAuthorized(req, data)) return res.status(403).json({ error: "Admin şifrəsi tələb olunur." });
    data.employees.unshift(req.body);
    saveData(dataFile, data);
    res.json(data);
  });

  app.delete("/api/employees/:ad", (req, res) => {
    const data = loadData(dataFile);
    if (!isAdminAuthorized(req, data)) return res.status(403).json({ error: "Admin şifrəsi tələb olunur." });
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

  // Stock-in ("Mal gəldi", delta > 0) and stock-out / write-off ("Stokdan
  // çıxar", delta < 0 — reason required) both go through here instead of the
  // product PUT route, so every change to the total is recorded as its own
  // movement with a reason, not just silently overwritten.
  app.post("/api/stock/adjust", (req, res) => {
    const data = loadData(dataFile);
    if (!isAdminAuthorized(req, data)) return res.status(403).json({ error: "Admin şifrəsi tələb olunur." });
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

  app.put("/api/settings", (req, res) => {
    const data = loadData(dataFile);
    if (!isAdminAuthorized(req, data)) return res.status(403).json({ error: "Admin şifrəsi tələb olunur." });
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
    if (!isAdminAuthorized(req, data)) return res.status(403).json({ error: "Admin şifrəsi tələb olunur." });
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
    if (!isAdminAuthorized(req, data)) return res.status(403).json({ error: "Admin şifrəsi tələb olunur." });
    data.sales = [];
    saveData(dataFile, data);
    res.json(data);
  });

  app.post("/api/restore", (req, res) => {
    const data = loadData(dataFile);
    if (!isAdminAuthorized(req, data)) return res.status(403).json({ error: "Admin şifrəsi tələb olunur." });
    const incoming = req.body;
    const restored = {
      products: Array.isArray(incoming.products) ? incoming.products : [],
      sales: Array.isArray(incoming.sales) ? incoming.sales : [],
      employees: Array.isArray(incoming.employees) ? incoming.employees : [],
      suppliers: Array.isArray(incoming.suppliers) ? incoming.suppliers : [],
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
  return httpServer;
}

module.exports = { startServer };