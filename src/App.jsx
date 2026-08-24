import React, { useState, useMemo, useContext, createContext } from "react";
import {
  ShoppingCart, ShoppingBasket, ScanBarcode, User, LogOut, Clock, Trash2, Plus, Minus,
  Receipt, History, XCircle, Banknote, CreditCard, Check,
  LayoutGrid, Package, Boxes, LineChart, FileBarChart2, Users, Truck,
  Settings, ChevronRight, Search, TrendingUp, AlertTriangle, Wallet, X, Download, Upload, Lock,
} from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip } from "recharts";
import * as XLSX from "xlsx";

/* ---------------------------------------------------------------- */
/* Shared mock data                                                  */
/* ---------------------------------------------------------------- */

const TODAY_STR = "21.08.2026"; // only used for the built-in demo/seed data below

const pad2 = (n) => String(n).padStart(2, "0");
// Real "now", formatted the same way the rest of the app stores dates (DD.MM.YYYY[ HH:MM]).
const nowDateStr = () => {
  const d = new Date();
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
};
const nowStr = () => {
  const d = new Date();
  return `${nowDateStr()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

const INITIAL_PRODUCTS = [
  { kod: "5449000000996", ad: "Coca Cola 1L", kat: "İçkilər", alish: 1.2, satish: 1.6, endirim: 0, stok: 84, minimum: 20, novu: "eded", tereziKodu: "" },
  { kod: "4760095000119", ad: "Çörək (Kənd çörəyi)", kat: "Çörək", alish: 0.32, satish: 0.4, endirim: 0, stok: 22, minimum: 30, novu: "eded", tereziKodu: "" },
  { kod: "4760095000157", ad: "Süd 1L", kat: "Süd məhsulları", alish: 1.05, satish: 1.3, endirim: 0, stok: 7, minimum: 20, novu: "eded", tereziKodu: "" },
  { kod: "4760095000126", ad: "Su 1.5L", kat: "İçkilər", alish: 0.35, satish: 0.5, endirim: 0, stok: 126, minimum: 40, novu: "eded", tereziKodu: "" },
  { kod: "8683130012345", ad: "Çay Doğuş 500gr", kat: "Çay", alish: 3.4, satish: 4.5, endirim: 10, stok: 41, minimum: 15, novu: "eded", tereziKodu: "" },
  { kod: "8697418023456", ad: "Ariel Yuyucu 3kg", kat: "Məişət", alish: 9.8, satish: 12.9, endirim: 15, stok: 9, minimum: 15, novu: "eded", tereziKodu: "" },
  { kod: "2000000000010", ad: "Pomidor (çəki ilə)", kat: "Tərəvəz", alish: 1.5, satish: 2.2, endirim: 0, stok: 45, minimum: 10, novu: "çəki", tereziKodu: "00010" },
];

const INITIAL_CART = [
  { kod: "5449000000996", ad: "Coca Cola 1L", qiymet: 1.6, endirim: 0, miqdar: 1 },
  { kod: "4760095000119", ad: "Çörək (Kənd çörəyi)", qiymet: 0.4, endirim: 0, miqdar: 1 },
  { kod: "4760095000157", ad: "Süd 1L", qiymet: 1.3, endirim: 0, miqdar: 1 },
  { kod: "8683130012345", ad: "Çay Doğuş 500gr", qiymet: 4.5, endirim: 10, miqdar: 1 },
  { kod: "8697418023456", ad: "Ariel Yuyucu 3kg", qiymet: 12.9, endirim: 15, miqdar: 1 },
];

const INITIAL_SALES = [
  {
    no: "#000921", tarix: "20.08.2026 14:35", kassir: "Kassir 01", say: 5, meblegh: 18.72,
    odenish: "KART", status: "Tamamlandı",
    items: [
      { kod: "5449000000996", ad: "Coca Cola 1L", qiymet: 1.6, endirim: 0, miqdar: 1 },
      { kod: "4760095000119", ad: "Çörək (Kənd çörəyi)", qiymet: 0.4, endirim: 0, miqdar: 1 },
      { kod: "4760095000157", ad: "Süd 1L", qiymet: 1.3, endirim: 0, miqdar: 1 },
      { kod: "8683130012345", ad: "Çay Doğuş 500gr", qiymet: 4.5, endirim: 10, miqdar: 1 },
      { kod: "8697418023456", ad: "Ariel Yuyucu 3kg", qiymet: 12.9, endirim: 15, miqdar: 1 },
    ],
  },
  { no: "#000920", tarix: "20.08.2026 14:29", kassir: "Kassir 01", say: 8, meblegh: 42.1, odenish: "NƏĞD", status: "Tamamlandı",
    items: [{ kod: "-", ad: "Müxtəlif məhsullar", qiymet: 42.1, endirim: 0, miqdar: 1 }] },
  { no: "#000919", tarix: "20.08.2026 14:17", kassir: "Kassir 01", say: 3, meblegh: 7.8, odenish: "KART", status: "Tamamlandı",
    items: [{ kod: "-", ad: "Müxtəlif məhsullar", qiymet: 7.8, endirim: 0, miqdar: 1 }] },
  { no: "#000918", tarix: "20.08.2026 14:02", kassir: "Kassir 02", say: 12, meblegh: 61.4, odenish: "NƏĞD", status: "Tamamlandı",
    items: [{ kod: "-", ad: "Müxtəlif məhsullar", qiymet: 61.4, endirim: 0, miqdar: 1 }] },
  { no: "#000917", tarix: "20.08.2026 13:55", kassir: "Kassir 02", say: 4, meblegh: 15.3, odenish: "KART", status: "Ləğv edilib",
    items: [{ kod: "-", ad: "Müxtəlif məhsullar", qiymet: 15.3, endirim: 0, miqdar: 1 }] },
  { no: "#000916", tarix: "20.08.2026 13:41", kassir: "Kassir 01", say: 6, meblegh: 23.9, odenish: "NƏĞD", status: "Tamamlandı",
    items: [{ kod: "-", ad: "Müxtəlif məhsullar", qiymet: 23.9, endirim: 0, miqdar: 1 }] },
];

const INITIAL_EMPLOYEES = [
  { ad: "Kassir 01", rol: "Kassir", icaze: "Yalnız kassa", status: "Aktiv", giris: "14:35" },
  { ad: "Kassir 02", rol: "Kassir", icaze: "Yalnız kassa", status: "Aktiv", giris: "13:55" },
  { ad: "Elvin", rol: "Rəhbər", icaze: "Tam giriş", status: "Aktiv", giris: "14:42" },
];

const INITIAL_SUPPLIERS = [
  { ad: "Araz Distribusiya", tel: "050 000 00 00", sonAlish: "20.08.2026", meblegh: 1240, borc: 0, status: "Aktiv" },
  { ad: "Qida Təchizat MMC", tel: "051 000 00 00", sonAlish: "18.08.2026", meblegh: 860, borc: 320, status: "Borc var" },
  { ad: "Məişət MMC", tel: "055 000 00 00", sonAlish: "16.08.2026", meblegh: 1480, borc: 0, status: "Aktiv" },
  { ad: "İçki Distribusiya", tel: "070 000 00 00", sonAlish: "15.08.2026", meblegh: 2160, borc: 540, status: "Borc var" },
];

const INITIAL_SETTINGS = {
  magazaAdi: "ZƏHRA MARKET",
  voen: "1234567891",
  telefon: "012 123 45 67",
  unvan: "Bakı şəhəri, Nəsimi r-nu",
  valyuta: "AZN",
  printer: "Printer 01 — Aktiv",
  avtomatikCek: true,
  endirimSistemi: true,
  tereziPrefiks: "22",
  adminSifre: "",
  cekBasliqQeydi: "",
  cekTesekkurMesaji: "TƏŞƏKKÜRLƏR!\nXoş gəlmisiniz!",
};

const TOP_PRODUCTS = [
  { ad: "Coca Cola 1L", meblegh: 486.4 },
  { ad: "Çörək", meblegh: 320.8 },
  { ad: "Süd 1L", meblegh: 289.9 },
  { ad: "Su 1.5L", meblegh: 242.5 },
  { ad: "Çay Doğuş", meblegh: 198.0 },
];

const CHART_DATA = [
  { gun: "14", satish: 3120 },
  { gun: "15", satish: 3680 },
  { gun: "16", satish: 2940 },
  { gun: "17", satish: 4010 },
  { gun: "18", satish: 3550 },
  { gun: "19", satish: 3980 },
  { gun: "20", satish: 4286.7 },
];

const fmt = (n) => (n || 0).toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Rounds a money value to the nearest qəpik. Chained float multiplication/
// subtraction (price × qty × discount, summed and subtracted across a cart)
// routinely lands a fraction of a qəpik off exact, so anywhere a total gets
// compared against a typed amount, both sides need to go through this first.
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Small icon for "Barkodu yoxdur" quick-add items (fresh bread, eggs, etc.),
// guessed from keywords in the product name. Purely cosmetic — falls back to
// a generic box icon when nothing matches.
const BARKODSUZ_ICON_RULES = [
  { keys: ["COREY", "ÇÖRƏK", "BAGET", "BULKA", "FRANSIZ"], icon: "🍞" },
  { keys: ["YUMURTA"], icon: "🥚" },
  { keys: ["SUD", "SÜD"], icon: "🥛" },
  { keys: ["SU ", "SU1", "SU5"], icon: "💧" },
  { keys: ["PENDIR", "PEYNIR"], icon: "🧀" },
  { keys: ["ET ", "TOYUQ", "MURGH"], icon: "🍗" },
  { keys: ["TERAVEZ", "TƏRƏVƏZ", "POMIDOR", "XIYAR", "SOGAN"], icon: "🥦" },
  { keys: ["MEYVE", "MEYVƏ", "ALMA", "BANAN"], icon: "🍎" },
  { keys: ["KEKS", "TORT", "PECENYA", "PEÇENYE"], icon: "🍰" },
];
function barkodsuzIcon(name) {
  const upper = (name || "").toUpperCase();
  for (const rule of BARKODSUZ_ICON_RULES) {
    if (rule.keys.some((k) => upper.includes(k))) return rule.icon;
  }
  return "📦";
}

// Fixed low-stock threshold — not configurable per product. Below this,
// items are flagged/sorted to the top everywhere stock status is shown.
const LOW_STOCK_ESIYI = 5;

const mehsulStatus = (p) => {
  if (p.endirim > 0) return "Endirim";
  if (p.stok <= 0) return "Bitib";
  if (p.stok <= LOW_STOCK_ESIYI) return "Azalır";
  return "Normal";
};

const stokVeziyyet = (p) => {
  if (p.stok <= 0) return "Təcili";
  if (p.stok <= LOW_STOCK_ESIYI) return "Sifariş ver";
  return "Normal";
};

const generateSaleNo = (sales) => {
  const nums = sales.map((s) => parseInt(String(s.no).replace("#", ""), 10)).filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 920;
  return "#" + String(max + 1).padStart(6, "0");
};

// Small dependency-free CSV parser (handles quoted fields containing commas).
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/* ---------------------------------------------------------------- */
/* Shared market data context                                        */
/* ---------------------------------------------------------------- */

const MarketContext = createContext(null);
const useMarket = () => useContext(MarketContext);

const emptyState = { products: [], sales: [], employees: [], suppliers: [], stockMovements: [], purchases: [], settings: INITIAL_SETTINGS };

const PENDING_SALES_KEY = "zehra_pending_sales";
const PENDING_STOCK_KEY = "zehra_pending_stock";
// Everything, but only the RECENT slice of sales — a full year of receipts
// can be many MB (this store's whole history alone was ~10MB) and a Kassa
// PC only ever needs to browse recent checks while offline, not the entire
// archive. The catalog (products/settings/etc, a few MB) plus a few hundred
// recent receipts comfortably fits localStorage's ~10MB ceiling. Written on
// every successful sync, so a Kassa PC that boots up before the Admin PC is
// even on for the day still has this morning's — or worst case, yesterday's
// — prices, stock, and recent checks to work with, instead of an empty
// "Nəticə tapılmadı" catalog until the two computers happen to be on at the
// same time.
const CATALOG_CACHE_KEY = "zehra_catalog_cache";
const CACHED_SALES_LIMIT = 300;

function loadCachedCatalog() {
  try {
    const cached = JSON.parse(localStorage.getItem(CATALOG_CACHE_KEY) || "null");
    if (!cached) return emptyState;
    return { ...emptyState, ...cached, sales: cached.sales || [] };
  } catch {
    return emptyState;
  }
}

function saveCachedCatalog(data) {
  try {
    const { products, employees, suppliers, settings, sales } = data;
    // Sales are newest-first (server unshift()s new ones onto the front).
    localStorage.setItem(
      CATALOG_CACHE_KEY,
      JSON.stringify({ products, employees, suppliers, settings, sales: (sales || []).slice(0, CACHED_SALES_LIMIT) })
    );
  } catch (err) {
    // Quota exceeded or storage disabled — offline catalog just won't be
    // available next cold boot; the live app keeps working either way.
    console.error("Catalog cache could not be saved:", err);
  }
}

function MarketProvider({ children, serverUrl, token = "" }) {
  const [state, setState] = useState(loadCachedCatalog);
  const [connected, setConnected] = useState(true);
  const [loading, setLoading] = useState(true);
  const [pendingSales, setPendingSales] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(PENDING_SALES_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const pendingRef = React.useRef(pendingSales);
  pendingRef.current = pendingSales;

  const persistPending = (list) => {
    setPendingSales(list);
    localStorage.setItem(PENDING_SALES_KEY, JSON.stringify(list));
  };

  // Same idea as pendingSales: a stock-in/write-off made while offline
  // shouldn't just fail with an error and force the cashier to remember to
  // redo it later. Queued locally, applied to the *local* product list
  // immediately (so the count on screen is right straight away), and
  // replayed to the server in order once the connection is back.
  const [pendingStock, setPendingStock] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(PENDING_STOCK_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const pendingStockRef = React.useRef(pendingStock);
  pendingStockRef.current = pendingStock;

  const persistPendingStock = (list) => {
    setPendingStock(list);
    localStorage.setItem(PENDING_STOCK_KEY, JSON.stringify(list));
  };

  // Set only after the Admin-panel password prompt is passed (see Inner/
  // submitPw). Kept in memory only, never persisted — sent alongside the
  // shared LAN token so the server can enforce admin-only routes itself,
  // instead of trusting the client not to call them.
  const [adminPw, setAdminPw] = useState("");
  const authHeaders = () => ({
    ...(token ? { "x-api-token": token } : {}),
    ...(adminPw ? { "x-admin-password": adminPw } : {}),
  });

  // The full store (400+ products, all sales history, stock movements) is
  // re-fetched every few seconds so a Kassa PC picks up changes made on the
  // Admin PC (and vice versa). As that history grows over months, re-parsing
  // and re-rendering the *entire* app on every poll — even when nothing
  // actually changed, which is most of the time — got heavy enough on the
  // shop's old Windows 7 hardware to make typing into a just-opened field
  // feel frozen for minutes if a poll landed mid-interaction. Two guards:
  // skip the JSON.parse + re-render entirely when the raw response is
  // byte-identical to last time, and don't poll at all while a modal (i.e.
  // someone is actively filling in a form) is open.
  const lastRawRef = React.useRef("");
  const refresh = async () => {
    if (parseInt(document.body.dataset.modalCount || "0", 10) > 0) return;
    try {
      const res = await fetch(`${serverUrl}/api/state`, { headers: authHeaders() });
      if (!res.ok) throw new Error("bad response");
      const text = await res.text();
      setConnected(true);
      if (text !== lastRawRef.current) {
        lastRawRef.current = text;
        const parsed = JSON.parse(text);
        setState(parsed);
        saveCachedCatalog(parsed);
      }
    } catch (err) {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    refresh();
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [serverUrl, token]);

  const call = async (method, path, body) => {
    try {
      const res = await fetch(`${serverUrl}${path}`, {
        method,
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: body != null ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error("bad response");
      const data = await res.json();
      setState(data);
      lastRawRef.current = JSON.stringify(data);
      saveCachedCatalog(data);
      setConnected(true);
      return true;
    } catch (err) {
      setConnected(false);
      return false;
    }
  };

  const addProduct = (p) => call("POST", "/api/products", p);
  const updateProduct = (kod, patch) => call("PUT", `/api/products/${encodeURIComponent(kod)}`, patch);
  // delta > 0 = mal gəldi (stock-in), delta < 0 = stokdan çıxar (write-off,
  // reason required) — recorded as a stock movement instead of silently
  // overwriting the total. Offline, this queues (same as addSale) instead
  // of just failing: a "Mal gəldi"/"Stokdan çıxar" made while the Admin PC
  // is unreachable is applied to the local product list right away — so
  // the count on screen is correct immediately — and replayed to the
  // server, in order, once the connection returns.
  const adjustStockBy = async (kod, delta, reason) => {
    const ok = await call("POST", "/api/stock/adjust", { kod, delta, reason });
    if (ok) return true;
    persistPendingStock([...pendingStockRef.current, { kod, delta, reason }]);
    setState((s) => ({
      ...s,
      products: s.products.map((p) => (p.kod === kod ? { ...p, stok: Math.max(0, (p.stok || 0) + delta) } : p)),
    }));
    return true;
  };
  const deleteProduct = (kod) => call("DELETE", `/api/products/${encodeURIComponent(kod)}`);
  const adjustStock = (kod, newStok) => updateProduct(kod, { stok: newStok });
  const addSupplier = (s) => call("POST", "/api/suppliers", s);
  const updateSupplier = (ad, patch) => call("PUT", `/api/suppliers/${encodeURIComponent(ad)}`, patch);
  const deleteSupplier = (ad) => call("DELETE", `/api/suppliers/${encodeURIComponent(ad)}`);
  const addEmployee = (e) => call("POST", "/api/employees", e);
  const deleteEmployee = (ad) => call("DELETE", `/api/employees/${encodeURIComponent(ad)}`);

  // A sale must never be lost just because the Kassa lost its connection to
  // the Admin PC mid-shift. If the POST fails, the sale is kept in a local
  // queue (also persisted to localStorage, so it survives a page reload)
  // and gets pushed to the server automatically once we're back online.
  const addSale = async (sale) => {
    const ok = await call("POST", "/api/sales", sale);
    if (!ok) persistPending([...pendingRef.current, sale]);
    return true; // the sale is captured either way — the receipt can proceed
  };

  React.useEffect(() => {
    if (!connected || pendingRef.current.length === 0) return;
    let cancelled = false;
    (async () => {
      const remaining = [...pendingRef.current];
      while (remaining.length > 0 && !cancelled) {
        const ok = await call("POST", "/api/sales", remaining[0]);
        if (!ok) break; // still can't reach the server — stop, retry on next reconnect
        remaining.shift();
        persistPending(remaining);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connected]);

  React.useEffect(() => {
    if (!connected || pendingStockRef.current.length === 0) return;
    let cancelled = false;
    (async () => {
      const remaining = [...pendingStockRef.current];
      while (remaining.length > 0 && !cancelled) {
        const { kod, delta, reason } = remaining[0];
        const ok = await call("POST", "/api/stock/adjust", { kod, delta, reason });
        if (!ok) break; // still can't reach the server — stop, retry on next reconnect
        remaining.shift();
        persistPendingStock(remaining);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connected]);
  const addPurchase = (payload) => call("POST", "/api/purchases", payload);
  const setSettings = (s) => call("PUT", "/api/settings", s);
  const restoreBackup = (data) => call("POST", "/api/restore", data);
  const importProducts = (list) => call("POST", "/api/products/import", { products: list });
  const resetSales = () => call("POST", "/api/sales/reset");
  // Gives every line item's quantity back to stock and marks the receipt
  // returned — for a returned pending (not-yet-synced) sale there's nothing
  // on the server to reverse yet, so that case is rejected up front.
  const returnSale = (no) => {
    if (pendingRef.current.some((s) => s.no === no)) return Promise.resolve(false);
    return call("POST", "/api/sales/return", { no });
  };

  const value = {
    ...state,
    sales: [...pendingSales.map((s) => ({ ...s, _pending: true })), ...state.sales],
    pendingCount: pendingSales.length,
    pendingStockCount: pendingStock.length,
    connected, loading,
    addProduct, updateProduct, deleteProduct, adjustStock, adjustStockBy, returnSale,
    addSupplier, updateSupplier, deleteSupplier, addEmployee, deleteEmployee, addSale, addPurchase, setSettings, restoreBackup,
    importProducts, resetSales, setAdminPw, adminPw,
  };

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

/* ---------------------------------------------------------------- */
/* Role setup — first launch on each PC decides Admin (server) or    */
/* Kassa (client connecting to the Admin PC over the local network)  */
/* ---------------------------------------------------------------- */

function useDeviceRole() {
  const [role, setRoleState] = useState(() => localStorage.getItem("zehra_role") || "");
  const [serverUrl, setServerUrlState] = useState(
    () => localStorage.getItem("zehra_server_url") || "http://127.0.0.1:4000"
  );
  const [token, setTokenState] = useState(() => localStorage.getItem("zehra_token") || "");
  const setRole = (r, url, tok) => {
    localStorage.setItem("zehra_role", r);
    localStorage.setItem("zehra_server_url", url);
    localStorage.setItem("zehra_token", tok || "");
    setRoleState(r);
    setServerUrlState(url);
    setTokenState(tok || "");
  };
  const reset = () => {
    localStorage.removeItem("zehra_role");
    localStorage.removeItem("zehra_server_url");
    localStorage.removeItem("zehra_token");
    setRoleState("");
  };
  return { role, serverUrl, token, setRole, reset };
}

function RoleSetup({ onDone }) {
  const [step, setStep] = useState("choose"); // choose | admin-ip | kassa-ip
  const [ip, setIp] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState("");
  const [adminIp, setAdminIp] = useState(null);
  const [adminToken, setAdminToken] = useState(null);

  const chooseAdmin = async () => {
    setStep("admin-ip");
    try {
      const res = await fetch("http://127.0.0.1:4000/api/network-info");
      const data = await res.json();
      setAdminIp(data.ip || null);
      setAdminToken(data.token || null);
    } catch {
      setAdminIp(null);
      setAdminToken(null);
    }
  };

  const connectKassa = async () => {
    const url = `http://${ip.trim()}:4000`;
    setTesting(true);
    setTestError("");
    try {
      const res = await fetch(`${url}/api/ping`);
      if (!res.ok) throw new Error();
      const stateRes = await fetch(`${url}/api/state`, { headers: { "x-api-token": tokenInput.trim() } });
      if (!stateRes.ok) throw new Error("token");
      onDone("kassa", url, tokenInput.trim());
    } catch {
      setTestError("Qoşulmaq mümkün olmadı. IP ünvanını, tokeni və Admin kompüterinin açıq olduğunu yoxlayın.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f5] flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        {step === "choose" && (
          <>
            <div className="text-center mb-6">
              <div className="font-black text-lg">Bu kompüter hansı roldadır?</div>
              <div className="text-sm text-gray-400 mt-1">Bu seçim yalnız bir dəfə edilir, hər açılışda soruşulmur.</div>
            </div>
            <div className="space-y-3">
              <button
                onClick={chooseAdmin}
                className="w-full border-2 border-[#16a34a] bg-green-50 rounded-2xl p-4 text-left hover:bg-green-100"
              >
                <div className="font-bold text-[#166534]">ADMİN (Baza)</div>
                <div className="text-xs text-gray-500 mt-1">
                  Bu kompüter bütün məlumatı saxlayacaq (məhsul, stok, satış) və digər kassa kompüterlərinə xidmət göstərəcək.
                </div>
              </button>
              <button
                onClick={() => setStep("kassa-ip")}
                className="w-full border-2 border-gray-200 rounded-2xl p-4 text-left hover:border-gray-300"
              >
                <div className="font-bold">KASSA (yalnız satış)</div>
                <div className="text-xs text-gray-500 mt-1">
                  Bu kompüter Admin kompüterinə şəbəkə üzərindən qoşulacaq, öz məlumatını saxlamayacaq.
                </div>
              </button>
            </div>
          </>
        )}
        {step === "admin-ip" && (
          <>
            <div className="text-center mb-6">
              <div className="font-black text-lg">Bu kompüterin IP ünvanı</div>
              <div className="text-sm text-gray-400 mt-1">
                Kassa kompüterlərində qoşularkən bu ünvanı yazın. Bu ekran proqramın içində istənilən vaxt görünəcək.
              </div>
            </div>
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 text-center mb-5">
              {adminIp ? (
                <div className="font-black text-3xl text-[#166534] font-mono tracking-wide">{adminIp}</div>
              ) : (
                <div className="text-sm text-gray-500">
                  IP ünvanı avtomatik tapılmadı. Command Prompt-da <code className="font-mono">ipconfig</code> yazıb "IPv4 Address" sətrini istifadə edin.
                </div>
              )}
            </div>
            {adminToken && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 text-center mb-5">
                <div className="text-xs text-gray-500 mb-1">Kassa kompüterlərinə bu tokeni də verin</div>
                <div className="font-black text-xl text-blue-700 font-mono tracking-widest">{adminToken}</div>
              </div>
            )}
            <button
              onClick={() => onDone("admin", "http://127.0.0.1:4000", adminToken)}
              className="w-full bg-[#16a34a] hover:bg-[#15803d] text-white rounded-xl py-3 font-bold text-sm"
            >
              Davam et
            </button>
          </>
        )}
        {step === "kassa-ip" && (
          <>
            <div className="text-center mb-6">
              <div className="font-black text-lg">Admin kompüterinin IP ünvanı</div>
              <div className="text-sm text-gray-400 mt-1">
                Admin kompüterini açanda ona bu ünvan göstərilir (rol seçimindən sonra).
              </div>
            </div>
            <div className="space-y-3">
              <FormField label="IP ünvanı" placeholder="məs. 192.168.1.15" value={ip} onChange={(e) => setIp(e.target.value)} />
              <FormField
                label="Token"
                placeholder="Admin ekranında göstərilən kod"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
              />
            </div>
            {testError && <div className="text-red-500 text-xs font-semibold mt-2">{testError}</div>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setStep("choose")} className="flex-1 py-2.5 rounded-xl border border-gray-200 font-semibold text-gray-500 text-sm">
                Geri
              </button>
              <button
                onClick={connectKassa}
                disabled={!ip.trim() || !tokenInput.trim() || testing}
                className="flex-[2] bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-40 text-white rounded-xl py-2.5 font-bold text-sm"
              >
                {testing ? "Yoxlanılır..." : "Qoşul"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Small shared UI helpers                                           */
/* ---------------------------------------------------------------- */

function Logo({ size = "md", showText = true }) {
  const box = size === "sm" ? 46 : size === "xs" ? 22 : 56;
  const text = size === "sm" ? "text-xl" : "text-2xl";
  return (
    <div className="flex items-center gap-3">
      <svg width={box} height={box} viewBox="0 0 64 64" className="shrink-0">
        <defs>
          <linearGradient id="zmBadge" x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="55%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
          <linearGradient id="zmBasket" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#eaf2fc" />
          </linearGradient>
          <filter id="zmShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#0f2a4d" floodOpacity="0.45" />
          </filter>
        </defs>

        <rect x="3" y="3" width="58" height="58" rx="15" fill="url(#zmBadge)" filter="url(#zmShadow)" />
        <path d="M6 15 Q32 1 58 15 L58 24 Q32 13 6 24 Z" fill="#ffffff" opacity="0.16" />

        <g transform="translate(32,35)">
          <path d="M-10 -15 Q0 -25 10 -15" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M-15 -13 L15 -13 L11 10 L-11 10 Z" fill="url(#zmBasket)" />
          <path d="M-15 -13 L15 -13 L13.3 -6.5 L-13.3 -6.5 Z" fill="#2563eb" opacity="0.9" />
          <line x1="-8.5" y1="-11" x2="-6.5" y2="8" stroke="#3b82f6" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="0" y1="-11" x2="0" y2="8" stroke="#3b82f6" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="8.5" y1="-11" x2="6.5" y2="8" stroke="#3b82f6" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="-6" cy="15" r="2.6" fill="#1e3a8a" />
          <circle cx="6" cy="15" r="2.6" fill="#1e3a8a" />
          <circle cx="-6" cy="15" r="1" fill="#ffffff" />
          <circle cx="6" cy="15" r="1" fill="#ffffff" />
        </g>

        <circle cx="49" cy="15" r="6" fill="#eab308" stroke="#ffffff" strokeWidth="2.2" />
      </svg>
      {showText && (
        <div className={`font-black leading-none ${text} whitespace-nowrap`}>
          <span className="text-[#2563eb]" style={{ filter: "drop-shadow(0 2px 1.5px rgba(0,0,0,0.3))" }}>
            ZƏHRA
          </span>{" "}
          <span className="text-[#eab308]" style={{ filter: "drop-shadow(0 2px 1.5px rgba(0,0,0,0.3))" }}>
            MARKET
          </span>
        </div>
      )}
    </div>
  );
}


function Modal({ title, onClose, children, widthClass = "max-w-md" }) {
  React.useEffect(() => {
    const n = parseInt(document.body.dataset.modalCount || "0", 10) + 1;
    document.body.dataset.modalCount = String(n);
    return () => {
      const n2 = Math.max(0, parseInt(document.body.dataset.modalCount || "0", 10) - 1);
      document.body.dataset.modalCount = String(n2);
    };
  }, []);
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-2xl w-full ${widthClass} overflow-hidden max-h-[85vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#15803d] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <span className="font-bold">{title}</span>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 overflow-auto">{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, ...props }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <input
        {...props}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400"
      />
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* KASSA (POS) VIEW                                                  */
/* ---------------------------------------------------------------- */

function KassaView({ role }) {
  const canDiscount = role !== "kassa";
  const { products, sales, addSale, returnSale, settings, updateProduct, adminPw, setAdminPw } = useMarket();
  const [returningNo, setReturningNo] = useState(null);
  const [returnMsg, setReturnMsg] = useState(null);

  const handleReturn = async (sale) => {
    if (!window.confirm(`Çek ${sale.no} (${fmt(sale.meblegh)} AZN) geri qaytarılsın? Mallar stoka əlavə olunacaq.`)) return;
    setReturningNo(sale.no);
    const ok = await returnSale(sale.no);
    setReturningNo(null);
    setReturnMsg({ isError: !ok, text: ok ? `Çek ${sale.no} geri qaytarıldı.` : "Geri qaytarma alınmadı — serverlə əlaqəni yoxlayın." });
    setTimeout(() => setReturnMsg(null), 3500);
  };
  // A large imported sales history (tens of thousands of receipts) would
  // freeze this modal if rendered in full — only the most recent ones matter
  // here, newest first; not-yet-synced sales are prepended by useMarket().
  const recentSales = useMemo(() => {
    const pending = sales.filter((s) => s._pending);
    const synced = sales.filter((s) => !s._pending).slice(-50).reverse();
    return [...pending, ...synced];
  }, [sales]);
  const [cart, setCart] = useState([]);
  const [query, setQuery] = useState("");
  const [discountPct, setDiscountPct] = useState("0");
  const [payOpen, setPayOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [method, setMethod] = useState("nagd");
  const [received, setReceived] = useState("0.00");
  const [cardPart, setCardPart] = useState("0.00");
  // Split (Qarışıq) payment used to make the cashier compute the cash
  // portion themselves before it would accept anything ("50 qəpiyi kartdan
  // çək" meant they had to work out the other 1.00 AZN by hand). Now the
  // cashier only enters the card amount and, optionally, the cash actually
  // handed over — the cash portion and change are derived, same as a plain
  // cash sale.
  const [mixedReceived, setMixedReceived] = useState("");
  const [lastSale, setLastSale] = useState(null);
  const [viewSale, setViewSale] = useState(null);
  const [scanMsg, setScanMsg] = useState(null);
  const [lastAdded, setLastAdded] = useState(null);
  // Barkodsuz siyahıdan çoxlu miqdar (məs. "50 yumurta") bir dəfəyə əlavə
  // etmək üçün — kassir hər dənə üçün ayrıca toxunmasın.
  const [barkodsuzQtyFor, setBarkodsuzQtyFor] = useState(null);
  const [barkodsuzQty, setBarkodsuzQty] = useState("1");
  // "+" üzərindən "Barkodsuz mallar" siyahısını idarə etmək (Məhsullar
  // səhifəsinə keçib hər birini tək-tək redaktə etmək əvəzinə birbaşa
  // buradan seçmək/çıxarmaq).
  const [barkodsuzPickerOpen, setBarkodsuzPickerOpen] = useState(false);
  const [bpQuery, setBpQuery] = useState("");
  const [bpBusyKod, setBpBusyKod] = useState(null);
  const [bpNeedsPw, setBpNeedsPw] = useState(false);
  const [bpPwInput, setBpPwInput] = useState("");
  const [bpPwError, setBpPwError] = useState(false);

  const bpMatches = useMemo(() => {
    const q = bpQuery.trim().toLowerCase();
    const pool = q
      ? products.filter((p) => p.ad.toLowerCase().includes(q) || p.kod.includes(q))
      : products.filter((p) => p.barkodsuz);
    return pool.slice(0, 30);
  }, [bpQuery, products]);

  const toggleBarkodsuz = async (p) => {
    setBpBusyKod(p.kod);
    const ok = await updateProduct(p.kod, { barkodsuz: !p.barkodsuz });
    setBpBusyKod(null);
    if (!ok) setBpNeedsPw(true);
  };

  const submitBpPw = () => {
    if (settings.adminSifre && bpPwInput === settings.adminSifre) {
      setAdminPw(bpPwInput);
      setBpNeedsPw(false);
      setBpPwInput("");
      setBpPwError(false);
    } else {
      setBpPwError(true);
    }
  };

  const lineTotal = (item) => item.qiymet * item.miqdar * (1 - item.endirim / 100);
  const subtotal = useMemo(() => cart.reduce((s, i) => s + lineTotal(i), 0), [cart]);
  const discountAmt = subtotal * ((parseFloat(discountPct) || 0) / 100);
  // Rounded to the qəpik (cent) before anything compares against it — chained
  // float math (price × qty × discount, summed across a cart) routinely lands
  // a fraction of a qəpik off exact (e.g. 1.5200000000000002), which made
  // "1.52" typed for a 1.52 total register as insufficient until the cashier
  // overpaid by a qəpik to clear the invisible remainder.
  const total = round2(Math.max(0, subtotal - discountAmt));
  const unitCount = cart.reduce((s, i) => s + i.miqdar, 0);
  const receivedNum = round2(parseFloat(received) || 0);
  const change = round2(Math.max(0, receivedNum - total));
  const insufficientCash = method === "nagd" && receivedNum < total;
  // The card amount is what the cashier actually enters; the cash portion
  // is always whatever's left of the total, never typed in by hand.
  const mixedCardPart = parseFloat(cardPart) || 0;
  const mixedCashPart = Math.max(0, total - mixedCardPart);
  const mixedCardTooHigh = method === "qarisiq" && mixedCardPart > total + 0.001;
  const mixedChange = Math.max(0, (parseFloat(mixedReceived) || 0) - mixedCashPart);
  const mixedReceivedInsufficient =
    method === "qarisiq" && mixedReceived.trim() !== "" && (parseFloat(mixedReceived) || 0) < mixedCashPart - 0.001;

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return products.filter((p) => p.ad.toLowerCase().includes(q) || p.kod.includes(q)).slice(0, 12);
  }, [query, products]);

  const barkodsuzMehsullar = useMemo(() => products.filter((p) => p.barkodsuz), [products]);

  const addToCart = (product, weightKg) => {
    setCart((c) => {
      const existing = c.find((i) => i.kod === product.kod);
      if (existing) {
        const delta = weightKg != null ? weightKg : 1;
        return c.map((i) => (i.kod === product.kod ? { ...i, miqdar: +(i.miqdar + delta).toFixed(3) } : i));
      }
      return [
        ...c,
        {
          kod: product.kod,
          ad: product.ad,
          qiymet: product.satish,
          endirim: product.endirim,
          miqdar: weightKg != null ? +weightKg.toFixed(3) : 1,
          novu: product.novu || "eded",
          vahid: product.vahid || "ədəd",
        },
      ];
    });
    setLastAdded({
      ad: product.ad,
      kat: product.kat,
      satish: product.satish,
      endirim: product.endirim,
      novu: product.novu || "eded",
      vahid: product.vahid || "ədəd",
      qty: weightKg != null ? +weightKg.toFixed(3) : 1,
    });
  };

  const changeQty = (kod, delta) => {
    setCart((c) =>
      c.map((i) => {
        if (i.kod !== kod) return i;
        const step = i.novu === "çəki" ? 0.1 * delta : delta;
        const min = i.novu === "çəki" ? 0.1 : 1;
        return { ...i, miqdar: +Math.max(min, i.miqdar + step).toFixed(3) };
      })
    );
  };
  const DELETE_CODE = "123123";
  const [confirmDeleteKod, setConfirmDeleteKod] = useState(null); // kod being deleted, or "__ALL__" for clear-cart
  const [deleteCodeInput, setDeleteCodeInput] = useState("");
  const [deleteError, setDeleteError] = useState(false);

  const requestRemoveItem = (kod) => {
    setConfirmDeleteKod(kod);
    setDeleteCodeInput("");
    setDeleteError(false);
  };

  const confirmDelete = () => {
    if (deleteCodeInput !== DELETE_CODE) {
      setDeleteError(true);
      return;
    }
    if (confirmDeleteKod === "__ALL__") {
      setCart([]);
      setLastAdded(null);
    } else {
      setCart((c) => c.filter((i) => i.kod !== confirmDeleteKod));
    }
    setConfirmDeleteKod(null);
  };

  const flashMsg = (text, isError) => {
    setScanMsg({ text, isError });
    setTimeout(() => setScanMsg(null), 2500);
  };

  // Parse a scanned code. Handles regular barcodes (exact kod match) and
  // weight-embedded scale barcodes (13 digits, configurable prefix, digits
  // 3-7 = tərəzi kodu, digits 8-12 = weight in grams).
  const handleScannedCode = (code) => {
    const prefix = settings.tereziPrefiks || "22";
    if (code.length === 13 && code.startsWith(prefix)) {
      const tereziKodu = code.slice(2, 7);
      const gram = parseInt(code.slice(7, 12), 10);
      const product = products.find((p) => p.tereziKodu === tereziKodu);
      if (product && !isNaN(gram)) {
        addToCart(product, gram / 1000);
        flashMsg(`${product.ad} əlavə olundu (${(gram / 1000).toFixed(3)} kq)`, false);
      } else {
        flashMsg(`Tərəzi kodu tapılmadı: ${tereziKodu}`, true);
      }
      return;
    }
    const product = products.find((p) => p.kod === code);
    if (product) {
      addToCart(product);
      flashMsg(`${product.ad} əlavə olundu`, false);
    } else {
      flashMsg(`Barkod tapılmadı: ${code}`, true);
    }
  };

  // Listen for real barcode-scanner input. Scanners behave like a very fast
  // keyboard, typing all digits then Enter — we buffer keystrokes and treat
  // a burst ending in Enter as a scanned code. Ignored while typing in a
  // normal text field, or while any modal/dialog is open.
  React.useEffect(() => {
    let buffer = "";
    let lastTime = 0;
    const onKeyDown = (e) => {
      if (parseInt(document.body.dataset.modalCount || "0", 10) > 0) return;
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const now = Date.now();
      if (now - lastTime > 80) buffer = "";
      lastTime = now;
      if (e.key === "Enter") {
        if (buffer.length >= 6) handleScannedCode(buffer);
        buffer = "";
        return;
      }
      if (/^[0-9]$/.test(e.key)) buffer += e.key;
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [products, settings]);

  // F8 = nağd ödəniş, F9 = kartla ödəniş (yalnız səbətdə məhsul olduqda və heç bir pəncərə açıq olmadıqda işləyir)
  React.useEffect(() => {
    const onFnKey = (e) => {
      if (parseInt(document.body.dataset.modalCount || "0", 10) > 0) return;
      if (e.key === "F8") {
        e.preventDefault();
        openPayment("nagd");
      } else if (e.key === "F9") {
        e.preventDefault();
        openPayment("kart");
      }
    };
    window.addEventListener("keydown", onFnKey);
    return () => window.removeEventListener("keydown", onFnKey);
  }, [cart, total]);

  // Also count the payment/receipt popups (which don't use the shared Modal
  // component) toward the same counter, so the listeners above pause for them too.
  React.useEffect(() => {
    if (!payOpen) return;
    const n = parseInt(document.body.dataset.modalCount || "0", 10) + 1;
    document.body.dataset.modalCount = String(n);
    return () => {
      const n2 = Math.max(0, parseInt(document.body.dataset.modalCount || "0", 10) - 1);
      document.body.dataset.modalCount = String(n2);
    };
  }, [payOpen]);

  React.useEffect(() => {
    if (!receiptOpen) return;
    const n = parseInt(document.body.dataset.modalCount || "0", 10) + 1;
    document.body.dataset.modalCount = String(n);
    return () => {
      const n2 = Math.max(0, parseInt(document.body.dataset.modalCount || "0", 10) - 1);
      document.body.dataset.modalCount = String(n2);
    };
  }, [receiptOpen]);

  const scanBarcode = () => {
    if (products.length === 0) return;
    const pick = products[Math.floor(Math.random() * products.length)];
    if (pick.novu === "çəki") {
      const randomKg = +(0.2 + Math.random() * 1.3).toFixed(3);
      addToCart(pick, randomKg);
      flashMsg(`${pick.ad} əlavə olundu (${randomKg.toFixed(3)} kq) — simulyasiya`, false);
    } else {
      addToCart(pick);
      flashMsg(`${pick.ad} əlavə olundu — simulyasiya`, false);
    }
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    setConfirmDeleteKod("__ALL__");
    setDeleteCodeInput("");
    setDeleteError(false);
  };

  const confirmSale = () => {
    if (method === "nagd" && (parseFloat(received) || 0) < total) return;
    if (method === "qarisiq" && (mixedCardTooHigh || mixedReceivedInsufficient)) return;
    const odenishLabel = method === "nagd" ? "NƏĞD" : method === "kart" ? "KART" : "QARIŞIQ";
    const sale = {
      no: generateSaleNo(sales),
      tarix: nowStr(),
      kassir: "Kassir 01",
      say: cart.length,
      meblegh: total,
      odenish: odenishLabel,
      status: "Tamamlandı",
      items: cart,
      received:
        method === "nagd" ? parseFloat(received) || total
        : method === "qarisiq" ? (parseFloat(mixedReceived) || mixedCashPart)
        : total,
      change: method === "nagd" ? change : method === "qarisiq" ? mixedChange : 0,
      method,
      // Only meaningful for a split (qarışıq) payment — how much of the
      // total was paid in cash vs by card, shown as a breakdown on the receipt.
      cashPart: method === "qarisiq" ? mixedCashPart : null,
      cardPart: method === "qarisiq" ? mixedCardPart : null,
    };
    addSale(sale);
    setLastSale(sale);
    setViewSale(sale);
    setPayOpen(false);
    // No auto-print here — the receipt modal has its own "Çeki çap et" /
    // "Bağla" choice, so nothing goes to the printer unless the cashier
    // explicitly asks for it.
    setReceiptOpen(true);
    setCart([]);
    setLastAdded(null);
    setDiscountPct("0");
  };

  const openPayment = (m) => {
    if (cart.length === 0) return;
    setMethod(m);
    setReceived(total.toFixed(2));
    setCardPart("0.00");
    setMixedReceived("");
    setPayOpen(true);
  };

  const openLastReceipt = () => {
    if (!lastSale) return;
    setViewSale(lastSale);
    setReceiptOpen(true);
  };

  const openFromHistory = (sale) => {
    setViewSale(sale);
    setHistoryOpen(false);
    setReceiptOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f4f6f5] font-sans text-[#1a2b22]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#08281f] to-[#0e3a2b] px-6 py-3 flex items-center gap-4">
        <Logo size="sm" />
        <div className="flex-1 relative max-w-2xl">
          <div className="bg-white rounded-xl flex items-center gap-3 pl-4 pr-2 py-2.5">
            <Search size={18} className="text-gray-400 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Məhsul axtar..."
              className="w-full text-sm outline-none"
            />
            <button
              onClick={scanBarcode}
              title="Barkodu sına (simulyasiya)"
              className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center shrink-0"
            >
              <ScanBarcode size={18} className="text-[#166534]" />
            </button>
          </div>
          {query.trim() && matches.length === 0 && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm text-gray-400">
              Nəticə tapılmadı
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setHistoryOpen(true)}
            title="Son çeklər"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <History size={16} />
          </button>
          <button
            onClick={openLastReceipt}
            disabled={!lastSale}
            title="Çeki göstər"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white disabled:opacity-30"
          >
            <Receipt size={16} />
          </button>
          <div className="bg-white/10 rounded-full pl-3 pr-4 py-2 flex items-center gap-2 text-white">
            <User size={16} />
            <span className="text-sm font-semibold">Kassir 1</span>
          </div>
        </div>
      </div>

      {scanMsg && (
        <div className={`px-6 py-2 text-sm font-semibold ${scanMsg.isError ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
          {scanMsg.text}
        </div>
      )}

      <div className="p-6 grid grid-cols-[1fr_320px] gap-5" style={{ minHeight: "calc(100vh - 68px)" }}>
        {/* Left/center: the cart — now the big, primary area */}
        <div className="bg-white rounded-2xl border border-gray-200 flex flex-col">
          <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">Səbət</span>
              <span className="bg-[#16a34a] text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {cart.length}
              </span>
            </div>
            <button onClick={clearCart} title="Səbəti təmizlə" className="text-gray-400 hover:text-red-500">
              <Trash2 size={18} />
            </button>
          </div>

          {query.trim() && matches.length > 0 && (
            <div className="border-b border-gray-100 px-6 py-4">
              <div className="grid grid-cols-3 gap-3">
                {matches.map((p) => (
                  <button
                    key={p.kod}
                    onClick={() => {
                      addToCart(p);
                      setQuery("");
                    }}
                    className="text-left border border-gray-200 rounded-2xl p-4 hover:border-[#16a34a] hover:shadow-sm transition"
                  >
                    <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center mb-3">
                      <Package size={20} className="text-[#16a34a]" />
                    </div>
                    <div className="font-semibold text-sm mb-1">{p.ad}</div>
                    <div className="text-xs text-gray-400 mb-1">{p.kat}</div>
                    <div className="font-bold text-[#16a34a] text-sm">
                      {fmt(p.satish)} AZN{p.novu === "çəki" ? " / kq" : ""}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto px-6 py-3 space-y-1">
            {cart.length === 0 && (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center">
                <ShoppingCart size={72} className="text-gray-200 mb-4" strokeWidth={1.2} />
                <div className="text-gray-400 text-sm leading-relaxed">
                  Səbət boşdur — sağdakı siyahıdan məhsul seçin,<br />
                  barkod oxudun, ya da yuxarıdan axtarın
                </div>
              </div>
            )}
            {cart.map((item) => (
              <div key={item.kod} className="flex items-center justify-between gap-2 py-3 border-b border-gray-50 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{item.ad}</div>
                  <div className="text-xs text-gray-400">
                    {fmt(item.qiymet)} AZN{item.novu === "çəki" ? " / kq" : ""}
                    {item.endirim > 0 && <span className="text-red-500 font-semibold"> · -{item.endirim}%</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => changeQty(item.kod, -1)}
                    className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-14 text-center text-xs font-semibold">
                    {item.novu === "çəki" ? `${item.miqdar.toFixed(3)}kq` : item.miqdar}
                  </span>
                  <button
                    onClick={() => changeQty(item.kod, 1)}
                    className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <div className="w-20 text-right text-sm font-bold text-[#16a34a] shrink-0">{fmt(lineTotal(item))}</div>
                <button onClick={() => requestRemoveItem(item.kod)} className="text-gray-300 hover:text-red-500 shrink-0">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="px-6 py-4 border-t border-gray-100 space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Ara məbləğ</span>
              <span className="font-semibold">{fmt(subtotal)} AZN</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-1">
                Endirim
                {!canDiscount && <Lock size={11} className="text-gray-300" />}
              </span>
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <input
                    value={discountPct}
                    onChange={(e) => canDiscount && setDiscountPct(e.target.value)}
                    disabled={!canDiscount}
                    title={!canDiscount ? "Endirim yalnız rəhbər tərəfindən təyin edilə bilər" : ""}
                    className="w-14 text-right text-sm px-2 py-1 outline-none disabled:bg-gray-50 disabled:text-gray-400"
                  />
                  <span className="bg-gray-50 text-gray-400 text-xs px-2 py-1">%</span>
                </div>
                <span className="font-semibold w-16 text-right">{fmt(discountAmt)} AZN</span>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-2.5 flex items-center justify-between">
              <span className="font-bold text-base">Cəmi</span>
              <span className="font-black text-2xl text-[#16a34a]">{fmt(total)} AZN</span>
            </div>
          </div>

          <div className="p-4 pt-0">
            <button
              onClick={() => openPayment("nagd")}
              disabled={cart.length === 0}
              className="w-full bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-40 text-white rounded-2xl py-5 flex items-center justify-center gap-3 font-bold text-lg shadow-lg shadow-orange-900/20"
            >
              <ShoppingCart size={20} /> SATIŞ ET
            </button>
          </div>
        </div>

        {/* Right: quick-add list — ONLY products marked "Barkodu yoxdur" in
            Məhsullar (fresh bread, eggs, in-house goods with nothing to
            scan). The cashier taps the name/price directly instead. */}
        <div className="bg-white rounded-2xl border border-gray-200 flex flex-col">
          <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
            <span className="font-bold text-sm">Barkodsuz mallar</span>
            <button
              onClick={() => { setBarkodsuzPickerOpen(true); setBpQuery(""); }}
              className="w-7 h-7 rounded-full bg-green-50 text-[#16a34a] flex items-center justify-center hover:bg-green-100"
              title="Barkodsuz məhsul seç"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {barkodsuzMehsullar.length === 0 && (
              <div className="text-center text-gray-400 text-xs py-10 px-3 leading-relaxed">
                Barkodsuz məhsul yoxdur.<br />
                Məhsullar səhifəsində məhsulu redaktə edib "Barkodu yoxdur" seçin ki, burada görünsün.
              </div>
            )}
            {barkodsuzMehsullar.map((p) => (
              <button
                key={p.kod}
                onClick={() => { setBarkodsuzQtyFor(p); setBarkodsuzQty("1"); }}
                className="w-full text-left border border-gray-200 rounded-xl px-3 py-2.5 hover:border-[#16a34a] hover:bg-green-50/40 transition flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-base shrink-0">
                  {barkodsuzIcon(p.ad)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{p.ad}</div>
                  {p.kat && <div className="text-[11px] text-gray-400 truncate">{p.kat}</div>}
                </div>
                <div className="text-sm font-bold text-[#16a34a] shrink-0">
                  {fmt(p.satish)}{p.novu === "çəki" ? "/kq" : ""}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Barkodsuz mala miqdar seçimi — "50 yumurta" kimi çoxlu say bir
          dəfəyə səbətə əlavə oluna bilsin, hər dənə üçün ayrıca klik lazım
          olmasın. */}
      {barkodsuzQtyFor && (
        <Modal title={barkodsuzQtyFor.ad} onClose={() => setBarkodsuzQtyFor(null)} widthClass="max-w-xs">
          <div className="p-5 space-y-3">
            <label className="block text-xs font-semibold text-gray-500">
              {barkodsuzQtyFor.novu === "çəki" ? "Miqdar (kq)" : "Miqdar (ədəd)"}
            </label>
            <input
              type="number"
              autoFocus
              value={barkodsuzQty}
              onChange={(e) => setBarkodsuzQty(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                const n = parseFloat(barkodsuzQty);
                if (n > 0) { addToCart(barkodsuzQtyFor, n); setBarkodsuzQtyFor(null); }
              }}
              step={barkodsuzQtyFor.novu === "çəki" ? "0.1" : "1"}
              min="0"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-lg font-bold text-center focus:outline-none focus:border-green-400"
            />
            <button
              onClick={() => {
                const n = parseFloat(barkodsuzQty);
                if (n > 0) { addToCart(barkodsuzQtyFor, n); setBarkodsuzQtyFor(null); }
              }}
              className="w-full bg-[#16a34a] text-white font-bold rounded-xl py-2.5 hover:bg-[#15803d]"
            >
              Səbətə əlavə et
            </button>
          </div>
        </Modal>
      )}

      {/* Hansı məhsulların "Barkodsuz mallar" siyahısında görünəcəyini
          birbaşa Kassa ekranından seçmək — Məhsullar səhifəsinə keçib hər
          birini ayrıca redaktə etmək əvəzinə. */}
      {barkodsuzPickerOpen && (
        <Modal title="Barkodsuz məhsul seç" onClose={() => setBarkodsuzPickerOpen(false)} widthClass="max-w-md">
          <div className="p-4 space-y-3">
            <input
              type="text"
              autoFocus
              value={bpQuery}
              onChange={(e) => setBpQuery(e.target.value)}
              placeholder="Məhsul axtar (məs. çörək, yumurta)..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-400"
            />
            {!bpQuery.trim() && (
              <div className="text-[11px] text-gray-400">Hazırda seçilmiş məhsullar göstərilir. Yeni məhsul tapmaq üçün axtarın.</div>
            )}
            <div className="max-h-80 overflow-auto space-y-1.5 -mx-1 px-1">
              {bpMatches.length === 0 && (
                <div className="text-center text-gray-400 text-xs py-8">Nəticə tapılmadı.</div>
              )}
              {bpMatches.map((p) => (
                <label
                  key={p.kod}
                  className="flex items-center gap-2.5 border border-gray-200 rounded-xl px-3 py-2 cursor-pointer hover:border-green-300"
                >
                  <input
                    type="checkbox"
                    checked={!!p.barkodsuz}
                    disabled={bpBusyKod === p.kod}
                    onChange={() => toggleBarkodsuz(p)}
                    className="w-4 h-4 accent-[#16a34a]"
                  />
                  <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center text-sm shrink-0">
                    {barkodsuzIcon(p.ad)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{p.ad}</div>
                    {p.kat && <div className="text-[11px] text-gray-400 truncate">{p.kat}</div>}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Barkodsuz seçimi admin-qorumalı marşrutu vurdu (Kassa PC-dən, yerli
          olmayan sorğu) — parolu bir dəfə soruşub sessiya boyu yadda saxla,
          eyni Admin panelinin parol qapısı kimi. */}
      {bpNeedsPw && (
        <Modal title="Admin şifrəsi tələb olunur" onClose={() => setBpNeedsPw(false)} widthClass="max-w-xs">
          <div className="p-5 space-y-3">
            <input
              type="password"
              autoFocus
              value={bpPwInput}
              onChange={(e) => { setBpPwInput(e.target.value); setBpPwError(false); }}
              onKeyDown={(e) => e.key === "Enter" && submitBpPw()}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:border-green-400"
            />
            {bpPwError && <div className="text-red-500 text-xs font-semibold">Şifrə yanlışdır.</div>}
            <button onClick={submitBpPw} className="w-full bg-[#16a34a] text-white font-bold rounded-xl py-2.5 hover:bg-[#15803d]">
              Təsdiqlə
            </button>
          </div>
        </Modal>
      )}

      {/* Delete confirmation modal (manager code required) */}
      {confirmDeleteKod && (
        <Modal
          title={confirmDeleteKod === "__ALL__" ? "Səbəti təmizlə" : "Məhsulu sil"}
          onClose={() => setConfirmDeleteKod(null)}
          widthClass="max-w-sm"
        >
          <div className="space-y-4">
            <div className="text-sm text-gray-500">
              {confirmDeleteKod === "__ALL__"
                ? "Bütün səbəti təmizləmək üçün təsdiq kodunu daxil edin."
                : "Bu məhsulu səbətdən silmək üçün təsdiq kodunu daxil edin."}
            </div>
            <FormField
              label="Təsdiq kodu"
              type="password"
              value={deleteCodeInput}
              onChange={(e) => {
                setDeleteCodeInput(e.target.value);
                setDeleteError(false);
              }}
              autoFocus
            />
            {deleteError && <div className="text-red-500 text-xs font-semibold">Kod yanlışdır, yenidən yoxlayın.</div>}
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDeleteKod(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 font-semibold text-gray-500 text-sm"
              >
                Ləğv et
              </button>
              <button
                onClick={confirmDelete}
                className="flex-[2] bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 font-bold text-sm"
              >
                Sil
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Payment modal */}
      {payOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl overflow-hidden w-full max-w-sm">
            <div className="bg-[#15803d] text-white text-center py-4 font-bold tracking-wide">
              ÖDƏNİŞ SEÇİMİ
            </div>
            <div className="p-6 space-y-5">
              <div className="text-center">
                <div className="text-xs text-gray-500 font-medium">YEKUN MƏBLƏĞ</div>
                <div className="text-3xl font-black text-[#15803d]">{fmt(total)} AZN</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setMethod("nagd")}
                  className={`rounded-xl border-2 py-3 flex flex-col items-center gap-1.5 ${
                    method === "nagd" ? "border-green-500 bg-green-50" : "border-gray-200"
                  }`}
                >
                  <Banknote size={22} className="text-green-600" />
                  <span className="font-bold text-green-700 text-xs">NƏĞD</span>
                  <span className="text-[10px] text-gray-400">(F8)</span>
                </button>
                <button
                  onClick={() => setMethod("kart")}
                  className={`rounded-xl border-2 py-3 flex flex-col items-center gap-1.5 ${
                    method === "kart" ? "border-blue-500 bg-blue-50" : "border-gray-200"
                  }`}
                >
                  <CreditCard size={22} className="text-blue-600" />
                  <span className="font-bold text-blue-700 text-xs">KART</span>
                  <span className="text-[10px] text-gray-400">(F9)</span>
                </button>
                <button
                  onClick={() => setMethod("qarisiq")}
                  className={`rounded-xl border-2 py-3 flex flex-col items-center gap-1.5 ${
                    method === "qarisiq" ? "border-purple-500 bg-purple-50" : "border-gray-200"
                  }`}
                >
                  <Wallet size={22} className="text-purple-600" />
                  <span className="font-bold text-purple-700 text-xs">QARIŞIQ</span>
                  <span className="text-[10px] text-gray-400">nəğd+kart</span>
                </button>
              </div>
              {method === "nagd" && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">ALINAN MƏBLƏĞ (NƏĞD OLDUQDA)</div>
                    <input
                      value={received}
                      onChange={(e) => setReceived(e.target.value)}
                      className={`w-full text-xl font-bold border rounded-lg px-3 py-2 focus:outline-none ${
                        insufficientCash ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-green-400"
                      }`}
                    />
                  </div>
                  {insufficientCash ? (
                    <div className="text-red-500 text-xs font-semibold">
                      Çatışmayan məbləğ: {fmt(total - (parseFloat(received) || 0))} AZN — satışı tamamlamaq üçün ən azı {fmt(total)} AZN daxil edin.
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">GERİ QAYTARILAN</span>
                      <span className="text-xl font-bold text-green-600">{fmt(change)} AZN</span>
                    </div>
                  )}
                </div>
              )}
              {method === "qarisiq" && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">KART HİSSƏSİ</div>
                      <input
                        value={cardPart}
                        onChange={(e) => setCardPart(e.target.value)}
                        className={`w-full text-lg font-bold border rounded-lg px-3 py-2 focus:outline-none ${
                          mixedCardTooHigh ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-blue-400"
                        }`}
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">NƏĞD HİSSƏSİ (avtomatik)</div>
                      <div className="w-full text-lg font-bold border border-transparent rounded-lg px-3 py-2 bg-white">
                        {fmt(mixedCashPart)}
                      </div>
                    </div>
                  </div>
                  {mixedCardTooHigh ? (
                    <div className="text-red-500 text-xs font-semibold">
                      Kart hissəsi yekun məbləğdən ({fmt(total)} AZN) çox ola bilməz.
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">
                          NƏĞD VERİLƏN (ixtiyari — dəyişiklik üçün, məs. iri əskinasla ödəyəndə)
                        </div>
                        <input
                          value={mixedReceived}
                          onChange={(e) => setMixedReceived(e.target.value)}
                          placeholder={fmt(mixedCashPart)}
                          className={`w-full text-lg font-bold border rounded-lg px-3 py-2 focus:outline-none ${
                            mixedReceivedInsufficient ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-green-400"
                          }`}
                        />
                      </div>
                      {mixedReceivedInsufficient ? (
                        <div className="text-red-500 text-xs font-semibold">
                          Nəğd verilən məbləğ nəğd hissədən ({fmt(mixedCashPart)} AZN) az ola bilməz.
                        </div>
                      ) : mixedChange > 0 ? (
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">GERİ QAYTARILAN</span>
                          <span className="text-xl font-bold text-green-600">{fmt(mixedChange)} AZN</span>
                        </div>
                      ) : (
                        <div className="text-green-600 text-xs font-semibold">✓ Kart {fmt(mixedCardPart)} AZN + Nəğd {fmt(mixedCashPart)} AZN = {fmt(total)} AZN</div>
                      )}
                    </>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setPayOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 font-semibold text-gray-500"
                >
                  Ləğv et
                </button>
                <button
                  onClick={confirmSale}
                  disabled={insufficientCash || mixedCardTooHigh || mixedReceivedInsufficient}
                  className="flex-[2] bg-[#15803d] hover:bg-[#166534] disabled:opacity-40 disabled:hover:bg-[#15803d] text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2"
                >
                  <Check size={18} /> TƏSDİQLƏ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Son çeklər (sales history) modal */}
      {historyOpen && (
        <Modal title="Son çeklər" onClose={() => setHistoryOpen(false)} widthClass="max-w-lg">
          {returnMsg && (
            <div className={`rounded-xl px-3 py-2 text-xs font-semibold mb-2 ${returnMsg.isError ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
              {returnMsg.text}
            </div>
          )}
          <div className="space-y-2 -mx-1">
            {recentSales.map((s) => (
              <div
                key={s.no}
                className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-gray-50 border border-gray-100"
              >
                <button onClick={() => openFromHistory(s)} className="text-left flex-1">
                  <div className="font-semibold text-sm">{s.no}</div>
                  <div className="text-xs text-gray-400">{s.tarix} · {s.kassir}</div>
                </button>
                <div className="text-right mr-3">
                  <div className="font-bold text-sm">{fmt(s.meblegh)} AZN</div>
                  <div className="text-xs text-gray-400">{s.odenish}</div>
                </div>
                {s.status === "İadə edilib" ? (
                  <span className="text-xs font-semibold text-red-500 whitespace-nowrap">İadə edilib</span>
                ) : s._pending ? (
                  <span className="text-xs text-gray-300 whitespace-nowrap">—</span>
                ) : (
                  <button
                    onClick={() => handleReturn(s)}
                    disabled={returningNo === s.no}
                    className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-40 whitespace-nowrap border border-red-200 rounded-lg px-2.5 py-1.5"
                  >
                    {returningNo === s.no ? "..." : "İadə et"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Receipt modal */}
      {receiptOpen && viewSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xs p-6">
            <ReceiptContent sale={viewSale} settings={settings} />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setReceiptOpen(false)}
                className="flex-1 border border-gray-200 text-gray-500 rounded-lg py-2 font-sans font-semibold text-sm"
              >
                Bağla
              </button>
              <button
                onClick={() => printReceipt(viewSale, settings)}
                className="flex-[2] bg-[#16a34a] text-white rounded-lg py-2 font-sans font-semibold text-sm"
              >
                Çek çap et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden print-only copy of whatever receipt is currently open — this
          is what actually reaches the printer (see printReceipt below), the
          modal above is only what the cashier sees on screen. Plain
          monospace text, not the styled flexbox layout: many receipt
          printers are installed under a "Generic / Text Only" Windows
          driver that doesn't render CSS layout — it just dumps characters,
          which turned flex-aligned prices into stray dot leaders. Fixed
          character padding is the one thing every such driver gets right. */}
      {receiptOpen && viewSale && (
        <div className="print-area hidden print:block">
          <pre style={{ fontFamily: "monospace", fontSize: "15px", fontWeight: 700, whiteSpace: "pre-wrap", lineHeight: 1.3 }}>
            {buildReceiptText(viewSale, settings)}
          </pre>
        </div>
      )}
    </div>
  );
}

// 32 characters fits standard 58mm thermal paper at the typical font the
// printer falls back to; also reads fine on wider 80mm rolls.
const RECEIPT_WIDTH = 32;
function padLine(left, right, width = RECEIPT_WIDTH) {
  left = String(left);
  right = String(right);
  const gap = Math.max(1, width - left.length - right.length);
  return left + " ".repeat(gap) + right;
}
function centerLine(text, width = RECEIPT_WIDTH) {
  text = String(text);
  if (text.length >= width) return text;
  const padTotal = width - text.length;
  const left = Math.floor(padTotal / 2);
  return " ".repeat(left) + text;
}
function wrapText(text, width = RECEIPT_WIDTH) {
  const words = String(text).split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > width) {
      if (line) lines.push(line.trim());
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

function buildReceiptText(sale, settings) {
  const lines = [];
  const divider = "-".repeat(RECEIPT_WIDTH);

  lines.push(centerLine(settings.magazaAdi || "ZƏHRA MARKET"));
  if (settings.unvan) wrapText(settings.unvan).forEach((l) => lines.push(centerLine(l)));
  if (settings.telefon) lines.push(centerLine(`Tel: ${settings.telefon}`));
  if (settings.voen) lines.push(centerLine(`VÖEN: ${settings.voen}`));
  if (settings.cekBasliqQeydi) wrapText(settings.cekBasliqQeydi).forEach((l) => lines.push(centerLine(l)));
  lines.push(divider);

  lines.push(padLine(`Çek: ${sale.no}`, ""));
  lines.push(sale.tarix);
  lines.push(`Kassir: ${sale.kassir}`);
  lines.push(divider);

  sale.items.forEach((it) => {
    const lineSum = fmt(it.qiymet * it.miqdar * (1 - it.endirim / 100));
    wrapText(it.ad).forEach((l) => lines.push(l));
    const qtyLabel = it.novu === "çəki" ? `${it.miqdar.toFixed(3)}kq` : `${it.miqdar} x ${fmt(it.qiymet)}`;
    lines.push(padLine(`  ${qtyLabel}`, `${lineSum} AZN`));
  });
  lines.push(divider);

  lines.push(padLine("YEKUN:", `${fmt(sale.meblegh)} AZN`));
  lines.push("");
  lines.push(padLine("Ödəniş növü:", sale.odenish));
  if (sale.odenish === "NƏĞD" && sale.received != null) {
    lines.push(padLine("Alınan:", `${fmt(sale.received)} AZN`));
    lines.push(padLine("Geri qaytarılan:", `${fmt(sale.change)} AZN`));
  }
  if (sale.odenish === "QARIŞIQ") {
    lines.push(padLine("  Nəğd:", `${fmt(sale.cashPart)} AZN`));
    lines.push(padLine("  Kart:", `${fmt(sale.cardPart)} AZN`));
    if (sale.change > 0) {
      lines.push(padLine("Nəğd verilən:", `${fmt(sale.received)} AZN`));
      lines.push(padLine("Geri qaytarılan:", `${fmt(sale.change)} AZN`));
    }
  }
  lines.push(divider);

  const thanks = settings.cekTesekkurMesaji || "TƏŞƏKKÜRLƏR!\nXoş gəlmisiniz!";
  thanks.split("\n").forEach((l) => lines.push(centerLine(l)));
  lines.push("");
  lines.push("");

  return lines.join("\n");
}

function ReceiptContent({ sale, settings }) {
  return (
    <div className="font-mono text-xs">
      <div className="text-center mb-3">
        <div className="font-black text-sm">
          <span className="text-[#2563eb]">ZƏHRA</span> <span className="text-[#eab308]">MARKET</span>
        </div>
        <div className="mt-1 text-[10px] text-gray-500 leading-relaxed">
          {settings.magazaAdi}<br />
          {settings.unvan && <>ÜNVAN: {settings.unvan}<br /></>}
          {settings.telefon && <>Tel: {settings.telefon}<br /></>}
          {settings.voen && <>VÖEN: {settings.voen}</>}
          {settings.cekBasliqQeydi && (
            <>
              <br />
              {settings.cekBasliqQeydi}
            </>
          )}
        </div>
      </div>
      <div className="border-t border-dashed border-gray-300 my-2" />
      <div className="flex justify-between text-[11px]">
        <span>ÇEK №: {sale.no}</span>
        <span>{sale.tarix}</span>
      </div>
      <div className="text-[11px] mb-2">Kassir: {sale.kassir}</div>
      <div className="border-t border-dashed border-gray-300 my-2" />
      {sale.items.map((it, idx) => (
        <div key={it.kod + idx} className="flex justify-between text-[11px] mb-1">
          <span className="truncate mr-2">{it.ad}</span>
          <span>{fmt(it.qiymet * it.miqdar * (1 - it.endirim / 100))}</span>
        </div>
      ))}
      <div className="border-t border-dashed border-gray-300 my-2" />
      <div className="flex justify-between font-bold text-sm">
        <span>YEKUN:</span>
        <span>{fmt(sale.meblegh)} AZN</span>
      </div>
      <div className="mt-2 text-[11px] space-y-0.5">
        <div className="flex justify-between">
          <span>ÖDƏNİŞ NÖVÜ:</span>
          <span>{sale.odenish}</span>
        </div>
        {sale.odenish === "NƏĞD" && sale.received != null && (
          <>
            <div className="flex justify-between">
              <span>ALINAN MƏBLƏĞ:</span>
              <span>{fmt(sale.received)}</span>
            </div>
            <div className="flex justify-between">
              <span>GERİ QAYTARILAN:</span>
              <span>{fmt(sale.change)}</span>
            </div>
          </>
        )}
        {sale.odenish === "QARIŞIQ" && (
          <>
            <div className="flex justify-between">
              <span>— NƏĞD:</span>
              <span>{fmt(sale.cashPart)} AZN</span>
            </div>
            <div className="flex justify-between">
              <span>— KART:</span>
              <span>{fmt(sale.cardPart)} AZN</span>
            </div>
            {sale.change > 0 && (
              <>
                <div className="flex justify-between">
                  <span>NƏĞD VERİLƏN:</span>
                  <span>{fmt(sale.received)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GERİ QAYTARILAN:</span>
                  <span>{fmt(sale.change)}</span>
                </div>
              </>
            )}
          </>
        )}
      </div>
      <div className="text-center mt-4 font-bold text-[12px]">
        {(settings.cekTesekkurMesaji || "TƏŞƏKKÜRLƏR!\nXoş gəlmisiniz!").split("\n").map((line, i) => (
          <div key={i} className={i === 0 ? "" : "font-normal text-[10px]"}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

// Prints the receipt straight to the configured (or default) Windows
// printer with no dialog — falls back to the normal browser print dialog
// when not running inside Electron (e.g. previewing in a plain browser).
function printReceipt(sale, settings) {
  if (window.electronAPI && window.electronAPI.printReceipt) {
    window.electronAPI.printReceipt(settings.printerName || undefined);
  } else {
    window.print();
  }
}

/* ---------------------------------------------------------------- */
/* ADMIN VIEW                                                        */
/* ---------------------------------------------------------------- */

const NAV = [
  { key: "icmal", label: "İcmal", icon: LayoutGrid },
  { key: "mehsullar", label: "Məhsullar", icon: Package },
  { key: "stok", label: "Stok", icon: Boxes },
  { key: "satislar", label: "Satışlar", icon: LineChart },
  { key: "hesabatlar", label: "Hesabatlar", icon: FileBarChart2 },
  { key: "isciler", label: "İşçilər", icon: Users },
  { key: "techizatcilar", label: "Təchizatçılar", icon: Truck },
  { key: "terezi", label: "Tərəzi", icon: ScanBarcode },
  { key: "backup", label: "Ehtiyat nüsxə", icon: Download },
  { key: "parametrler", label: "Parametrlər", icon: Settings },
];

function StatCard({ label, value, sub, icon: Icon, tone = "green", onClick }) {
  const tones = {
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-500",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-gray-200 p-5 ${onClick ? "cursor-pointer hover:border-green-300 transition-colors" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-gray-500 font-medium">{label}</div>
          <div className="text-2xl font-black text-[#12261d] mt-1">{value}</div>
          {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tones[tone]}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    Normal: "bg-green-50 text-green-600",
    Azalır: "bg-amber-50 text-amber-600",
    Endirim: "bg-red-50 text-red-500",
    Bitib: "bg-red-50 text-red-500",
    Aktiv: "bg-green-50 text-green-600",
    Tamamlandı: "bg-green-50 text-green-600",
    "Ləğv edilib": "bg-red-50 text-red-500",
    "İadə edilib": "bg-red-50 text-red-500",
    "Sifariş ver": "bg-amber-50 text-amber-600",
    Təcili: "bg-red-50 text-red-500",
    "Borc var": "bg-red-50 text-red-500",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${map[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function PageHeader({ title }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h1 className="text-xl font-black text-[#12261d]">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="text-right leading-tight">
          <div className="text-sm font-semibold">Zəhra Market</div>
          <div className="text-xs text-gray-400">Admin</div>
        </div>
        <div className="flex items-center gap-1.5 bg-green-50 text-green-600 text-xs font-semibold px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> SİSTEM AKTİV
        </div>
      </div>
    </div>
  );
}

function IcmalPage({ onNavigate }) {
  const { sales, products, employees } = useMarket();
  const bugunSales = sales.filter((s) => s.tarix && s.tarix.startsWith(nowDateStr()));
  const bugunMeblegh = bugunSales.reduce((sum, s) => sum + (s.meblegh || 0), 0);
  const stokDeyeri = products.reduce((sum, p) => sum + p.stok * p.alish, 0);
  const azalanStok = products.filter((p) => p.stok > 0 && p.stok <= LOW_STOCK_ESIYI).length;
  const bitenStok = products.filter((p) => p.stok <= 0).length;

  // Son 7 günün real satış cəmi (əvvəllər sabit/saxta CHART_DATA istifadə
  // olunurdu — bu, mağazanın həqiqi satışları ilə heç bir əlaqəsi olmayan
  // nümunə rəqəmlər idi).
  const weekChartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
      days.push({ key, gun: String(d.getDate()), satish: 0 });
    }
    for (const s of sales) {
      if (!s.tarix) continue;
      const dateKey = s.tarix.split(" ")[0];
      const day = days.find((d) => d.key === dateKey);
      if (day) day.satish += s.meblegh || 0;
    }
    return days;
  }, [sales]);

  // Ümumi statistika: sabit sətir sayı ilə (kassir/satış siyahısından fərqli
  // olaraq satış artdıqca uzanıb qəlizləşmir).
  const umumiGelir = useMemo(() => sales.reduce((sum, s) => sum + (s.meblegh || 0), 0), [sales]);
  const ortaCek = sales.length > 0 ? umumiGelir / sales.length : 0;
  const umumiStats = [
    { label: "Ümumi satış sayı", value: sales.length.toLocaleString("az-AZ") },
    { label: "Ümumi gəlir", value: `${fmt(umumiGelir)} AZN` },
    { label: "Orta çek", value: `${fmt(ortaCek)} AZN` },
    { label: "Məhsul sayı", value: products.length.toLocaleString("az-AZ") },
    { label: "İşçi sayı", value: String((employees || []).length) },
  ];

  return (
    <div>
      <PageHeader title="İcmal" />
      <div className="grid grid-cols-3 gap-4 mb-5">
        <StatCard label="Bu gün satış" value={`${fmt(bugunMeblegh)} AZN`} sub={`${bugunSales.length} satış`} icon={TrendingUp} tone="green" />
        <StatCard label="Stok dəyəri" value={`${fmt(stokDeyeri)} AZN`} sub="Anbar üzrə" icon={Boxes} tone="amber" />
        <StatCard
          label="Stok xəbərdarlığı"
          value={`${azalanStok + bitenStok} məhsul`}
          sub={`${azalanStok} azalır, ${bitenStok} bitib`}
          icon={AlertTriangle}
          tone="red"
          onClick={() => onNavigate && onNavigate("stok")}
        />
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-4 mb-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="text-sm font-bold text-gray-600 mb-3">SATIŞLAR — SON 7 GÜN</div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekChartData}>
                <XAxis dataKey="gun" axisLine={false} tickLine={false} fontSize={12} />
                <Tooltip formatter={(v) => `${fmt(v)} AZN`} />
                <Bar dataKey="satish" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="text-sm font-bold text-gray-600 mb-3">ÜMUMİ STATİSTİKA</div>
          <div className="space-y-3">
            {umumiStats.map((s) => (
              <div key={s.label} className="flex items-center justify-between border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                <div className="text-sm text-gray-500">{s.label}</div>
                <div className="text-sm font-bold text-gray-700">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between border-b border-gray-100">
          <div className="font-bold text-sm text-gray-600">SON SATIŞLAR</div>
          <button onClick={() => onNavigate && onNavigate("satislar")} className="text-xs font-semibold text-green-600 hover:text-green-700">
            Hamısını gör →
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 text-xs">
              <th className="py-2 px-5">Çek</th><th className="py-2 px-5">Kassir</th><th className="py-2 px-5">Məbləğ</th>
              <th className="py-2 px-5">Ödəniş</th><th className="py-2 px-5">Vaxt</th><th className="py-2 px-5">Status</th>
            </tr>
          </thead>
          <tbody>
            {sales.slice(0, 5).map((s) => (
              <tr key={s.no} className="border-t border-gray-100">
                <td className="py-3 px-5 font-medium">{s.no}</td>
                <td className="py-3 px-5">{s.kassir}</td>
                <td className="py-3 px-5 font-semibold">{fmt(s.meblegh)} AZN</td>
                <td className="py-3 px-5">{s.odenish}</td>
                <td className="py-3 px-5">{s.tarix.split(" ")[1]}</td>
                <td className="py-3 px-5"><StatusPill status={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const emptyProductForm = { kod: "", ad: "", kat: "", alish: "", satish: "", endirim: "0", stok: "", minimum: "10", novu: "eded", vahid: "ədəd", tereziKodu: "", barkodsuz: false };

const MEHSUL_SEHIFE_OLCUSU = 50;

function MehsullarPage() {
  const { products, addProduct, updateProduct, deleteProduct, importProducts } = useMarket();
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProductForm);
  const [importMsg, setImportMsg] = useState(null);
  const fileInputRef = React.useRef(null);
  // Product lists here can run into the tens of thousands of rows (a full
  // 1C catalog import, for example) — rendering them all as <tr> elements
  // at once freezes the tab, so only one page's worth ever hits the DOM.
  const [page, setPage] = useState(0);
  const [katFilter, setKatFilter] = useState("Hamısı");

  const kategoriyalar = useMemo(
    () => ["Hamısı", ...Array.from(new Set(products.map((p) => p.kat || "Digər"))).sort((a, b) => a.localeCompare(b, "az"))],
    [products]
  );

  const filtered = products.filter(
    (p) =>
      (p.ad.toLowerCase().includes(q.toLowerCase()) || p.kod.includes(q)) &&
      (katFilter === "Hamısı" || (p.kat || "Digər") === katFilter)
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / MEHSUL_SEHIFE_OLCUSU));
  const clampedPage = Math.min(page, pageCount - 1);
  const paged = filtered.slice(clampedPage * MEHSUL_SEHIFE_OLCUSU, (clampedPage + 1) * MEHSUL_SEHIFE_OLCUSU);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyProductForm);
    setModalOpen(true);
  };
  const openEdit = (p) => {
    setEditing(p);
    setForm({
      kod: p.kod, ad: p.ad, kat: p.kat,
      alish: String(p.alish), satish: String(p.satish),
      endirim: String(p.endirim), stok: String(p.stok), minimum: String(p.minimum),
      novu: p.novu || "eded", vahid: p.vahid || "ədəd", tereziKodu: p.tereziKodu || "",
      barkodsuz: !!p.barkodsuz,
    });
    setModalOpen(true);
  };

  const save = () => {
    // "Barkodu yoxdur" items (fresh bread, eggs...) genuinely have no real
    // barcode to type in — auto-generate an internal code instead of
    // silently refusing to save when the Barkod field is left empty.
    const kod = form.kod.trim() || (form.barkodsuz ? `NOBARCODE-${Date.now()}` : "");
    if (!kod || !form.ad.trim()) return;
    const payload = {
      kod,
      ad: form.ad.trim(),
      kat: form.kat.trim() || "Digər",
      alish: parseFloat(form.alish) || 0,
      satish: parseFloat(form.satish) || 0,
      endirim: parseFloat(form.endirim) || 0,
      stok: parseInt(form.stok, 10) || 0,
      minimum: LOW_STOCK_ESIYI,
      novu: form.novu === "çəki" ? "çəki" : "eded",
      vahid: form.novu === "çəki" ? "kq" : form.vahid || "ədəd",
      tereziKodu: form.tereziKodu.trim(),
      barkodsuz: !!form.barkodsuz,
    };
    if (editing) updateProduct(editing.kod, payload);
    else addProduct(payload);
    setModalOpen(false);
  };

  const remove = (p) => {
    if (window.confirm(`"${p.ad}" silinsin?`)) deleteProduct(p.kod);
  };

  const downloadTemplate = () => {
    const header = "Barkod,Ad,Kateqoriya,AlisQiymeti,SatisQiymeti,Endirim,Stok,Minimum,Novu,Vahid,TereziKodu\n";
    const example = "5449000000996,Coca Cola 1L,İçkilər,1.20,1.60,0,84,20,eded,ədəd,\n";
    const blob = new Blob(["\uFEFF" + header + example], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "zehra-market-mehsul-nümunə.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Exports every product currently in the database to Excel, so missing
  // columns (price, stock...) can be filled in and re-imported — the import
  // matches by Barkod and updates existing rows instead of duplicating them.
  const exportProducts = () => {
    const header = ["Barkod", "Ad", "Kateqoriya", "AlisQiymeti", "SatisQiymeti", "Endirim", "Stok", "Minimum", "Novu", "Vahid", "TereziKodu"];
    const rows = products.map((p) => [p.kod, p.ad, p.kat, p.alish, p.satish, p.endirim, p.stok, p.minimum, p.novu, p.vahid || (p.novu === "çəki" ? "kq" : "ədəd"), p.tereziKodu]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws["!cols"] = header.map((h) => ({ wch: h === "Ad" ? 40 : h === "Kateqoriya" ? 18 : 12 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Məhsullar");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zehra-market-mehsullar-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const pickImportFile = () => fileInputRef.current && fileInputRef.current.click();

  // Turns a raw header+data grid (from either a parsed CSV file or an Excel
  // sheet) into product records, matching columns by name regardless of order.
  const rowsToProducts = (rows) => {
    const header = rows[0].map((h) => String(h ?? "").trim().toLowerCase());
    const findCol = (names) => header.findIndex((h) => names.includes(h));
    const iKod = findCol(["barkod", "kod"]);
    const iAd = findCol(["ad", "məhsul", "mehsul"]);
    const iKat = findCol(["kateqoriya", "kat"]);
    const iAlis = findCol(["alisqiymeti", "alış", "alis"]);
    const iSatis = findCol(["satisqiymeti", "satış", "satis"]);
    const iEndirim = findCol(["endirim"]);
    const iStok = findCol(["stok"]);
    const iMin = findCol(["minimum"]);
    const iNovu = findCol(["novu", "növü"]);
    const iVahid = findCol(["vahid", "ölçü vahidi", "olcu vahidi"]);
    const iTerezi = findCol(["tereziKodu".toLowerCase(), "tərəzikodu"]);

    const cell = (row, i) => String((i >= 0 ? row[i] : "") ?? "").trim();
    const list = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.every((c) => !String(c ?? "").trim())) continue;
      const kod = cell(row, iKod);
      const ad = cell(row, iAd);
      if (!kod || !ad) continue;
      list.push({
        kod,
        ad,
        kat: cell(row, iKat) || "Digər",
        alish: parseFloat(cell(row, iAlis).replace(",", ".")) || 0,
        satish: parseFloat(cell(row, iSatis).replace(",", ".")) || 0,
        endirim: parseFloat(cell(row, iEndirim)) || 0,
        stok: parseInt(cell(row, iStok), 10) || 0,
        minimum: parseInt(cell(row, iMin), 10) || 10,
        novu: cell(row, iNovu) === "çəki" ? "çəki" : "eded",
        vahid: cell(row, iVahid) || (cell(row, iNovu) === "çəki" ? "kq" : "ədəd"),
        tereziKodu: cell(row, iTerezi),
      });
    }
    return list;
  };

  const finishImport = async (list) => {
    if (list.length === 0) {
      setImportMsg({ text: "Uyğun sətir tapılmadı — sütun adlarını nümunə fayl ilə müqayisə edin.", isError: true });
      setTimeout(() => setImportMsg(null), 4500);
      return;
    }
    const ok = await importProducts(list);
    setImportMsg({
      text: ok ? `${list.length} məhsul idxal olundu (mövcud barkodlar yeniləndi).` : "İdxal alınmadı — server ilə əlaqəni yoxlayın.",
      isError: !ok,
    });
    setTimeout(() => setImportMsg(null), 4500);
  };

  const onImportFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const isExcel = /\.xlsx?$/i.test(file.name);

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const wb = XLSX.read(reader.result, { type: "array" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
          if (rows.length < 2) {
            setImportMsg({ text: "Fayl boşdur və ya format səhvdir.", isError: true });
            setTimeout(() => setImportMsg(null), 4500);
            return;
          }
          await finishImport(rowsToProducts(rows));
        } catch (err) {
          setImportMsg({ text: "Excel faylı oxuna bilmədi — formatını yoxlayın.", isError: true });
          setTimeout(() => setImportMsg(null), 4500);
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const rows = parseCSV(String(reader.result));
        if (rows.length < 2) {
          setImportMsg({ text: "Fayl boşdur və ya format səhvdir.", isError: true });
          setTimeout(() => setImportMsg(null), 4500);
          return;
        }
        await finishImport(rowsToProducts(rows));
      } catch (err) {
        setImportMsg({ text: "Fayl oxuna bilmədi — CSV formatını yoxlayın.", isError: true });
        setTimeout(() => setImportMsg(null), 4500);
      }
    };
    reader.readAsText(file, "utf-8");
  };

  return (
    <div>
      <PageHeader title="Məhsullar" />
      {importMsg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-semibold mb-4 ${importMsg.isError ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
          {importMsg.text}
        </div>
      )}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
          <Search size={16} className="text-gray-400" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            placeholder="Məhsul adı və ya barkod..."
            className="w-full text-sm outline-none"
          />
        </div>
        <select
          value={katFilter}
          onChange={(e) => { setKatFilter(e.target.value); setPage(0); }}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 focus:outline-none focus:border-green-400 max-w-[220px]"
        >
          {kategoriyalar.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        <button onClick={downloadTemplate} className="border border-gray-200 text-gray-600 hover:border-gray-300 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap">
          Nümunə CSV
        </button>
        <button
          onClick={exportProducts}
          disabled={products.length === 0}
          className="border border-gray-200 text-gray-600 hover:border-gray-300 disabled:opacity-40 rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 whitespace-nowrap"
        >
          <Download size={16} /> SİYAHINI EXCEL-Ə ÇIXAR
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={onImportFile}
          className="hidden"
        />
        <button onClick={pickImportFile} className="border border-[#16a34a] text-[#16a34a] hover:bg-green-50 rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 whitespace-nowrap">
          <Upload size={16} /> EXCEL/CSV İDXAL ET
        </button>
        <button onClick={openAdd} className="bg-[#16a34a] text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 whitespace-nowrap">
          <Plus size={16} /> MƏHSUL ƏLAVƏ ET
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500 text-xs">
              <th className="py-3 px-4">Barkod</th><th className="py-3 px-4">Məhsul</th><th className="py-3 px-4">Kateqoriya</th>
              <th className="py-3 px-4">Alış</th><th className="py-3 px-4">Satış</th><th className="py-3 px-4">Stok</th>
              <th className="py-3 px-4">Status</th><th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((p) => (
              <tr key={p.kod} className="border-t border-gray-100">
                <td className="py-3 px-4 font-mono text-xs text-gray-500">{p.kod}</td>
                <td className="py-3 px-4 font-medium">{p.ad}</td>
                <td className="py-3 px-4 text-gray-500">{p.kat}</td>
                <td className="py-3 px-4">{fmt(p.alish)} AZN</td>
                <td className="py-3 px-4 font-semibold">{fmt(p.satish)} AZN</td>
                <td className="py-3 px-4">{p.stok}</td>
                <td className="py-3 px-4"><StatusPill status={mehsulStatus(p)} /></td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => openEdit(p)} className="text-blue-600 text-xs font-semibold">DÜZƏLT</button>
                    <button onClick={() => remove(p)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-400">Nəticə tapılmadı</td>
              </tr>
            )}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
            <div>
              {clampedPage * MEHSUL_SEHIFE_OLCUSU + 1}–{Math.min((clampedPage + 1) * MEHSUL_SEHIFE_OLCUSU, filtered.length)} / {filtered.length} məhsul
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((pg) => Math.max(0, pg - 1))}
                disabled={clampedPage === 0}
                className="border border-gray-200 rounded-lg px-3 py-1.5 font-semibold disabled:opacity-30"
              >
                « Əvvəlki
              </button>
              <span className="font-semibold">{clampedPage + 1} / {pageCount}</span>
              <button
                onClick={() => setPage((pg) => Math.min(pageCount - 1, pg + 1))}
                disabled={clampedPage >= pageCount - 1}
                className="border border-gray-200 rounded-lg px-3 py-1.5 font-semibold disabled:opacity-30"
              >
                Sonrakı »
              </button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal title={editing ? "Məhsulu düzəlt" : "Yeni məhsul əlavə et"} onClose={() => setModalOpen(false)}>
          <div className="space-y-3">
            <FormField
              label="Barkod"
              value={form.kod}
              onChange={(e) => setForm({ ...form, kod: e.target.value })}
              placeholder={form.barkodsuz ? "Boş buraxsanız avtomatik yaradılacaq" : ""}
            />
            <FormField label="Məhsul adı" value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} />
            <FormField label="Kateqoriya" value={form.kat} onChange={(e) => setForm({ ...form, kat: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Alış qiyməti (AZN)" type="number" value={form.alish} onChange={(e) => setForm({ ...form, alish: e.target.value })} />
              <FormField label="Satış qiyməti (AZN)" type="number" value={form.satish} onChange={(e) => setForm({ ...form, satish: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Endirim (%)" type="number" value={form.endirim} onChange={(e) => setForm({ ...form, endirim: e.target.value })} />
              <FormField label="Stok miqdarı" type="number" value={form.stok} onChange={(e) => setForm({ ...form, stok: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-100 mt-1">
              <div className="pt-3">
                <div className="text-xs text-gray-500 mb-1">Satış növü</div>
                <select
                  value={form.novu}
                  onChange={(e) => setForm({ ...form, novu: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                >
                  <option value="eded">Ədəd ilə</option>
                  <option value="çəki">Çəki ilə (tərəzi)</option>
                </select>
              </div>
              {form.novu === "çəki" ? (
                <div className="pt-3">
                  <FormField
                    label="Tərəzi kodu (5 rəqəm)"
                    value={form.tereziKodu}
                    onChange={(e) => setForm({ ...form, tereziKodu: e.target.value })}
                    placeholder="00010"
                  />
                </div>
              ) : (
                <div className="pt-3">
                  <div className="text-xs text-gray-500 mb-1">Ölçü vahidi</div>
                  <select
                    value={form.vahid}
                    onChange={(e) => setForm({ ...form, vahid: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                  >
                    <option value="ədəd">Ədəd</option>
                    <option value="qutu">Qutu</option>
                    <option value="paket">Paket</option>
                    <option value="dəst">Dəst</option>
                    <option value="litr">Litr</option>
                    <option value="karton">Karton</option>
                  </select>
                </div>
              )}
            </div>
            <label className="flex items-start gap-2.5 pt-1 border-t border-gray-100 mt-1 pt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.barkodsuz}
                onChange={(e) => setForm({ ...form, barkodsuz: e.target.checked })}
                className="mt-0.5"
              />
              <span className="text-xs text-gray-600">
                <span className="font-semibold">Barkodu yoxdur</span> — bu məhsul (çörək, yumurta və s.) Kassa ekranında
                sağdakı "kliklə əlavə et" siyahısında görünsün
              </span>
            </label>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 font-semibold text-gray-500 text-sm">
                Ləğv et
              </button>
              <button onClick={save} className="flex-[2] bg-[#16a34a] hover:bg-[#15803d] text-white rounded-xl py-2.5 font-bold text-sm">
                Yadda saxla
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const CIXIS_SEBEBLERI = ["İtib", "Xarab olub", "Vaxtı bitib", "Oğurlanıb", "Digər"];

const STOK_SEHIFE_OLCUSU = 50;

function StokPage() {
  const { products, stockMovements, suppliers, adjustStockBy, addPurchase } = useMarket();
  const [giren, setGiren] = useState(null); // product being stocked in
  const [cixan, setCixan] = useState(null); // product being written off
  const [miqdar, setMiqdar] = useState("");
  const [sebeb, setSebeb] = useState(CIXIS_SEBEBLERI[0]);
  const [sebebQeyd, setSebebQeyd] = useState("");
  const [error, setError] = useState("");
  // "Mal qəbulu" — 1C-style multi-item goods receipt: scan barcode after
  // barcode, each scan looks the product up and adds/increments a row;
  // qty and prices are editable before one batch save.
  const [qebulOpen, setQebulOpen] = useState(false);
  const [qebulRows, setQebulRows] = useState([]);
  const [qebulBarkod, setQebulBarkod] = useState("");
  const [qebulError, setQebulError] = useState("");
  const [qebulSaving, setQebulSaving] = useState(false);
  // Supplier's invoice-level discount (e.g. "7% endirim" announced at the
  // end) — applied only to the payable total, never written back onto the
  // per-product alış qiyməti.
  const [qebulEndirim, setQebulEndirim] = useState("");
  const [qebulTedarukcu, setQebulTedarukcu] = useState("");
  // Same rationale as MehsullarPage: a large catalog import can put tens of
  // thousands of rows here, and rendering them all at once freezes the tab.
  const [page, setPage] = useState(0);
  // Default: highest stock first on page open. "azalan" (low/out-of-stock
  // first) and "azdan-coxa" remain available from the dropdown.
  const [siralama, setSiralama] = useState("coxdan-aza");
  // Status filter: "Hamısı" / "Azalır" (low stock) / "Bitib" (out of stock).
  const [durumFilter, setDurumFilter] = useState("Hamısı");

  // Piece-counted and weighed (kg) products use different units, so a single
  // combined sum ("84 ədəd + 45kq" as one number) would be meaningless.
  const totalUnitsEded = products.filter((p) => p.novu !== "çəki").reduce((s, p) => s + p.stok, 0);
  const totalUnitsKq = products.filter((p) => p.novu === "çəki").reduce((s, p) => s + p.stok, 0);
  const lowStock = products.filter((p) => p.stok > 0 && p.stok <= LOW_STOCK_ESIYI).length;
  const outStock = products.filter((p) => p.stok <= 0).length;
  const stockValue = products.reduce((s, p) => s + p.stok * p.alish, 0);

  const filteredByDurum = products.filter((p) => {
    if (durumFilter === "Azalır") return p.stok > 0 && p.stok <= LOW_STOCK_ESIYI;
    if (durumFilter === "Bitib") return p.stok <= 0;
    return true;
  });

  const sorted = [...filteredByDurum].sort((a, b) => {
    if (siralama === "coxdan-aza") return b.stok - a.stok;
    if (siralama === "azdan-coxa") return a.stok - b.stok;
    // "azalan": low/out-of-stock items float to the top so they're the first
    // thing seen, not buried in a long alphabetical list.
    const aLow = a.stok <= LOW_STOCK_ESIYI;
    const bLow = b.stok <= LOW_STOCK_ESIYI;
    if (aLow !== bLow) return aLow ? -1 : 1;
    return a.stok - b.stok;
  });
  const stokPageCount = Math.max(1, Math.ceil(sorted.length / STOK_SEHIFE_OLCUSU));
  const stokClampedPage = Math.min(page, stokPageCount - 1);
  const stokPaged = sorted.slice(stokClampedPage * STOK_SEHIFE_OLCUSU, (stokClampedPage + 1) * STOK_SEHIFE_OLCUSU);

  const openGiren = (p) => { setGiren(p); setMiqdar(""); setError(""); };
  const openCixan = (p) => { setCixan(p); setMiqdar(""); setSebeb(CIXIS_SEBEBLERI[0]); setSebebQeyd(""); setError(""); };

  // adjustStockBy resolves to false on any failure (no server connection,
  // wrong/missing admin auth, etc.) — closing the modal regardless used to
  // make a failed save look identical to a successful one. Now it stays
  // open with a message instead of silently doing nothing.
  const saveGiren = async () => {
    const n = parseInt(miqdar, 10);
    if (!n || n <= 0) { setError("Miqdarı düzgün daxil edin."); return; }
    setError("");
    const ok = await adjustStockBy(giren.kod, n, "Mal gəlişi");
    if (!ok) { setError("Yadda saxlanmadı — serverlə əlaqəni yoxlayın."); return; }
    setGiren(null);
  };
  const saveCixan = async () => {
    const n = parseInt(miqdar, 10);
    if (!n || n <= 0) { setError("Miqdarı düzgün daxil edin."); return; }
    if (n > cixan.stok) { setError("Mövcud stokdan çox ola bilməz."); return; }
    setError("");
    const reason = sebeb === "Digər" ? (sebebQeyd.trim() || "Digər") : sebeb;
    const ok = await adjustStockBy(cixan.kod, -n, reason);
    if (!ok) { setError("Yadda saxlanmadı — serverlə əlaqəni yoxlayın."); return; }
    setCixan(null);
  };

  const openQebul = () => {
    setQebulRows([]);
    setQebulBarkod("");
    setQebulError("");
    setQebulEndirim("");
    setQebulTedarukcu("");
    setQebulOpen(true);
  };

  // Markup % shown next to alış qiyməti: e.g. alış 1 AZN + 20% → satış 1.20
  // AZN. Kept as its own field (not derived each render) so it survives
  // being blank/mid-typed without fighting the user's keystrokes.
  const markupFromPrices = (alish, satish) => {
    const a = Number(alish);
    const s = Number(satish);
    if (!a || a <= 0 || !(s > a)) return "";
    return String(round2(((s - a) / a) * 100));
  };

  const qebulScan = (rawCode) => {
    const code = rawCode.trim();
    if (!code) return;
    const product = products.find((p) => p.kod === code);
    if (!product) {
      setQebulError(`Bu barkodla məhsul tapılmadı: ${code}`);
      setQebulBarkod("");
      return;
    }
    setQebulError("");
    setQebulBarkod("");
    setQebulRows((rows) => {
      const i = rows.findIndex((r) => r.kod === product.kod);
      if (i >= 0) {
        const next = [...rows];
        next[i] = { ...next[i], miqdar: next[i].miqdar + 1 };
        return next;
      }
      return [
        ...rows,
        {
          kod: product.kod,
          ad: product.ad,
          miqdar: 1,
          alish: product.alish,
          satish: product.satish,
          markup: markupFromPrices(product.alish, product.satish),
        },
      ];
    });
  };

  const updateQebulRow = (kod, field, value) => {
    setQebulRows((rows) =>
      rows.map((r) => {
        if (r.kod !== kod) return r;
        if (field === "markup") {
          const a = Number(r.alish) || 0;
          const pct = Number(value) || 0;
          const satish = value === "" ? r.satish : round2(a * (1 + pct / 100));
          return { ...r, markup: value, satish };
        }
        if (field === "alish") {
          // Keep satış in sync with the markup % already set for this row,
          // so bumping the purchase price doesn't silently leave the old
          // (now wrong) sale price behind.
          const a = Number(value) || 0;
          const pct = Number(r.markup) || 0;
          const satish = r.markup === "" ? r.satish : round2(a * (1 + pct / 100));
          return { ...r, alish: value, satish };
        }
        if (field === "satish") {
          return { ...r, satish: value, markup: markupFromPrices(r.alish, value) };
        }
        return { ...r, [field]: value };
      })
    );
  };
  const removeQebulRow = (kod) => setQebulRows((rows) => rows.filter((r) => r.kod !== kod));

  const qebulTotal = qebulRows.reduce((s, r) => s + (Number(r.miqdar) || 0) * (Number(r.alish) || 0), 0);
  const qebulEndirimPct = Number(qebulEndirim) || 0;
  const qebulOdeniler = round2(qebulTotal * (1 - qebulEndirimPct / 100));

  // Saved as one purchase record (tədarükçü + line items + the invoice
  // discount) in a single request — the server applies every line's stock-in
  // and price update, and the record then shows up under that supplier's
  // own purchase history in TechizatcilarPage.
  const saveQebul = async () => {
    if (qebulRows.length === 0) return;
    if (!qebulTedarukcu.trim()) { setQebulError("Təchizatçı adını daxil edin."); return; }
    setQebulSaving(true);
    setQebulError("");
    const ok = await addPurchase({
      tedarukcu: qebulTedarukcu.trim(),
      items: qebulRows.map((r) => ({ kod: r.kod, miqdar: Number(r.miqdar), alish: Number(r.alish), satish: Number(r.satish) })),
      endirimPct: qebulEndirimPct,
    });
    setQebulSaving(false);
    if (!ok) { setQebulError("Yadda saxlanmadı — serverlə əlaqəni yoxlayın."); return; }
    setQebulOpen(false);
  };

  // "Excel-ə export" of the movement log (not the product list) — every
  // stock-in and every write-off, with its reason, so a full audit report
  // can be pulled without digging through the app.
  const exportMovements = () => {
    const header = ["Tarix", "Barkod", "Ad", "Tip", "Miqdar", "Səbəb", "Əməliyyatdan sonra qalıq"];
    const rows = (stockMovements || []).map((m) => [m.tarix, m.kod, m.ad, m.tip, m.miqdar, m.sebeb || "", m.qaliq]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws["!cols"] = header.map((h) => ({ wch: h === "Ad" ? 32 : h === "Səbəb" ? 20 : 14 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stok hərəkətləri");
    XLSX.writeFile(wb, `zehra-market-stok-hereketleri-${nowDateStr().replace(/\./g, "-")}.xlsx`);
  };

  return (
    <div>
      <PageHeader title="Stok" />
      <div className="grid grid-cols-4 gap-4 mb-5">
        <StatCard
          label="Ümumi stok"
          value={`${totalUnitsEded.toLocaleString("az-AZ")} ədəd`}
          sub={`${totalUnitsKq.toLocaleString("az-AZ", { maximumFractionDigits: 3 })} kq (çəki ilə)`}
          icon={Boxes}
          tone="green"
          onClick={() => { setDurumFilter("Hamısı"); setPage(0); }}
        />
        <StatCard label="Azalan stok" value={String(lowStock)} sub={`məhsul (≤ ${LOW_STOCK_ESIYI} ədəd)`} icon={AlertTriangle} tone="amber" onClick={() => { setDurumFilter("Azalır"); setPage(0); }} />
        <StatCard label="Bitən stok" value={String(outStock)} sub="məhsul" icon={XCircle} tone="red" onClick={() => { setDurumFilter("Bitib"); setPage(0); }} />
        <StatCard label="Stok dəyəri" value={`${fmt(stockValue)} AZN`} sub="alış qiyməti ilə" icon={Wallet} tone="blue" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between border-b border-gray-100">
          <div className="font-bold text-sm text-gray-600">STOK NƏZARƏTİ</div>
          <div className="flex items-center gap-3">
            <select
              value={durumFilter}
              onChange={(e) => { setDurumFilter(e.target.value); setPage(0); }}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none focus:border-green-400"
            >
              <option value="Hamısı">Hamısı</option>
              <option value="Azalır">Azalan stok</option>
              <option value="Bitib">Bitən stok</option>
            </select>
            <select
              value={siralama}
              onChange={(e) => { setSiralama(e.target.value); setPage(0); }}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none focus:border-green-400"
            >
              <option value="coxdan-aza">Stok: çoxdan aza</option>
              <option value="azdan-coxa">Stok: azdan çoxa</option>
              <option value="azalan">Əvvəlcə azalan/bitən</option>
            </select>
            <button onClick={exportMovements} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700">
              <Download size={14} /> Stok hərəkətləri (Excel)
            </button>
            <button onClick={openQebul} className="bg-[#16a34a] hover:bg-[#15803d] text-white rounded-lg px-3 py-1.5 text-xs font-bold">
              MAL QƏBULU
            </button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 text-xs">
              <th className="py-2 px-5">Məhsul</th><th className="py-2 px-5">Mövcud</th>
              <th className="py-2 px-5">Vəziyyət</th><th className="py-2 px-5"></th>
            </tr>
          </thead>
          <tbody>
            {stokPaged.map((p) => {
              const low = p.stok <= LOW_STOCK_ESIYI;
              return (
                <tr key={p.kod} className={`border-t border-gray-100 ${low ? "bg-red-50" : ""}`}>
                  <td className={`py-3 px-5 font-medium ${low ? "text-red-700" : ""}`}>{p.ad}</td>
                  <td className={`py-3 px-5 font-semibold ${low ? "text-red-600" : ""}`}>{p.stok}</td>
                  <td className="py-3 px-5"><StatusPill status={stokVeziyyet(p)} /></td>
                  <td className="py-3 px-5 flex gap-3">
                    <button onClick={() => openGiren(p)} className="text-green-600 text-xs font-semibold">MAL GƏLDİ</button>
                    <button onClick={() => openCixan(p)} className="text-red-600 text-xs font-semibold">STOKDAN ÇIXAR</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-xs text-gray-500">
            <div>
              {stokClampedPage * STOK_SEHIFE_OLCUSU + 1}–{Math.min((stokClampedPage + 1) * STOK_SEHIFE_OLCUSU, sorted.length)} / {sorted.length} məhsul
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((pg) => Math.max(0, pg - 1))}
                disabled={stokClampedPage === 0}
                className="border border-gray-200 rounded-lg px-3 py-1.5 font-semibold disabled:opacity-30"
              >
                « Əvvəlki
              </button>
              <span className="font-semibold">{stokClampedPage + 1} / {stokPageCount}</span>
              <button
                onClick={() => setPage((pg) => Math.min(stokPageCount - 1, pg + 1))}
                disabled={stokClampedPage >= stokPageCount - 1}
                className="border border-gray-200 rounded-lg px-3 py-1.5 font-semibold disabled:opacity-30"
              >
                Sonrakı »
              </button>
            </div>
          </div>
        )}
      </div>

      {giren && (
        <Modal title={`Mal gəldi — ${giren.ad}`} onClose={() => setGiren(null)}>
          <div className="space-y-4">
            <div className="text-xs text-gray-500">Mövcud stok: <span className="font-semibold">{giren.stok}</span></div>
            <FormField label="Əlavə olunan miqdar" type="number" value={miqdar} onChange={(e) => setMiqdar(e.target.value)} autoFocus />
            {error && <div className="text-red-500 text-xs font-semibold">{error}</div>}
            <div className="flex gap-2">
              <button onClick={() => setGiren(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 font-semibold text-gray-500 text-sm">
                Ləğv et
              </button>
              <button onClick={saveGiren} className="flex-[2] bg-[#16a34a] hover:bg-[#15803d] text-white rounded-xl py-2.5 font-bold text-sm">
                Əlavə et
              </button>
            </div>
          </div>
        </Modal>
      )}

      {cixan && (
        <Modal title={`Stokdan çıxar — ${cixan.ad}`} onClose={() => setCixan(null)}>
          <div className="space-y-4">
            <div className="text-xs text-gray-500">Mövcud stok: <span className="font-semibold">{cixan.stok}</span></div>
            <FormField label="Çıxarılan miqdar" type="number" value={miqdar} onChange={(e) => setMiqdar(e.target.value)} autoFocus />
            <div>
              <div className="text-xs text-gray-500 mb-1">Səbəb</div>
              <select
                value={sebeb}
                onChange={(e) => setSebeb(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400"
              >
                {CIXIS_SEBEBLERI.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {sebeb === "Digər" && (
              <FormField label="Qeyd" value={sebebQeyd} onChange={(e) => setSebebQeyd(e.target.value)} />
            )}
            {error && <div className="text-red-500 text-xs font-semibold">{error}</div>}
            <div className="flex gap-2">
              <button onClick={() => setCixan(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 font-semibold text-gray-500 text-sm">
                Ləğv et
              </button>
              <button onClick={saveCixan} className="flex-[2] bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 font-bold text-sm">
                Çıxar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {qebulOpen && (
        <Modal title="Mal qəbulu" onClose={() => setQebulOpen(false)} widthClass="max-w-2xl">
          <div className="space-y-4">
            <div>
              <FormField
                label="Təchizatçı"
                value={qebulTedarukcu}
                onChange={(e) => setQebulTedarukcu(e.target.value)}
                list="qebul-tedarukcu-list"
                placeholder="Təchizatçı adı"
              />
              <datalist id="qebul-tedarukcu-list">
                {suppliers.map((s) => <option key={s.ad} value={s.ad} />)}
              </datalist>
            </div>
            <FormField
              label="Barkodu skan edin və ya daxil edin"
              value={qebulBarkod}
              onChange={(e) => setQebulBarkod(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && qebulScan(qebulBarkod)}
              autoFocus
            />
            {qebulError && <div className="text-red-500 text-xs font-semibold">{qebulError}</div>}
            {qebulRows.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left text-gray-400 text-xs">
                      <th className="py-2 px-3">Mal</th>
                      <th className="py-2 px-3 w-20">Miqdar</th>
                      <th className="py-2 px-3 w-24">Alış qiy.</th>
                      <th className="py-2 px-3 w-20">Nisbət %</th>
                      <th className="py-2 px-3 w-24">Satış qiy.</th>
                      <th className="py-2 px-3 w-24">Məbləğ</th>
                      <th className="py-2 px-3 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {qebulRows.map((r) => (
                      <tr key={r.kod} className="border-t border-gray-100">
                        <td className="py-2 px-3 font-medium">{r.ad}<div className="text-[10px] text-gray-400">{r.kod}</div></td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            value={r.miqdar}
                            onChange={(e) => updateQebulRow(r.kod, "miqdar", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-green-400"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            value={r.alish}
                            onChange={(e) => updateQebulRow(r.kod, "alish", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-green-400"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            value={r.markup}
                            placeholder="20"
                            onChange={(e) => updateQebulRow(r.kod, "markup", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-green-400"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            value={r.satish}
                            onChange={(e) => updateQebulRow(r.kod, "satish", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-green-400"
                          />
                        </td>
                        <td className="py-2 px-3 font-semibold">{fmt((Number(r.miqdar) || 0) * (Number(r.alish) || 0))}</td>
                        <td className="py-2 px-3">
                          <button onClick={() => removeQebulRow(r.kod)} className="text-gray-400 hover:text-red-500">
                            <XCircle size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {qebulRows.length === 0 && (
              <div className="text-xs text-gray-400 text-center py-6">Barkod skan edərək mal siyahısına əlavə edin.</div>
            )}
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Təchizatçı endirimi</span>
                <input
                  type="number"
                  value={qebulEndirim}
                  placeholder="0"
                  onChange={(e) => setQebulEndirim(e.target.value)}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:border-green-400"
                />
                <span className="text-xs text-gray-500">%</span>
              </div>
              <div className="text-right">
                {qebulEndirimPct > 0 && (
                  <div className="text-xs text-gray-400 line-through">{fmt(qebulTotal)} AZN</div>
                )}
                <div className="text-sm font-bold">Ödəniləcək: {fmt(qebulOdeniler)} AZN</div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setQebulOpen(false)} className="py-2.5 px-4 rounded-xl border border-gray-200 font-semibold text-gray-500 text-sm">
                Ləğv et
              </button>
              <button
                onClick={saveQebul}
                disabled={qebulRows.length === 0 || qebulSaving || !qebulTedarukcu.trim()}
                className="py-2.5 px-6 bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-40 text-white rounded-xl font-bold text-sm"
              >
                {qebulSaving ? "Saxlanılır..." : "Yadda saxla"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Parses the app's "DD.MM.YYYY HH:MM" sale timestamp into a Date for filtering/sorting.
function parseTarix(t) {
  if (!t) return null;
  const [datePart, timePart] = t.split(" ");
  const [d, m, y] = (datePart || "").split(".").map(Number);
  if (!d || !m || !y) return null;
  const [hh, mm] = (timePart || "0:0").split(":").map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0);
}

const SATIS_SEHIFE_OLCUSU = 50;

// yyyy-mm-dd in local time, matching what a <input type="date"> holds.
function isoDate(d) {
  const pad2 = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function SatislarPage() {
  const { sales } = useMarket();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [kassirFilter, setKassirFilter] = useState("Hamısı");
  const [odenishFilter, setOdenishFilter] = useState("Hamısı");
  const [detailSale, setDetailSale] = useState(null);
  // "Sürətli" period buttons — Günlük/Həftəlik/Aylıq just fill dateFrom/dateTo
  // below, so they compose with the existing manual date range and other
  // filters instead of being a separate filtering path.
  const [cəldDovr, setCəldDovr] = useState("hamisi");
  // A full 1C sales history import can run into the tens of thousands of
  // receipts — rendering them all as <tr> elements at once freezes the tab.
  const [page, setPage] = useState(0);

  const secCəldDovr = (key) => {
    setCəldDovr(key);
    setPage(0);
    const today = new Date();
    if (key === "hamisi") {
      setDateFrom("");
      setDateTo("");
    } else if (key === "gunluk") {
      const iso = isoDate(today);
      setDateFrom(iso);
      setDateTo(iso);
    } else if (key === "heftelik") {
      const gun = (today.getDay() + 6) % 7; // Monday = 0
      const monday = new Date(today);
      monday.setDate(today.getDate() - gun);
      setDateFrom(isoDate(monday));
      setDateTo(isoDate(today));
    } else if (key === "aylıq") {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      setDateFrom(isoDate(first));
      setDateTo(isoDate(today));
    }
  };

  const kassirs = useMemo(() => ["Hamısı", ...new Set(sales.map((s) => s.kassir).filter(Boolean))], [sales]);

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      const d = parseTarix(s.tarix);
      if (dateFrom && d && d < new Date(`${dateFrom}T00:00:00`)) return false;
      if (dateTo && d && d > new Date(`${dateTo}T23:59:59`)) return false;
      if (kassirFilter !== "Hamısı" && s.kassir !== kassirFilter) return false;
      if (odenishFilter !== "Hamısı" && s.odenish !== odenishFilter) return false;
      return true;
    });
  }, [sales, dateFrom, dateTo, kassirFilter, odenishFilter]);

  const satisPageCount = Math.max(1, Math.ceil(filtered.length / SATIS_SEHIFE_OLCUSU));
  const satisClampedPage = Math.min(page, satisPageCount - 1);
  const satisPaged = filtered.slice(satisClampedPage * SATIS_SEHIFE_OLCUSU, (satisClampedPage + 1) * SATIS_SEHIFE_OLCUSU);

  const totalSum = filtered.reduce((sum, s) => sum + (s.meblegh || 0), 0);
  const hasFilter = dateFrom || dateTo || kassirFilter !== "Hamısı" || odenishFilter !== "Hamısı";
  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setKassirFilter("Hamısı");
    setOdenishFilter("Hamısı");
    setCəldDovr("hamisi");
    setPage(0);
  };

  const selectCls = "bg-white border border-gray-200 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-600 outline-none focus:border-green-400";

  const cəldDovrler = [
    { key: "hamisi", label: "Hamısı" },
    { key: "gunluk", label: "Günlük" },
    { key: "heftelik", label: "Həftəlik" },
    { key: "aylıq", label: "Aylıq" },
  ];

  return (
    <div>
      <PageHeader title="Satışlar" />
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center bg-white border border-gray-200 rounded-full p-1">
          {cəldDovrler.map((d) => (
            <button
              key={d.key}
              onClick={() => secCəldDovr(d.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${
                cəldDovr === d.key ? "bg-[#16a34a] text-white" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-full pl-3 pr-2 py-1.5">
          <span className="text-xs font-semibold text-gray-400">Tarix</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setCəldDovr("manual"); setPage(0); }}
            className="text-xs font-semibold text-gray-600 outline-none w-[120px]"
          />
          <span className="text-xs text-gray-300">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setCəldDovr("manual"); setPage(0); }}
            className="text-xs font-semibold text-gray-600 outline-none w-[120px]"
          />
        </div>
        <select value={kassirFilter} onChange={(e) => { setKassirFilter(e.target.value); setPage(0); }} className={selectCls}>
          {kassirs.map((k) => (
            <option key={k} value={k}>{k === "Hamısı" ? "KASSİR: HAMISI" : k}</option>
          ))}
        </select>
        <select value={odenishFilter} onChange={(e) => { setOdenishFilter(e.target.value); setPage(0); }} className={selectCls}>
          <option value="Hamısı">ÖDƏNİŞ: HAMISI</option>
          <option value="NƏĞD">NƏĞD</option>
          <option value="KART">KART</option>
          <option value="QARIŞIQ">QARIŞIQ</option>
        </select>
        {hasFilter && (
          <button onClick={resetFilters} className="text-xs font-semibold text-red-500 hover:text-red-600 px-2">
            Filtri sıfırla ✕
          </button>
        )}
        <div className="ml-auto text-xs text-gray-500 font-semibold">
          {filtered.length} çek · {fmt(totalSum)} AZN
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500 text-xs">
              <th className="py-3 px-4">Çek №</th><th className="py-3 px-4">Tarix / saat</th><th className="py-3 px-4">Kassir</th>
              <th className="py-3 px-4">Məhsul sayı</th><th className="py-3 px-4">Məbləğ</th><th className="py-3 px-4">Ödəniş</th><th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {satisPaged.map((s) => (
              <tr key={s.no} className="border-t border-gray-100">
                <td className="py-3 px-4 font-medium">{s.no}</td>
                <td className="py-3 px-4 text-gray-500">{s.tarix}</td>
                <td className="py-3 px-4">{s.kassir}</td>
                <td className="py-3 px-4">
                  <button onClick={() => setDetailSale(s)} className="text-blue-600 font-semibold underline decoration-dotted">
                    {s.say}
                  </button>
                </td>
                <td className="py-3 px-4 font-semibold">{fmt(s.meblegh)} AZN</td>
                <td className="py-3 px-4">
                  {s.odenish}
                  {s.odenish === "QARIŞIQ" && (
                    <div className="text-[10px] text-gray-400">
                      Nəğd {fmt(s.cashPart)} · Kart {fmt(s.cardPart)}
                    </div>
                  )}
                </td>
                <td className="py-3 px-4">
                  {s._pending ? (
                    <span className="bg-amber-50 text-amber-600 text-xs font-bold px-2.5 py-1 rounded-full">⏳ Gözləyir</span>
                  ) : (
                    <StatusPill status={s.status} />
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">Bu filtrə uyğun satış tapılmadı</td>
              </tr>
            )}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
            <div>
              {satisClampedPage * SATIS_SEHIFE_OLCUSU + 1}–{Math.min((satisClampedPage + 1) * SATIS_SEHIFE_OLCUSU, filtered.length)} / {filtered.length} çek
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((pg) => Math.max(0, pg - 1))}
                disabled={satisClampedPage === 0}
                className="border border-gray-200 rounded-lg px-3 py-1.5 font-semibold disabled:opacity-30"
              >
                « Əvvəlki
              </button>
              <span className="font-semibold">{satisClampedPage + 1} / {satisPageCount}</span>
              <button
                onClick={() => setPage((pg) => Math.min(satisPageCount - 1, pg + 1))}
                disabled={satisClampedPage >= satisPageCount - 1}
                className="border border-gray-200 rounded-lg px-3 py-1.5 font-semibold disabled:opacity-30"
              >
                Sonrakı »
              </button>
            </div>
          </div>
        )}
      </div>

      {detailSale && (
        <Modal title={`Çek ${detailSale.no}`} onClose={() => setDetailSale(null)} widthClass="max-w-md">
          <div className="space-y-3">
            <div className="text-xs text-gray-500 flex justify-between">
              <span>{detailSale.tarix}</span>
              <span>Kassir: {detailSale.kassir}</span>
            </div>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 text-xs">
                    <th className="py-2 px-3">Məhsul</th>
                    <th className="py-2 px-3">Miqdar</th>
                    <th className="py-2 px-3 text-right">Məbləğ</th>
                  </tr>
                </thead>
                <tbody>
                  {(detailSale.items || []).map((it, idx) => (
                    <tr key={it.kod + idx} className="border-t border-gray-100">
                      <td className="py-2 px-3">{it.ad}</td>
                      <td className="py-2 px-3 text-gray-500">
                        {it.novu === "çəki" ? `${it.miqdar.toFixed(3)} kq` : it.miqdar}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold">
                        {fmt(it.qiymet * it.miqdar * (1 - it.endirim / 100))} AZN
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-1.5">
              <div className="flex justify-between text-sm font-bold">
                <span>Yekun</span>
                <span className="text-[#16a34a]">{fmt(detailSale.meblegh)} AZN</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Ödəniş növü</span>
                <span className="font-semibold">{detailSale.odenish}</span>
              </div>
              {detailSale.odenish === "QARIŞIQ" && (
                <>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>— Nəğd hissə</span>
                    <span className="font-semibold">{fmt(detailSale.cashPart)} AZN</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>— Kart hissə</span>
                    <span className="font-semibold">{fmt(detailSale.cardPart)} AZN</span>
                  </div>
                  {detailSale.change > 0 && (
                    <>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Nəğd verilən</span>
                        <span className="font-semibold">{fmt(detailSale.received)} AZN</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Geri qaytarılan</span>
                        <span className="font-semibold">{fmt(detailSale.change)} AZN</span>
                      </div>
                    </>
                  )}
                </>
              )}
              {detailSale.odenish === "NƏĞD" && detailSale.received != null && (
                <>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Alınan</span>
                    <span className="font-semibold">{fmt(detailSale.received)} AZN</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Geri qaytarılan</span>
                    <span className="font-semibold">{fmt(detailSale.change)} AZN</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function HesabatlarPage() {
  const { sales, resetSales, products, settings } = useMarket();
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState(null);

  const handleReset = async () => {
    if (!window.confirm(`Bütün satış tarixçəsi (${sales.length} çek) HƏMİŞƏLİK silinsin? Bu əməliyyat geri qaytarıla bilməz.`)) return;
    if (!window.confirm("Əminsiniz? Ehtiyat nüsxə götürmədən sıfırlamaq tövsiyə olunmur.")) return;
    setResetting(true);
    const ok = await resetSales();
    setResetting(false);
    setResetMsg({ text: ok ? "Satış tarixçəsi sıfırlandı." : "Sıfırlama alınmadı — server ilə əlaqəni yoxlayın.", isError: !ok });
    setTimeout(() => setResetMsg(null), 4000);
  };

  const [pdfMsg, setPdfMsg] = useState(null);
  const printReport = async () => {
    if (!window.electronAPI) {
      window.print();
      return;
    }
    const result = await window.electronAPI.exportReportPdf();
    if (result && result.ok) {
      setPdfMsg({ text: `PDF yadda saxlanıldı: ${result.filePath}`, isError: false });
    } else if (result && !result.canceled) {
      setPdfMsg({ text: "PDF yaradıla bilmədi.", isError: true });
    }
    setTimeout(() => setPdfMsg(null), 4500);
  };

  const bugunSales = sales.filter((s) => s.tarix && s.tarix.startsWith(nowDateStr()));
  const dovriyye = bugunSales.reduce((sum, s) => sum + (s.meblegh || 0), 0);
  const neghd =
    bugunSales.filter((s) => s.odenish === "NƏĞD").reduce((sum, s) => sum + (s.meblegh || 0), 0) +
    bugunSales.filter((s) => s.odenish === "QARIŞIQ").reduce((sum, s) => sum + (s.cashPart || 0), 0);
  const kart =
    bugunSales.filter((s) => s.odenish === "KART").reduce((sum, s) => sum + (s.meblegh || 0), 0) +
    bugunSales.filter((s) => s.odenish === "QARIŞIQ").reduce((sum, s) => sum + (s.cardPart || 0), 0);
  const neghdPct = dovriyye > 0 ? (neghd / dovriyye) * 100 : 0;
  const kartPct = dovriyye > 0 ? (kart / dovriyye) * 100 : 0;
  const menfeet = bugunSales.reduce((sum, s) => {
    return (
      sum +
      (s.items || []).reduce((isum, it) => {
        const product = products.find((p) => p.kod === it.kod);
        if (!product) return isum;
        const satisQiymeti = it.qiymet * (1 - it.endirim / 100);
        return isum + (satisQiymeti - product.alish) * it.miqdar;
      }, 0)
    );
  }, 0);

  const topProducts = useMemo(() => {
    const totals = {};
    sales.forEach((s) => {
      (s.items || []).forEach((it) => {
        if (!it.ad || it.kod === "-") return;
        const line = it.qiymet * it.miqdar * (1 - it.endirim / 100);
        totals[it.ad] = (totals[it.ad] || 0) + line;
      });
    });
    return Object.entries(totals)
      .map(([ad, meblegh]) => ({ ad, meblegh }))
      .sort((a, b) => b.meblegh - a.meblegh)
      .slice(0, 5);
  }, [sales]);

  return (
    <div>
      <PageHeader title="Hesabatlar" />
      {resetMsg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-semibold mb-4 ${resetMsg.isError ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
          {resetMsg.text}
        </div>
      )}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="text-xs text-gray-500 font-medium">GÜNLÜK DÖVRİYYƏ</div>
          <div className="text-2xl font-black mt-1">{fmt(dovriyye)} AZN</div>
          <div className="text-xs text-gray-400 mt-1">{nowDateStr()}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex justify-between text-sm">
            <div>
              <div className="text-xs text-gray-500">Nəğd</div>
              <div className="font-bold text-lg">{fmt(neghd)} AZN</div>
              <div className="text-xs text-gray-400">{neghdPct.toFixed(1)}%</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Kart</div>
              <div className="font-bold text-lg">{fmt(kart)} AZN</div>
              <div className="text-xs text-gray-400">{kartPct.toFixed(1)}%</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="text-xs text-gray-500 font-medium">XALİS MƏNFƏƏT</div>
          <div className="text-2xl font-black text-green-600 mt-1">{fmt(menfeet)} AZN</div>
          <div className="text-xs text-gray-400 mt-1">təxmini (bu gün)</div>
        </div>
      </div>
      <div className="grid grid-cols-[1.4fr_1fr] gap-4 mb-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="text-sm font-bold text-gray-600 mb-3">GÜNLƏR ÜZRƏ SATIŞ</div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CHART_DATA}>
                <XAxis dataKey="gun" axisLine={false} tickLine={false} fontSize={12} />
                <Tooltip formatter={(v) => `${fmt(v)} AZN`} />
                <Bar dataKey="satish" fill="#166534" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="text-sm font-bold text-gray-600 mb-3">TOP MƏHSULLAR</div>
          <div className="space-y-2">
            {topProducts.length === 0 && <div className="text-sm text-gray-400">Hələ satış yoxdur.</div>}
            {topProducts.map((p, i) => (
              <div key={p.ad} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{i + 1}. {p.ad}</span>
                <span className="font-semibold">{fmt(p.meblegh)} AZN</span>
              </div>
            ))}
          </div>
          <button onClick={printReport} className="w-full mt-4 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-600 hover:border-green-400">
            PDF HESABATINI YÜKLƏ
          </button>
          {pdfMsg && (
            <div className={`text-[11px] mt-1.5 text-center font-semibold ${pdfMsg.isError ? "text-red-500" : "text-green-600"}`}>
              {pdfMsg.text}
            </div>
          )}
        </div>
      </div>
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <div className="font-bold text-red-700 text-sm">Satış tarixçəsini sıfırla</div>
          <div className="text-xs text-red-500 mt-1">
            Cari {sales.length} satış qeydini həmişəlik silir. Məhsul və stok məlumatına toxunmur. Əvvəlcə "Ehtiyat nüsxə" götürmək tövsiyə olunur.
          </div>
        </div>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap"
        >
          {resetting ? "Sıfırlanır..." : "Sıfırla"}
        </button>
      </div>

      {/* Print-only report — invisible on screen, only rendered when window.print() runs */}
      <div className="print-area hidden print:block p-8 font-sans text-black">
        <div className="text-center mb-6">
          <div className="font-black text-2xl">{settings.magazaAdi || "ZƏHRA MARKET"}</div>
          <div className="text-sm text-gray-600 mt-1">{settings.unvan}</div>
          <div className="text-sm text-gray-600">VÖEN: {settings.voen} · Tel: {settings.telefon}</div>
          <div className="text-lg font-bold mt-3">Günlük Hesabat — {nowDateStr()}</div>
        </div>

        <table className="w-full text-sm mb-6 border border-gray-300" style={{ borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td className="border border-gray-300 px-3 py-2 font-semibold">Günlük dövriyyə</td>
              <td className="border border-gray-300 px-3 py-2">{fmt(dovriyye)} AZN</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-3 py-2 font-semibold">Nəğd dövriyyə</td>
              <td className="border border-gray-300 px-3 py-2">{fmt(neghd)} AZN ({neghdPct.toFixed(1)}%)</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-3 py-2 font-semibold">Kart dövriyyəsi</td>
              <td className="border border-gray-300 px-3 py-2">{fmt(kart)} AZN ({kartPct.toFixed(1)}%)</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-3 py-2 font-semibold">Satış sayı</td>
              <td className="border border-gray-300 px-3 py-2">{bugunSales.length}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-3 py-2 font-semibold">Təxmini mənfəət</td>
              <td className="border border-gray-300 px-3 py-2">{fmt(menfeet)} AZN</td>
            </tr>
          </tbody>
        </table>

        <div className="font-bold mb-2">Top məhsullar</div>
        <table className="w-full text-sm mb-6 border border-gray-300" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className="border border-gray-300 px-3 py-2 text-left">#</th>
              <th className="border border-gray-300 px-3 py-2 text-left">Məhsul</th>
              <th className="border border-gray-300 px-3 py-2 text-left">Məbləğ</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.map((p, i) => (
              <tr key={p.ad}>
                <td className="border border-gray-300 px-3 py-2">{i + 1}</td>
                <td className="border border-gray-300 px-3 py-2">{p.ad}</td>
                <td className="border border-gray-300 px-3 py-2">{fmt(p.meblegh)} AZN</td>
              </tr>
            ))}
            {topProducts.length === 0 && (
              <tr>
                <td colSpan={3} className="border border-gray-300 px-3 py-2 text-center text-gray-500">Bu gün satış yoxdur</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="font-bold mb-2">Bu günün çekləri</div>
        <table className="w-full text-sm border border-gray-300" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className="border border-gray-300 px-3 py-2 text-left">Çek №</th>
              <th className="border border-gray-300 px-3 py-2 text-left">Vaxt</th>
              <th className="border border-gray-300 px-3 py-2 text-left">Kassir</th>
              <th className="border border-gray-300 px-3 py-2 text-left">Ödəniş</th>
              <th className="border border-gray-300 px-3 py-2 text-left">Məbləğ</th>
            </tr>
          </thead>
          <tbody>
            {bugunSales.map((s) => (
              <tr key={s.no}>
                <td className="border border-gray-300 px-3 py-2">{s.no}</td>
                <td className="border border-gray-300 px-3 py-2">{s.tarix}</td>
                <td className="border border-gray-300 px-3 py-2">{s.kassir}</td>
                <td className="border border-gray-300 px-3 py-2">{s.odenish}</td>
                <td className="border border-gray-300 px-3 py-2">{fmt(s.meblegh)} AZN</td>
              </tr>
            ))}
            {bugunSales.length === 0 && (
              <tr>
                <td colSpan={5} className="border border-gray-300 px-3 py-2 text-center text-gray-500">Bu gün satış yoxdur</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="text-center text-xs text-gray-500 mt-8">Hesabat yaradılma vaxtı: {nowDateStr()}</div>
      </div>
    </div>
  );
}

const emptyEmployeeForm = { ad: "", rol: "Kassir" };

function IscilerPage() {
  const { employees, addEmployee, deleteEmployee } = useMarket();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyEmployeeForm);

  const openAdd = () => {
    setForm(emptyEmployeeForm);
    setModalOpen(true);
  };

  const save = () => {
    if (!form.ad.trim()) return;
    addEmployee({
      ad: form.ad.trim(),
      rol: form.rol,
      icaze: form.rol === "Rəhbər" ? "Tam giriş" : "Yalnız kassa",
      status: "Aktiv",
      giris: "—",
    });
    setModalOpen(false);
  };

  const remove = (e) => {
    if (window.confirm(`"${e.ad}" işçi siyahısından silinsin?`)) deleteEmployee(e.ad);
  };

  return (
    <div>
      <PageHeader title="İşçilər" />
      <div className="flex justify-end mb-4">
        <button onClick={openAdd} className="bg-[#16a34a] text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2">
          <Plus size={16} /> İŞÇİ ƏLAVƏ ET
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500 text-xs">
              <th className="py-3 px-4">İşçi</th><th className="py-3 px-4">Rol</th><th className="py-3 px-4">İcazə</th>
              <th className="py-3 px-4">Status</th><th className="py-3 px-4">Son giriş</th><th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.ad} className="border-t border-gray-100">
                <td className="py-3 px-4 font-medium">{e.ad}</td>
                <td className="py-3 px-4">{e.rol}</td>
                <td className="py-3 px-4 text-gray-500">{e.icaze}</td>
                <td className="py-3 px-4"><StatusPill status={e.status} /></td>
                <td className="py-3 px-4">{e.giris}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <button className="text-blue-600 text-xs font-semibold">İCAZƏLƏR</button>
                    <button onClick={() => remove(e)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-center gap-2">
        <AlertTriangle size={16} /> TƏHLÜKƏSİZLİK: Kassir stok, alış qiyməti, mənfəət və rəhbər hesabatlarını görə bilməz.
      </div>

      {modalOpen && (
        <Modal title="Yeni işçi əlavə et" onClose={() => setModalOpen(false)}>
          <div className="space-y-3">
            <FormField label="Ad Soyad" value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} />
            <div>
              <div className="text-xs text-gray-500 mb-1">Rol</div>
              <select
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400"
              >
                <option value="Kassir">Kassir</option>
                <option value="Rəhbər">Rəhbər</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 font-semibold text-gray-500 text-sm">
                Ləğv et
              </button>
              <button onClick={save} className="flex-[2] bg-[#16a34a] hover:bg-[#15803d] text-white rounded-xl py-2.5 font-bold text-sm">
                Yadda saxla
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const emptySupplierForm = { ad: "", tel: "", meblegh: "", borc: "0", status: "Aktiv" };

function TechizatcilarPage() {
  const { suppliers, purchases, addSupplier, updateSupplier, deleteSupplier } = useMarket();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySupplierForm);
  const [detailSupplier, setDetailSupplier] = useState(null); // supplier whose purchase history is open

  const openAdd = () => {
    setEditing(null);
    setForm(emptySupplierForm);
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      ad: s.ad, tel: s.tel, meblegh: String(s.meblegh),
      borc: String(s.borc), status: s.status,
    });
    setModalOpen(true);
  };

  const save = () => {
    if (!form.ad.trim()) return;
    const payload = {
      ad: form.ad.trim(),
      tel: form.tel.trim(),
      meblegh: parseFloat(form.meblegh) || 0,
      borc: parseFloat(form.borc) || 0,
      status: form.status,
    };
    if (editing) {
      updateSupplier(editing.ad, payload);
    } else {
      addSupplier({ ...payload, sonAlish: nowDateStr() });
    }
    setModalOpen(false);
  };

  const remove = (s) => {
    if (window.confirm(`"${s.ad}" təchizatçısı silinsin?`)) deleteSupplier(s.ad);
  };

  return (
    <div>
      <PageHeader title="Təchizatçılar" />
      <div className="flex justify-end mb-4">
        <button onClick={openAdd} className="bg-[#16a34a] text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2">
          <Plus size={16} /> TƏCHİZATÇI
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500 text-xs">
              <th className="py-3 px-4">Təchizatçı</th><th className="py-3 px-4">Əlaqə</th><th className="py-3 px-4">Son alış</th>
              <th className="py-3 px-4">Məbləğ</th><th className="py-3 px-4">Borc</th><th className="py-3 px-4">Status</th><th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.ad} className="border-t border-gray-100">
                <td className="py-3 px-4 font-medium">
                  <button onClick={() => setDetailSupplier(s.ad)} className="text-left hover:text-green-700 hover:underline">
                    {s.ad}
                  </button>
                </td>
                <td className="py-3 px-4 text-gray-500">{s.tel}</td>
                <td className="py-3 px-4">{s.sonAlish}</td>
                <td className="py-3 px-4 font-semibold">{fmt(s.meblegh)} AZN</td>
                <td className={`py-3 px-4 font-semibold ${s.borc > 0 ? "text-red-500" : "text-gray-400"}`}>{fmt(s.borc)} AZN</td>
                <td className="py-3 px-4"><StatusPill status={s.status} /></td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => openEdit(s)} className="text-blue-600 text-xs font-semibold">DÜZƏLT</button>
                    <button onClick={() => remove(s)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">Təchizatçı yoxdur</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <Modal title={editing ? "Təchizatçını düzəlt" : "Yeni təchizatçı əlavə et"} onClose={() => setModalOpen(false)}>
          <div className="space-y-3">
            <FormField label="Təchizatçı adı" value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} />
            <FormField label="Əlaqə nömrəsi" value={form.tel} onChange={(e) => setForm({ ...form, tel: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Son alış məbləği (AZN)" type="number" value={form.meblegh} onChange={(e) => setForm({ ...form, meblegh: e.target.value })} />
              <FormField label="Borc (AZN)" type="number" value={form.borc} onChange={(e) => setForm({ ...form, borc: e.target.value })} />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Status</div>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400"
              >
                <option value="Aktiv">Aktiv</option>
                <option value="Borc var">Borc var</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 font-semibold text-gray-500 text-sm">
                Ləğv et
              </button>
              <button onClick={save} className="flex-[2] bg-[#16a34a] hover:bg-[#15803d] text-white rounded-xl py-2.5 font-bold text-sm">
                Yadda saxla
              </button>
            </div>
          </div>
        </Modal>
      )}

      {detailSupplier && (
        <Modal title={`Alışlar — ${detailSupplier}`} onClose={() => setDetailSupplier(null)} widthClass="max-w-2xl">
          <div className="space-y-3 max-h-[65vh] overflow-y-auto">
            {(purchases || []).filter((p) => p.tedarukcu === detailSupplier).length === 0 && (
              <div className="text-xs text-gray-400 text-center py-8">Bu təchizatçıdan hələ mal qəbulu qeydə alınmayıb.</div>
            )}
            {(purchases || [])
              .filter((p) => p.tedarukcu === detailSupplier)
              .map((p) => (
                <div key={p.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-600">{p.tarix}</span>
                    <span>
                      {p.endirimPct > 0 && <span className="text-gray-400 line-through mr-2">{fmt(p.cemi)} AZN</span>}
                      <span className="font-bold">{fmt(p.odeniler)} AZN</span>
                      {p.endirimPct > 0 && <span className="text-green-600 ml-1">(-{p.endirimPct}%)</span>}
                    </span>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-400">
                        <th className="py-1.5 px-4">Mal</th><th className="py-1.5 px-4">Miqdar</th>
                        <th className="py-1.5 px-4">Qiymət</th><th className="py-1.5 px-4">Məbləğ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.items.map((it, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="py-1.5 px-4">{it.ad}</td>
                          <td className="py-1.5 px-4">{it.miqdar}</td>
                          <td className="py-1.5 px-4">{fmt(it.alish)} AZN</td>
                          <td className="py-1.5 px-4 font-semibold">{fmt(it.mebleg)} AZN</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function TereziPage() {
  const { products, settings, setSettings } = useMarket();
  const [ip, setIp] = useState(settings.tereziIp || "");
  const [port, setPort] = useState(settings.tereziPort || "1111");
  const [msg, setMsg] = useState(null);
  const [testing, setTesting] = useState(false);
  const [busy, setBusy] = useState(false);
  const isElectron = typeof window !== "undefined" && !!window.electronAPI;
  const weighedCount = products.filter((p) => p.novu === "çəki").length;

  const saveConn = (nextIp, nextPort) => setSettings({ ...settings, tereziIp: nextIp, tereziPort: nextPort });

  const testConnection = async () => {
    if (!isElectron || !ip.trim()) return;
    setTesting(true);
    const res = await window.electronAPI.testTereziConnection(ip.trim(), parseInt(port, 10) || 1111);
    setTesting(false);
    setMsg(res.ok ? { text: "✓ Tərəzi ilə bağlantı quruldu.", isError: false } : { text: `Bağlantı alınmadı: ${res.error}`, isError: true });
    setTimeout(() => setMsg(null), 6000);
  };

  const sendPlu = async () => {
    if (!isElectron || !ip.trim()) return;
    setBusy(true);
    const res = await window.electronAPI.sendTereziPlu(ip.trim(), parseInt(port, 10) || 1111, products);
    setBusy(false);
    setMsg(
      res.ok
        ? { text: `${res.count} məhsul tərəziyə göndərildi.`, isError: false }
        : { text: `Göndərilmədi: ${res.error}`, isError: true }
    );
    setTimeout(() => setMsg(null), 6000);
  };

  return (
    <div>
      <PageHeader title="Tərəzi" />

      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-4 text-sm text-green-800">
        <div className="font-bold mb-1">Format təsdiqləndi</div>
        PLU faylının formatı sizin tərəzinin real mübadilə faylı ilə byte-byte müqayisə edilərək dəqiqləşdirilib.
        1C-yə ehtiyac yoxdur — proqram tərəziyə birbaşa (TCP, IP:port ilə) qoşulur. Yalnız <b>"çəki ilə"</b> satılan
        məhsullar göndərilir (paketlənmiş/ədədlə satılanlar tərəziyə aid deyil). Əvvəlcə "Bağlantını yoxla" ilə test edin.
      </div>

      {!isElectron && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-4 text-sm text-red-600 font-semibold">
          Bu funksiya yalnız quraşdırılmış (Electron) tətbiqdə işləyir, brauzer önizləməsində şəbəkə soketinə giriş yoxdur.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <div className="text-sm font-bold text-gray-600 mb-1">TƏRƏZİNİN ŞƏBƏKƏ ÜNVANI</div>
        <div className="text-xs text-gray-400 mb-4">
          Tərəzinin öz ekranında gördüyünüz IP və port (1C-dəki "Tərəzi" ayarındakı ilə eyni, məs. 192.168.1.151 / 1111).
        </div>
        <div className="grid grid-cols-[1fr_140px_auto] gap-3">
          <FormField
            label="IP ünvanı"
            placeholder="192.168.1.151"
            value={ip}
            onChange={(e) => { setIp(e.target.value); saveConn(e.target.value, port); }}
          />
          <FormField
            label="Port"
            placeholder="1111"
            value={port}
            onChange={(e) => { setPort(e.target.value); saveConn(ip, e.target.value); }}
          />
          <div className="flex items-end">
            <button
              onClick={testConnection}
              disabled={!isElectron || !ip.trim() || testing}
              className="border border-gray-200 hover:border-gray-300 disabled:opacity-40 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap h-[42px]"
            >
              {testing ? "Yoxlanılır..." : "Bağlantını yoxla"}
            </button>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-semibold mb-4 ${msg.isError ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
          {msg.text}
        </div>
      )}

      <button
        onClick={sendPlu}
        disabled={!isElectron || !ip.trim() || busy || weighedCount === 0}
        className="bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-40 text-white rounded-xl px-5 py-3 text-sm font-bold"
      >
        {busy ? "Göndərilir..." : `MƏHSULLARI TƏRƏZİYƏ GÖNDƏR (${weighedCount})`}
      </button>
      {weighedCount === 0 && (
        <div className="text-xs text-gray-400 mt-2">
          Heç bir "çəki ilə" satılan məhsul yoxdur — Məhsullar səhifəsində məhsulun "Növü" sahəsini "çəki" edin.
        </div>
      )}
    </div>
  );
}

function BackupPage() {
  const { products, sales, employees, suppliers, stockMovements, purchases, settings, setSettings, restoreBackup } = useMarket();
  const [restoring, setRestoring] = useState(false);
  const [msg, setMsg] = useState(null);
  const [autoBusy, setAutoBusy] = useState(false);
  const fileInputRef = React.useRef(null);
  const isElectron = typeof window !== "undefined" && !!window.electronAPI;

  const pickAutoFolder = async () => {
    if (!isElectron) return;
    const res = await window.electronAPI.pickBackupFolder();
    if (res.ok) {
      setSettings({ ...settings, avtoBackupQovlugu: res.folder });
      setMsg({ text: `Qovluq seçildi: ${res.folder}. Hər gün avtomatik oraya yazılacaq.`, isError: false });
      setTimeout(() => setMsg(null), 5000);
    }
  };

  const runAutoNow = async () => {
    if (!isElectron || !settings.avtoBackupQovlugu) return;
    setAutoBusy(true);
    await window.electronAPI.runBackupNow();
    setAutoBusy(false);
    setMsg({ text: "İndiki nüsxə seçilmiş qovluğa yazıldı.", isError: false });
    setTimeout(() => setMsg(null), 4000);
  };

  const download = () => {
    const payload = { products, sales, employees, suppliers, stockMovements, purchases, settings, yaradilmaTarixi: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `zehra-market-ehtiyat-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMsg({ text: "Ehtiyat nüsxə endirildi (Downloads qovluğuna baxın).", isError: false });
    setTimeout(() => setMsg(null), 3500);
  };

  const pickRestoreFile = () => {
    fileInputRef.current && fileInputRef.current.click();
  };

  const onFileChosen = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!window.confirm("Bu fayldakı məlumat HAZIRKI bütün məhsul, stok və satış tarixçəsinin ÜZƏRİNƏ yazılacaq. Davam edilsin?")) return;
    setRestoring(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        const ok = await restoreBackup(data);
        setMsg({ text: ok ? "Ehtiyat nüsxədən bərpa olundu." : "Bərpa alınmadı — server ilə əlaqəni yoxlayın.", isError: !ok });
      } catch {
        setMsg({ text: "Fayl oxuna bilmədi — düzgün ehtiyat nüsxə faylı seçdiyinizə əmin olun.", isError: true });
      } finally {
        setRestoring(false);
        setTimeout(() => setMsg(null), 4000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <PageHeader title="Ehtiyat nüsxə" />
      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-semibold mb-4 ${msg.isError ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
          {msg.text}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center mb-4">
            <Download size={20} className="text-[#16a34a]" />
          </div>
          <div className="font-bold mb-1">Ehtiyat nüsxəni yüklə</div>
          <div className="text-sm text-gray-500 mb-4">
            Bütün məhsullar, stok, satış tarixçəsi, işçilər, təchizatçılar və parametrlər tək bir fayla (.json) yığılıb kompüterinizə endirilir.
          </div>
          <button onClick={download} className="bg-[#16a34a] hover:bg-[#15803d] text-white rounded-xl px-4 py-2.5 text-sm font-semibold">
            Yüklə (.json)
          </button>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
            <Upload size={20} className="text-amber-600" />
          </div>
          <div className="font-bold mb-1">Ehtiyat nüsxədən bərpa et</div>
          <div className="text-sm text-gray-500 mb-4">
            Əvvəllər endirilmiş .json faylını seçin. <b>Diqqət:</b> bu, hazırkı bütün məlumatın üzərinə yazılır, geri qaytarıla bilməz.
          </div>
          <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={onFileChosen} className="hidden" />
          <button
            onClick={pickRestoreFile}
            disabled={restoring}
            className="border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-40 rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            {restoring ? "Bərpa olunur..." : "Fayl seç və bərpa et"}
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mt-4">
        <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
          <History size={20} className="text-blue-600" />
        </div>
        <div className="font-bold mb-1">Avtomatik ehtiyat nüsxə (gündəlik)</div>
        <div className="text-sm text-gray-500 mb-4">
          Bir qovluq seçin (mütləq <b>başqa disk və ya USB</b> — eyni diskdə saxlamağın mənası yoxdur, disk xarab olsa hər ikisi itər).
          Proqram hər gün avtomatik oraya bir nüsxə yazacaq.
        </div>
        {!isElectron && (
          <div className="text-sm text-red-600 font-semibold mb-3">Yalnız quraşdırılmış (Electron) tətbiqdə işləyir.</div>
        )}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-600 bg-gray-50 truncate">
            {settings.avtoBackupQovlugu || "Qovluq seçilməyib"}
          </div>
          <button
            onClick={pickAutoFolder}
            disabled={!isElectron}
            className="border border-gray-200 hover:border-gray-300 disabled:opacity-40 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap"
          >
            Qovluq seç
          </button>
        </div>
        <button
          onClick={runAutoNow}
          disabled={!isElectron || !settings.avtoBackupQovlugu || autoBusy}
          className="bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-40 text-white rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          {autoBusy ? "Yazılır..." : "İndi bir nüsxə yaz"}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 mt-4">
        Tövsiyə: mağazanı bağlayarkən gün sonunda bir ehtiyat nüsxə yükləyib, ayrıca bir yerdə (USB, Google Drive və s.) saxlayın.
      </div>
    </div>
  );
}

function ParametrlerPage({ onResetRole }) {
  const { settings, setSettings } = useMarket();
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [printers, setPrinters] = useState([]);
  const role = localStorage.getItem("zehra_role") || "admin";
  const serverUrl = localStorage.getItem("zehra_server_url") || "http://127.0.0.1:4000";
  const isElectron = typeof window !== "undefined" && !!window.electronAPI;

  React.useEffect(() => {
    if (!isElectron) return;
    window.electronAPI.listPrinters().then((res) => {
      if (res.ok) setPrinters(res.printers);
    });
  }, []);

  const Toggle = ({ on, onClick }) => (
    <button
      onClick={onClick}
      className={`w-11 h-6 rounded-full transition relative shrink-0 ${on ? "bg-green-500" : "bg-gray-300"}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition ${on ? "left-5" : "left-0.5"}`} />
    </button>
  );

  const save = () => {
    setSettings(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <PageHeader title="Parametrlər" />
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <div className="text-sm font-bold text-gray-600 mb-1">ŞƏBƏKƏ</div>
        <div className="text-xs text-gray-400 mb-4">
          Bu kompüter hazırda <b>{role === "admin" ? "ADMİN (Baza)" : "KASSA (yalnız satış)"}</b> rolundadır və
          <span className="font-mono"> {serverUrl}</span> ünvanındakı serverlə işləyir.
          {role === "admin" && (
            <> Kassa kompüterlərini qoşmaq üçün bu kompüterin lokal IP ünvanını (Windows-da <code>ipconfig</code> əmri ilə tapılır, "IPv4 Address" sətri) və soldakı menyunun altında görünən tokeni həmin kompüterlərdə daxil edin. Token olmadan kassa serverə qoşula bilməz.</>
          )}
        </div>
        <button
          onClick={() => {
            if (window.confirm("Rol seçimi sıfırlansın? Proqram yenidən 'Admin / Kassa' seçimini soruşacaq.")) {
              onResetRole && onResetRole();
            }
          }}
          className="border border-red-200 text-red-500 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-red-50"
        >
          Rol seçimini sıfırla
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <div className="text-sm font-bold text-gray-600 mb-4">MAĞAZA PARAMETRLƏRİ</div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Mağaza adı" value={draft.magazaAdi} onChange={(e) => setDraft({ ...draft, magazaAdi: e.target.value })} />
          <FormField label="VÖEN" value={draft.voen} onChange={(e) => setDraft({ ...draft, voen: e.target.value })} />
          <FormField label="Telefon" value={draft.telefon} onChange={(e) => setDraft({ ...draft, telefon: e.target.value })} />
          <FormField label="Ünvan" value={draft.unvan} onChange={(e) => setDraft({ ...draft, unvan: e.target.value })} />
          <FormField label="Valyuta" value={draft.valyuta} onChange={(e) => setDraft({ ...draft, valyuta: e.target.value })} />
          <div>
            <div className="text-xs text-gray-500 mb-1">Çek printeri</div>
            {isElectron && printers.length > 0 ? (
              <select
                value={draft.printerName || ""}
                onChange={(e) => setDraft({ ...draft, printerName: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400"
              >
                <option value="">Sistemin default printeri</option>
                {printers.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}{p.isDefault ? " (default)" : ""}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={draft.printer}
                onChange={(e) => setDraft({ ...draft, printer: e.target.value })}
                placeholder={isElectron ? "Printer tapılmadı" : "Yalnız quraşdırılmış tətbiqdə seçilə bilər"}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400"
              />
            )}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <div className="text-sm font-bold text-gray-600 mb-1">TƏHLÜKƏSİZLİK</div>
        <div className="text-xs text-gray-400 mb-4">Admin panelinə keçərkən (Kassa → Admin düyməsi) bu şifrə tələb olunur.</div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Admin şifrəsi"
            value={draft.adminSifre}
            onChange={(e) => setDraft({ ...draft, adminSifre: e.target.value })}
          />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <div className="text-sm font-bold text-gray-600 mb-1">TƏRƏZİ</div>
        <div className="text-xs text-gray-400 mb-4">Barkod çap edən tərəzinin barkod prefiksi. Etiketi skan edib nəticə səhv çıxsa, bu rəqəmi tərəzinin real formatına uyğun dəyişin.</div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Tərəzi barkod prefiksi" value={draft.tereziPrefiks} onChange={(e) => setDraft({ ...draft, tereziPrefiks: e.target.value })} />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <div className="text-sm font-bold text-gray-600 mb-1">ÇEK DİZAYNI</div>
        <div className="text-xs text-gray-400 mb-4">
          Mağaza adı, ünvan, telefon və VÖEN yuxarıdakı "Mağaza parametrləri" bölməsindən çekə avtomatik yazılır. Bura yalnız əlavə yazılar üçündür.
        </div>
        <div className="space-y-4">
          <FormField
            label="Başlıq altında əlavə qeyd (məcburi deyil)"
            placeholder="məs. Filial 2 — Yasamal"
            value={draft.cekBasliqQeydi}
            onChange={(e) => setDraft({ ...draft, cekBasliqQeydi: e.target.value })}
          />
          <div>
            <div className="text-xs text-gray-500 mb-1">Çekin sonundakı mesaj (hər sətir ayrı sətirdə çap olunur)</div>
            <textarea
              value={draft.cekTesekkurMesaji}
              onChange={(e) => setDraft({ ...draft, cekTesekkurMesaji: e.target.value })}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400 font-mono"
            />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-gray-600">AVTOMATİK ÇEK</div>
          <div className="text-xs text-gray-400 mt-1">Satış tamamlandıqda çek avtomatik çap olunur.</div>
        </div>
        <Toggle on={draft.avtomatikCek} onClick={() => setDraft({ ...draft, avtomatikCek: !draft.avtomatikCek })} />
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-gray-600">ENDİRİM SİSTEMİ</div>
          <div className="text-xs text-gray-400 mt-1">Barkod oxunan kimi kampaniya qiyməti tətbiq olunur.</div>
        </div>
        <Toggle on={draft.endirimSistemi} onClick={() => setDraft({ ...draft, endirimSistemi: !draft.endirimSistemi })} />
      </div>
      <div className="flex items-center gap-3">
        <button onClick={save} className="bg-[#16a34a] text-white rounded-xl px-6 py-3 text-sm font-semibold">YADDA SAXLA</button>
        {saved && <span className="text-green-600 text-sm font-semibold">✓ Yadda saxlanıldı</span>}
      </div>
    </div>
  );
}

const PAGES = {
  icmal: IcmalPage,
  mehsullar: MehsullarPage,
  stok: StokPage,
  satislar: SatislarPage,
  hesabatlar: HesabatlarPage,
  isciler: IscilerPage,
  techizatcilar: TechizatcilarPage,
  terezi: TereziPage,
  backup: BackupPage,
  parametrler: ParametrlerPage,
};

function AdminView({ onResetRole }) {
  const [active, setActive] = useState("icmal");
  const [ip, setIp] = useState(null);
  const [netToken, setNetToken] = useState(null);
  const Page = PAGES[active];

  React.useEffect(() => {
    fetch("http://127.0.0.1:4000/api/network-info")
      .then((r) => r.json())
      .then((d) => {
        setIp(d.ip || null);
        setNetToken(d.token || null);
      })
      .catch(() => {
        setIp(null);
        setNetToken(null);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#f4f6f5] flex font-sans text-[#1a2b22]">
      <div className="w-60 bg-[#15803d] text-white flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-white/10 flex justify-center">
          <Logo size="sm" />
        </div>
        <div className="flex-1 py-4 space-y-1 px-3">
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                active === key ? "bg-[#16a34a]/25 text-white" : "text-white/45 hover:text-white/75"
              }`}
            >
              <Icon size={16} />
              {label}
              {active === key && <ChevronRight size={14} className="ml-auto text-[#f97316]" />}
            </button>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-white/10">
          <div className="text-[10px] text-white/40 mb-1">KASSA ÜÇÜN IP ÜNVAN</div>
          <div className="font-mono text-sm font-bold text-[#4ade80]">{ip || "tapılmadı"}</div>
          <div className="text-[10px] text-white/40 mt-2 mb-1">KASSA ÜÇÜN TOKEN</div>
          <div className="font-mono text-sm font-bold text-[#fbbf24] tracking-widest">{netToken || "—"}</div>
        </div>
      </div>
      <div className="flex-1 p-6 overflow-auto">
        <Page onNavigate={setActive} onResetRole={onResetRole} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* ROOT APP with a small dev switcher between Kassa / Admin           */
/* ---------------------------------------------------------------- */

// Deliberately NOT `fixed` — a fixed banner would float on top of the
// document flow and silently block clicks on whatever happens to sit at the
// same coordinates (e.g. the Kassa/Admin toggle). `sticky` reserves its own
// space (pushing everything else down) while still staying visible on scroll.
function ConnectionBanner({ connected, pendingCount, pendingStockCount }) {
  const totalPending = pendingCount + pendingStockCount;
  if (connected && !totalPending) return null;
  if (!connected) {
    return (
      <div className="bg-red-600 text-white text-sm font-semibold text-center py-2 px-4 sticky top-0 z-[100]">
        ⚠ Serverlə əlaqə yoxdur — Admin kompüteri açıq və eyni şəbəkədə olduğundan əmin olun.
        {totalPending > 0 &&
          ` Lokal saxlanılır: ${pendingCount} satış, ${pendingStockCount} stok dəyişikliyi — əlaqə bərpa olunanda avtomatik göndəriləcək.`}
      </div>
    );
  }
  // Connected again but still flushing the queue from while we were offline.
  return (
    <div className="bg-amber-500 text-white text-sm font-semibold text-center py-2 px-4 sticky top-0 z-[100]">
      ⏳ {totalPending} gözləyən qeyd serverə göndərilir...
    </div>
  );
}

function MainApp({ role, serverUrl, token, onResetRole }) {
  const [app, setApp] = useState("kassa");
  return (
    <MarketProvider serverUrl={serverUrl} token={token}>
      <Inner role={role} app={app} setApp={setApp} onResetRole={onResetRole} />
    </MarketProvider>
  );
}

function Inner({ role, app, setApp, onResetRole }) {
  const { connected, settings, pendingCount, pendingStockCount, setAdminPw } = useMarket();
  const [pwOpen, setPwOpen] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const requestAdmin = () => {
    if (unlocked) {
      setApp("admin");
      return;
    }
    setPwInput("");
    setPwError(false);
    setPwOpen(true);
  };

  const submitPw = () => {
    if (settings.adminSifre && pwInput === settings.adminSifre) {
      setUnlocked(true);
      setAdminPw(pwInput);
      setPwOpen(false);
      setApp("admin");
    } else {
      setPwError(true);
    }
  };

  return (
    <div>
      <ConnectionBanner connected={connected} pendingCount={pendingCount} pendingStockCount={pendingStockCount} />
      {role === "admin" && (
        <div
          className="fixed right-3 z-[60] bg-white shadow-lg rounded-full p-1 flex gap-1 border border-gray-200 transition-[top]"
          style={{ top: connected && !pendingCount && !pendingStockCount ? "12px" : "48px" }}
        >
          <button
            onClick={() => setApp("kassa")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold ${app === "kassa" ? "bg-[#16a34a] text-white" : "text-gray-500"}`}
          >
            Kassa
          </button>
          <button
            onClick={requestAdmin}
            className={`px-4 py-1.5 rounded-full text-xs font-bold ${app === "admin" ? "bg-[#16a34a] text-white" : "text-gray-500"}`}
          >
            Admin
          </button>
        </div>
      )}
      {pwOpen && (
        <Modal title="Admin panelinə giriş" onClose={() => setPwOpen(false)} widthClass="max-w-sm">
          <div className="space-y-4">
            <div className="text-sm text-gray-500">Admin panelinə keçmək üçün şifrəni daxil edin.</div>
            <FormField
              label="Şifrə"
              type="password"
              value={pwInput}
              onChange={(e) => {
                setPwInput(e.target.value);
                setPwError(false);
              }}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && submitPw()}
            />
            {pwError && <div className="text-red-500 text-xs font-semibold">Şifrə yanlışdır.</div>}
            <div className="flex gap-2">
              <button onClick={() => setPwOpen(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 font-semibold text-gray-500 text-sm">
                Ləğv et
              </button>
              <button onClick={submitPw} className="flex-[2] bg-[#16a34a] hover:bg-[#15803d] text-white rounded-xl py-2.5 font-bold text-sm">
                Daxil ol
              </button>
            </div>
          </div>
        </Modal>
      )}
      {role === "admin" ? (app === "kassa" ? <KassaView role={role} /> : <AdminView onResetRole={onResetRole} />) : <KassaView role={role} />}
    </div>
  );
}

export default function App() {
  const { role, serverUrl, token, setRole, reset } = useDeviceRole();
  if (!role) {
    return <RoleSetup onDone={(r, url, tok) => setRole(r, url, tok)} />;
  }
  return <MainApp role={role} serverUrl={serverUrl} token={token} onResetRole={reset} />;
}