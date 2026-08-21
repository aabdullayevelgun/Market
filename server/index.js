// Zəhrə Market — local network server.
// Runs on the "Admin" computer. Stores all data in a JSON file on disk and
// exposes a small REST API so the "Kassa" computer(s) on the same network
// can read/write the same shared data over Wi-Fi/LAN.

const express = require("express");
const fs = require("fs");
const path = require("path");
const os = require("os");

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

function loadData(dataFile) {
  if (!fs.existsSync(dataFile)) {
    const seed = JSON.parse(fs.readFileSync(path.join(__dirname, "seed.json"), "utf-8"));
    fs.writeFileSync(dataFile, JSON.stringify(seed, null, 2));
  }
  return JSON.parse(fs.readFileSync(dataFile, "utf-8"));
}

function saveData(dataFile, data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
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

  app.get("/api/ping", (req, res) => res.json({ ok: true, name: "Zəhrə Market Server" }));

  app.get("/api/network-info", (req, res) => {
    res.json({ ip: getLocalIp(), port });
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