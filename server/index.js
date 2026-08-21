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
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

function isLocalRequest(req) {
  const ip = req.ip || (req.connection && req.connection.remoteAddress) || "";
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
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

function startServer(userDataDir, port = 4000) {
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
    res.json(loadData(dataFile));
  });

  app.post("/api/products", (req, res) => {
    const data = loadData(dataFile);
    data.products.push(req.body);
    saveData(dataFile, data);
    res.json(data);
  });

  app.put("/api/products/:kod", (req, res) => {
    const data = loadData(dataFile);
    data.products = data.products.map((p) =>
      p.kod === req.params.kod ? { ...p, ...req.body } : p
    );
    saveData(dataFile, data);
    res.json(data);
  });

  app.delete("/api/products/:kod", (req, res) => {
    const data = loadData(dataFile);
    data.products = data.products.filter((p) => p.kod !== req.params.kod);
    saveData(dataFile, data);
    res.json(data);
  });

  app.post("/api/suppliers", (req, res) => {
    const data = loadData(dataFile);
    data.suppliers.unshift(req.body);
    saveData(dataFile, data);
    res.json(data);
  });

  app.put("/api/suppliers/:ad", (req, res) => {
    const data = loadData(dataFile);
    const target = decodeURIComponent(req.params.ad);
    data.suppliers = data.suppliers.map((s) => (s.ad === target ? { ...s, ...req.body } : s));
    saveData(dataFile, data);
    res.json(data);
  });

  app.delete("/api/suppliers/:ad", (req, res) => {
    const data = loadData(dataFile);
    const target = decodeURIComponent(req.params.ad);
    data.suppliers = data.suppliers.filter((s) => s.ad !== target);
    saveData(dataFile, data);
    res.json(data);
  });

  app.post("/api/employees", (req, res) => {
    const data = loadData(dataFile);
    data.employees.unshift(req.body);
    saveData(dataFile, data);
    res.json(data);
  });

  app.delete("/api/employees/:ad", (req, res) => {
    const data = loadData(dataFile);
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

  app.put("/api/settings", (req, res) => {
    const data = loadData(dataFile);
    data.settings = req.body;
    saveData(dataFile, data);
    res.json(data);
  });

  app.post("/api/products/import", (req, res) => {
    const incoming = Array.isArray(req.body.products) ? req.body.products : [];
    const data = loadData(dataFile);
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
    data.sales = [];
    saveData(dataFile, data);
    res.json(data);
  });

  app.post("/api/restore", (req, res) => {
    const incoming = req.body;
    const data = {
      products: Array.isArray(incoming.products) ? incoming.products : [],
      sales: Array.isArray(incoming.sales) ? incoming.sales : [],
      employees: Array.isArray(incoming.employees) ? incoming.employees : [],
      suppliers: Array.isArray(incoming.suppliers) ? incoming.suppliers : [],
      settings: incoming.settings && typeof incoming.settings === "object" ? incoming.settings : loadData(dataFile).settings,
    };
    saveData(dataFile, data);
    res.json(data);
  });

  app.listen(port, "0.0.0.0", () => {
    console.log(`Zəhrə Market server: http://0.0.0.0:${port} (data: ${dataFile})`);
  });
}

module.exports = { startServer };