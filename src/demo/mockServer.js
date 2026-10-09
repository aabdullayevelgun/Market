// Offline demo "server" (VITE_DEMO=1 builds only).
//
// The real app talks to the Admin PC's Express server (server/index.js) over
// the LAN for every read and write. For a standalone demo on a single phone,
// that server is replaced in-page: window.fetch is wrapped so any request
// whose path starts with /api/ is answered here, from a JSON store kept in
// localStorage. The route logic mirrors server/index.js, minus the auth,
// origin, token and lockout layers (there is no network to protect).

import { buildDemoData, demoDateKey } from "./demoData.js";

const DB_KEY = "zehra_demo_db";

const pad2 = (n) => String(n).padStart(2, "0");
function nowStr() {
  const d = new Date();
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const round3 = (n) => Math.round((n + Number.EPSILON) * 1000) / 1000;

function ensureShape(data) {
  for (const k of ["products", "sales", "employees", "suppliers", "stockMovements", "purchases", "priceChanges", "scannerUsers", "shifts"]) {
    if (!Array.isArray(data[k])) data[k] = [];
  }
  if (!data.settings) data.settings = {};
  return data;
}

let cache = null;
function load() {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(DB_KEY);
    // Regenerated each new day so "today" on the dashboard is never empty;
    // changes made during a demo still last for the rest of that day.
    if (raw) {
      const stored = JSON.parse(raw);
      if (stored._demoGeneratedFor === demoDateKey()) cache = ensureShape(stored);
    }
  } catch {
    cache = null;
  }
  if (!cache) {
    // A cashier shift left open in yesterday's data no longer exists.
    try {
      localStorage.removeItem("zehra_active_shift");
    } catch {
      /* storage unavailable */
    }
    cache = ensureShape(buildDemoData());
    save(cache);
  }
  return cache;
}
function save(data) {
  cache = data;
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("Demo data could not be saved:", err);
  }
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (status, error) => {
  throw new HttpError(status, error);
};

const routes = [];
const route = (method, pattern, handler) => {
  const keys = [];
  const re = new RegExp("^" + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), "([^/]+)")) + "$");
  routes.push({ method, re, keys, handler });
};

route("GET", "/api/ping", () => ({ ok: true, name: "Zəhrə Market Demo" }));
route("GET", "/api/network-info", () => ({ ip: "Demo rejimi", port: 0, token: "DEMO" }));
route("GET", "/api/state", (d) => d);
route("POST", "/api/scanner-login", () => ({ token: "DEMO" }));

route("POST", "/api/products", (d, _p, body) => {
  if (!body || !body.kod) fail(400, "Barkod (kod) tələb olunur.");
  if (d.products.some((p) => p.kod === body.kod)) fail(400, "Bu barkodla məhsul artıq mövcuddur.");
  d.products.push(body);
});
route("PUT", "/api/products/:kod", (d, p, body) => {
  d.products = d.products.map((x) => (x.kod === p.kod ? { ...x, ...body } : x));
});
route("POST", "/api/products/:kod/price", (d, p, body) => {
  const product = d.products.find((x) => x.kod === p.kod);
  if (!product) fail(404, "Məhsul tapılmadı.");
  const yeni = Number(body && body.satish);
  if (isNaN(yeni) || yeni < 0) fail(400, "Düzgün qiymət tələb olunur.");
  const eski = product.satish;
  product.satish = yeni;
  if (eski !== yeni) d.priceChanges.unshift({ id: newId(), tarix: nowStr(), kod: product.kod, ad: product.ad, eskiQiymet: eski, yeniQiymet: yeni });
});
route("DELETE", "/api/products/:kod", (d, p) => {
  d.products = d.products.filter((x) => x.kod !== p.kod);
});

route("POST", "/api/suppliers", (d, _p, body) => {
  d.suppliers.unshift(body);
});
route("PUT", "/api/suppliers/:ad", (d, p, body) => {
  d.suppliers = d.suppliers.map((s) => (s.ad === p.ad ? { ...s, ...body } : s));
});
route("DELETE", "/api/suppliers/:ad", (d, p) => {
  d.suppliers = d.suppliers.filter((s) => s.ad !== p.ad);
});

route("POST", "/api/employees", (d, _p, body) => {
  if (!body || !String(body.ad || "").trim()) fail(400, "Ad Soyad tələb olunur.");
  d.employees.unshift(body);
});
route("DELETE", "/api/employees/:ad", (d, p) => {
  d.employees = d.employees.filter((e) => e.ad !== p.ad);
});
route("PUT", "/api/employees/:ad", (d, p, body) => {
  const idx = d.employees.findIndex((e) => e.ad === p.ad);
  if (idx < 0) fail(404, "İşçi tapılmadı.");
  d.employees[idx] = { ...d.employees[idx], ...body };
});

route("POST", "/api/scanner-users", (d, _p, body) => {
  const { username, password } = body || {};
  if (!username || !String(username).trim() || !password) fail(400, "İstifadəçi adı və şifrə tələb olunur.");
  const uname = String(username).trim();
  if (d.scannerUsers.some((u) => u.username.toLowerCase() === uname.toLowerCase())) fail(400, "Bu istifadəçi adı artıq mövcuddur.");
  d.scannerUsers.unshift({ username: uname, password: String(password) });
});
route("DELETE", "/api/scanner-users/:username", (d, p) => {
  const target = p.username.toLowerCase();
  d.scannerUsers = d.scannerUsers.filter((u) => u.username.toLowerCase() !== target);
});

route("POST", "/api/sales", (d, _p, sale) => {
  d.sales.unshift(sale);
  d.products = d.products.map((p) => {
    const item = (sale.items || []).find((i) => i.kod === p.kod);
    return item ? { ...p, stok: round3(p.stok - item.miqdar) } : p;
  });
});
route("POST", "/api/sales/return", (d, _p, body) => {
  const { no } = body || {};
  const sale = d.sales.find((s) => s.no === no);
  if (!sale) fail(404, "Çek tapılmadı.");
  if (sale.status === "İadə edilib") fail(400, "Bu çek artıq geri qaytarılıb.");
  sale.status = "İadə edilib";
  (sale.items || []).forEach((item) => {
    const product = d.products.find((p) => p.kod === item.kod);
    if (!product) return;
    product.stok = round3((product.stok || 0) + item.miqdar);
    d.stockMovements.unshift({ id: newId(), tarix: nowStr(), kod: product.kod, ad: product.ad, tip: "Giriş", miqdar: item.miqdar, sebeb: `Qaytarma (çek ${no})`, qaliq: product.stok });
  });
});
route("POST", "/api/sales/reset", (d) => {
  d.sales = [];
});

route("POST", "/api/shifts/start", (d, _p, body) => {
  const { kassir, sifre } = body || {};
  const employee = d.employees.find((e) => e.ad === kassir);
  if (!employee || !employee.sifre || employee.sifre !== sifre) fail(401, "Ad və ya şifrə yanlışdır.");
  // In the demo a forgotten open shift (app closed mid-shift) shouldn't
  // block the next presentation — just reuse it.
  if (!d.shifts.some((s) => s.kassir === kassir && s.status === "Aktiv")) {
    d.shifts.unshift({ id: newId(), kassir, baslama: nowStr(), bitme: null, status: "Aktiv" });
  }
});
route("POST", "/api/shifts/:id/close", (d, p) => {
  const shift = d.shifts.find((s) => s.id === p.id);
  if (!shift) fail(404, "Növbə tapılmadı.");
  if (shift.status !== "Aktiv") fail(400, "Bu növbə artıq bağlanıb.");
  let nagd = 0, kart = 0, qaytarma = 0, qaytarmaSayi = 0, satisSayi = 0;
  for (const s of d.sales.filter((x) => x.shiftId === shift.id)) {
    if (s.status === "İadə edilib") {
      qaytarma += s.meblegh || 0;
      qaytarmaSayi += 1;
      continue;
    }
    satisSayi += 1;
    if (s.method === "qarisiq") {
      nagd += s.cashPart || 0;
      kart += s.cardPart || 0;
    } else if (s.method === "kart") kart += s.meblegh || 0;
    else nagd += s.meblegh || 0;
  }
  Object.assign(shift, {
    bitme: nowStr(), status: "Bağlı", satisSayi, nagdCemi: round2(nagd), kartCemi: round2(kart),
    qaytarmaSayi, qaytarmaCemi: round2(qaytarma), umumiCemi: round2(nagd + kart - qaytarma),
  });
});

route("POST", "/api/stock/adjust", (d, _p, body) => {
  const { kod, delta, reason } = body || {};
  const change = round3(Number(delta));
  if (!kod || !change) fail(400, "kod və delta tələb olunur.");
  if (change < 0 && !reason) fail(400, "Stokdan çıxarmaq üçün səbəb tələb olunur.");
  const product = d.products.find((p) => p.kod === kod);
  if (!product) fail(404, "Məhsul tapılmadı.");
  product.stok = round3((product.stok || 0) + change);
  d.stockMovements.unshift({ id: newId(), tarix: nowStr(), kod: product.kod, ad: product.ad, tip: change > 0 ? "Giriş" : "Çıxış", miqdar: Math.abs(change), sebeb: change > 0 ? reason || "Mal gəlişi" : reason, qaliq: product.stok });
});
route("POST", "/api/stock/count", (d, _p, body) => {
  const { items } = body || {};
  if (!Array.isArray(items) || items.length === 0) fail(400, "Sayım siyahısı boşdur.");
  let applied = 0;
  for (const it of items) {
    const sayilan = round3(Number(it.sayilan));
    const product = d.products.find((p) => p.kod === it.kod);
    if (!product || isNaN(sayilan) || sayilan < 0) continue;
    const eskiStok = product.stok || 0;
    const delta = round3(sayilan - eskiStok);
    product.stok = sayilan;
    if (delta !== 0) {
      d.stockMovements.unshift({ id: newId(), tarix: nowStr(), kod: product.kod, ad: product.ad, tip: delta > 0 ? "Giriş" : "Çıxış", miqdar: Math.abs(delta), sebeb: `Sayım (əvvəlki: ${eskiStok}, sayılan: ${sayilan})`, qaliq: product.stok });
    }
    applied++;
  }
  if (applied === 0) fail(400, "Heç bir düzgün sətir tapılmadı.");
});
route("POST", "/api/purchases", (d, _p, body) => {
  const { tedarukcu, items, endirimPct, sened, ekspeditor } = body || {};
  if (!tedarukcu || !String(tedarukcu).trim() || !Array.isArray(items) || items.length === 0) fail(400, "Təchizatçı adı və ən azı bir mal tələb olunur.");
  const savedItems = [];
  let cemi = 0;
  for (const it of items) {
    const n = round3(Number(it.miqdar));
    const product = d.products.find((p) => p.kod === it.kod);
    if (!n || n <= 0 || !product) continue;
    const alish = Number(it.alish);
    const satish = Number(it.satish);
    if (!isNaN(alish)) product.alish = alish;
    if (!isNaN(satish)) product.satish = satish;
    product.stok = round3((product.stok || 0) + n);
    d.stockMovements.unshift({ id: newId(), tarix: nowStr(), kod: product.kod, ad: product.ad, tip: "Giriş", miqdar: n, sebeb: `Mal qəbulu — ${tedarukcu}`, qaliq: product.stok });
    const xett = n * (isNaN(alish) ? product.alish : alish);
    cemi += xett;
    savedItems.push({ kod: product.kod, ad: product.ad, miqdar: n, alish: product.alish, satish: product.satish, mebleg: round2(xett) });
  }
  if (savedItems.length === 0) fail(400, "Heç bir düzgün sətir tapılmadı.");
  const pct = Number(endirimPct) || 0;
  cemi = round2(cemi);
  const odeniler = round2(cemi * (1 - pct / 100));
  const nums = d.purchases.map((p) => parseInt(String(p.cekNo || "").replace("M-", ""), 10)).filter((n) => !isNaN(n));
  const cekNo = "M-" + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(6, "0");
  const purchase = {
    id: newId(), cekNo, tarix: nowStr(), tedarukcu: String(tedarukcu).trim(), sened: sened ? String(sened).trim() : "",
    ekspeditor: ekspeditor ? String(ekspeditor).trim() : "", items: savedItems, cemi, endirimPct: pct, odeniler,
  };
  d.purchases.unshift(purchase);
  const supplier = d.suppliers.find((s) => s.ad === purchase.tedarukcu);
  if (supplier) {
    supplier.sonAlish = purchase.tarix;
    supplier.meblegh = odeniler;
  } else {
    d.suppliers.unshift({ ad: purchase.tedarukcu, tel: "", sonAlish: purchase.tarix, meblegh: odeniler, borc: 0, status: "Aktiv" });
  }
});
route("PUT", "/api/settings", (d, _p, body) => {
  const { apiToken, ...incoming } = body || {};
  d.settings = { ...d.settings, ...incoming, apiToken: d.settings.apiToken };
});
route("POST", "/api/products/import", (d, _p, body) => {
  const incoming = Array.isArray(body && body.products) ? body.products : [];
  incoming.forEach((p) => {
    const idx = d.products.findIndex((x) => x.kod === p.kod);
    if (idx >= 0) d.products[idx] = { ...d.products[idx], ...p };
    else d.products.push(p);
  });
});
route("POST", "/api/restore", (d, _p, incoming) => {
  const arr = (k) => (Array.isArray(incoming && incoming[k]) ? incoming[k] : []);
  return {
    replace: {
      products: arr("products"), sales: arr("sales"), employees: arr("employees"), suppliers: arr("suppliers"),
      stockMovements: arr("stockMovements"), purchases: arr("purchases"), priceChanges: arr("priceChanges"),
      scannerUsers: arr("scannerUsers"), shifts: arr("shifts"),
      settings: incoming && typeof incoming.settings === "object" ? { ...d.settings, ...incoming.settings, apiToken: d.settings.apiToken } : d.settings,
    },
  };
});

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function handle(method, pathname, rawBody) {
  let body = null;
  if (rawBody != null && rawBody !== "") {
    try {
      body = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
    } catch {
      body = null;
    }
  }
  for (const r of routes) {
    if (r.method !== method) continue;
    const m = pathname.match(r.re);
    if (!m) continue;
    const params = {};
    r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
    // Work on a copy so a route that fails half-way leaves the store intact.
    const data = JSON.parse(JSON.stringify(load()));
    try {
      // A handler returns nothing when it mutated the store (respond with the
      // whole new state, like the real server), { replace } for a restore,
      // or a plain object to send back as-is (ping, state, login...).
      const out = r.handler(data, params, body);
      if (out === undefined) {
        save(data);
        return json(200, data);
      }
      if (out.replace) {
        save(ensureShape(out.replace));
        return json(200, out.replace);
      }
      return json(200, out);
    } catch (err) {
      if (err instanceof HttpError) return json(err.status, { error: err.message });
      console.error(err);
      return json(500, { error: "Demo xətası." });
    }
  }
  return json(404, { error: "Tapılmadı." });
}

export function installDemoServer() {
  if (typeof window === "undefined" || window.__zehraDemoInstalled) return;
  window.__zehraDemoInstalled = true;
  load(); // before the first render, so stale local state is cleared in time
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input && input.url;
    let parsed;
    try {
      parsed = new URL(url, window.location.href);
    } catch {
      return realFetch(input, init);
    }
    if (!parsed.pathname.startsWith("/api/")) return realFetch(input, init);
    const method = String(init.method || (typeof input === "object" && input.method) || "GET").toUpperCase();
    return handle(method, parsed.pathname, init.body);
  };
}
