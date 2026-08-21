import React, { useState, useMemo, useContext, createContext } from "react";
import {
  ShoppingCart, ShoppingBasket, ScanBarcode, User, LogOut, Clock, Trash2, Plus, Minus,
  Receipt, History, XCircle, Banknote, CreditCard, Check,
  LayoutGrid, Package, Boxes, LineChart, FileBarChart2, Users, Truck,
  Settings, ChevronRight, Search, TrendingUp, AlertTriangle, Wallet, X, Download, Upload,
} from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip } from "recharts";

/* ---------------------------------------------------------------- */
/* Shared mock data                                                  */
/* ---------------------------------------------------------------- */

const TODAY_STR = "21.08.2026";

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
  magazaAdi: "ZƏHRƏ MARKET",
  voen: "1234567891",
  telefon: "012 123 45 67",
  unvan: "Bakı şəhəri, Nəsimi r-nu",
  valyuta: "AZN",
  printer: "Printer 01 — Aktiv",
  avtomatikCek: true,
  endirimSistemi: true,
  tereziPrefiks: "22",
  adminSifre: "2580",
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

const mehsulStatus = (p) => {
  if (p.endirim > 0) return "Endirim";
  if (p.stok <= 0) return "Bitib";
  if (p.stok < p.minimum) return "Azalır";
  return "Normal";
};

const stokVeziyyet = (p) => {
  if (p.stok <= 0) return "Təcili";
  if (p.stok < p.minimum) return "Sifariş ver";
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

const emptyState = { products: [], sales: [], employees: [], suppliers: [], settings: INITIAL_SETTINGS };

function MarketProvider({ children, serverUrl, token = "" }) {
  const [state, setState] = useState(emptyState);
  const [connected, setConnected] = useState(true);
  const [loading, setLoading] = useState(true);

  const authHeaders = () => (token ? { "x-api-token": token } : {});

  const refresh = async () => {
    try {
      const res = await fetch(`${serverUrl}/api/state`, { headers: authHeaders() });
      if (!res.ok) throw new Error("bad response");
      const data = await res.json();
      setState(data);
      setConnected(true);
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
      setConnected(true);
      return true;
    } catch (err) {
      setConnected(false);
      return false;
    }
  };

  const addProduct = (p) => call("POST", "/api/products", p);
  const updateProduct = (kod, patch) => call("PUT", `/api/products/${encodeURIComponent(kod)}`, patch);
  const deleteProduct = (kod) => call("DELETE", `/api/products/${encodeURIComponent(kod)}`);
  const adjustStock = (kod, newStok) => updateProduct(kod, { stok: newStok });
  const addSupplier = (s) => call("POST", "/api/suppliers", s);
  const addEmployee = (e) => call("POST", "/api/employees", e);
  const deleteEmployee = (ad) => call("DELETE", `/api/employees/${encodeURIComponent(ad)}`);
  const addSale = (sale) => call("POST", "/api/sales", sale);
  const setSettings = (s) => call("PUT", "/api/settings", s);
  const restoreBackup = (data) => call("POST", "/api/restore", data);
  const importProducts = (list) => call("POST", "/api/products/import", { products: list });
  const resetSales = () => call("POST", "/api/sales/reset");

  const value = {
    ...state,
    connected, loading,
    addProduct, updateProduct, deleteProduct, adjustStock,
    addSupplier, addEmployee, deleteEmployee, addSale, setSettings, restoreBackup,
    importProducts, resetSales,
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
    () => localStorage.getItem("zehra_server_url") || "http://localhost:4000"
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
      const res = await fetch("http://localhost:4000/api/network-info");
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
              onClick={() => onDone("admin", "http://localhost:4000", adminToken)}
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

function KassaView() {
  const { products, sales, addSale, settings } = useMarket();
  const [cart, setCart] = useState([]);
  const [query, setQuery] = useState("");
  const [discountPct, setDiscountPct] = useState("0");
  const [payOpen, setPayOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [method, setMethod] = useState("nagd");
  const [received, setReceived] = useState("0.00");
  const [lastSale, setLastSale] = useState(null);
  const [viewSale, setViewSale] = useState(null);
  const [scanMsg, setScanMsg] = useState(null);

  const lineTotal = (item) => item.qiymet * item.miqdar * (1 - item.endirim / 100);
  const subtotal = useMemo(() => cart.reduce((s, i) => s + lineTotal(i), 0), [cart]);
  const discountAmt = subtotal * ((parseFloat(discountPct) || 0) / 100);
  const total = Math.max(0, subtotal - discountAmt);
  const unitCount = cart.reduce((s, i) => s + i.miqdar, 0);
  const change = Math.max(0, (parseFloat(received) || 0) - total);
  const insufficientCash = method === "nagd" && (parseFloat(received) || 0) < total;

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return products.filter((p) => p.ad.toLowerCase().includes(q) || p.kod.includes(q)).slice(0, 12);
  }, [query, products]);

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
        },
      ];
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
    const sale = {
      no: generateSaleNo(sales),
      tarix: `${TODAY_STR} 14:35`,
      kassir: "Kassir 01",
      say: cart.length,
      meblegh: total,
      odenish: method === "nagd" ? "NƏĞD" : "KART",
      status: "Tamamlandı",
      items: cart,
      received: method === "nagd" ? parseFloat(received) || total : total,
      change: method === "nagd" ? change : 0,
      method,
    };
    addSale(sale);
    setLastSale(sale);
    setViewSale(sale);
    setPayOpen(false);
    setReceiptOpen(true);
    setCart([]);
    setDiscountPct("0");
  };

  const openPayment = (m) => {
    if (cart.length === 0) return;
    setMethod(m);
    setReceived(total.toFixed(2));
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

      <div className="p-6 grid grid-cols-[1fr_360px] gap-5" style={{ minHeight: "calc(100vh - 68px)" }}>
        {/* Left: product search / browse area */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          {query.trim() && matches.length > 0 ? (
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
          ) : (
            <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-center">
              <ShoppingCart size={72} className="text-gray-200 mb-4" strokeWidth={1.2} />
              <div className="text-gray-400 text-sm leading-relaxed">
                Məhsul axtarmaq üçün yuxarıdakı axtarışdan istifadə edin<br />
                və ya barkod oxudun
              </div>
            </div>
          )}
        </div>

        {/* Right: cart / Səbət */}
        <div className="bg-white rounded-2xl border border-gray-200 flex flex-col">
          <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
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

          <div className="flex-1 overflow-auto px-5 py-3 space-y-1">
            {cart.length === 0 && (
              <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center">
                <ShoppingCart size={48} className="text-gray-200 mb-3" strokeWidth={1.2} />
                <div className="text-gray-400 text-sm">Səbət boşdur</div>
              </div>
            )}
            {cart.map((item) => (
              <div key={item.kod} className="flex items-center justify-between gap-2 py-2.5 border-b border-gray-50 last:border-0">
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
                    className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                  >
                    <Minus size={11} />
                  </button>
                  <span className="w-12 text-center text-xs font-semibold">
                    {item.novu === "çəki" ? `${item.miqdar.toFixed(3)}kq` : item.miqdar}
                  </span>
                  <button
                    onClick={() => changeQty(item.kod, 1)}
                    className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                  >
                    <Plus size={11} />
                  </button>
                </div>
                <div className="w-16 text-right text-sm font-bold text-[#16a34a] shrink-0">{fmt(lineTotal(item))}</div>
                <button onClick={() => requestRemoveItem(item.kod)} className="text-gray-300 hover:text-red-500 shrink-0">
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>

          <div className="px-5 py-4 border-t border-gray-100 space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Ara məbləğ</span>
              <span className="font-semibold">{fmt(subtotal)} AZN</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Endirim</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <input
                    value={discountPct}
                    onChange={(e) => setDiscountPct(e.target.value)}
                    className="w-14 text-right text-sm px-2 py-1 outline-none"
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
      </div>

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
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMethod("nagd")}
                  className={`rounded-xl border-2 py-4 flex flex-col items-center gap-2 ${
                    method === "nagd" ? "border-green-500 bg-green-50" : "border-gray-200"
                  }`}
                >
                  <Banknote size={26} className="text-green-600" />
                  <span className="font-bold text-green-700 text-sm">NƏĞD</span>
                  <span className="text-[10px] text-gray-400">(F8)</span>
                </button>
                <button
                  onClick={() => setMethod("kart")}
                  className={`rounded-xl border-2 py-4 flex flex-col items-center gap-2 ${
                    method === "kart" ? "border-blue-500 bg-blue-50" : "border-gray-200"
                  }`}
                >
                  <CreditCard size={26} className="text-blue-600" />
                  <span className="font-bold text-blue-700 text-sm">KART</span>
                  <span className="text-[10px] text-gray-400">(F9)</span>
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
              <div className="flex gap-2">
                <button
                  onClick={() => setPayOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 font-semibold text-gray-500"
                >
                  Ləğv et
                </button>
                <button
                  onClick={confirmSale}
                  disabled={insufficientCash}
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
          <div className="space-y-2 -mx-1">
            {sales.map((s) => (
              <button
                key={s.no}
                onClick={() => openFromHistory(s)}
                className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-gray-50 border border-gray-100 text-left"
              >
                <div>
                  <div className="font-semibold text-sm">{s.no}</div>
                  <div className="text-xs text-gray-400">{s.tarix} · {s.kassir}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm">{fmt(s.meblegh)} AZN</div>
                  <div className="text-xs text-gray-400">{s.odenish}</div>
                </div>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* Receipt modal */}
      {receiptOpen && viewSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xs p-6 font-mono text-xs">
            <div className="text-center mb-3">
              <div className="font-black text-sm">
                <span className="text-[#16a34a]">ZƏHRƏ</span> <span className="text-[#ea580c]">MARKET</span>
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
              <span>ÇEK №: {viewSale.no}</span>
              <span>{viewSale.tarix}</span>
            </div>
            <div className="text-[11px] mb-2">Kassir: {viewSale.kassir}</div>
            <div className="border-t border-dashed border-gray-300 my-2" />
            {viewSale.items.map((it, idx) => (
              <div key={it.kod + idx} className="flex justify-between text-[11px] mb-1">
                <span className="truncate mr-2">{it.ad}</span>
                <span>{fmt(it.qiymet * it.miqdar * (1 - it.endirim / 100))}</span>
              </div>
            ))}
            <div className="border-t border-dashed border-gray-300 my-2" />
            <div className="flex justify-between font-bold text-sm">
              <span>YEKUN:</span>
              <span>{fmt(viewSale.meblegh)} AZN</span>
            </div>
            <div className="mt-2 text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span>ÖDƏNİŞ NÖVÜ:</span>
                <span>{viewSale.odenish}</span>
              </div>
              {viewSale.odenish === "NƏĞD" && viewSale.received != null && (
                <>
                  <div className="flex justify-between">
                    <span>ALINAN MƏBLƏĞ:</span>
                    <span>{fmt(viewSale.received)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GERİ QAYTARILAN:</span>
                    <span>{fmt(viewSale.change)}</span>
                  </div>
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
            <button
              onClick={() => setReceiptOpen(false)}
              className="w-full mt-4 bg-[#16a34a] text-white rounded-lg py-2 font-sans font-semibold"
            >
              Bağla
            </button>
          </div>
        </div>
      )}
    </div>
  );
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
  { key: "backup", label: "Ehtiyat nüsxə", icon: Download },
  { key: "parametrler", label: "Parametrlər", icon: Settings },
];

function StatCard({ label, value, sub, icon: Icon, tone = "green" }) {
  const tones = {
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-500",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
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
  const { sales, products } = useMarket();
  const bugunSales = sales.filter((s) => s.tarix && s.tarix.startsWith(TODAY_STR));
  const bugunMeblegh = bugunSales.reduce((sum, s) => sum + (s.meblegh || 0), 0);
  const stokDeyeri = products.reduce((sum, p) => sum + p.stok * p.alish, 0);
  const azalanStok = products.filter((p) => p.stok > 0 && p.stok < p.minimum).length;

  const quickActions = [
    { label: "Məhsul əlavə et", target: "mehsullar" },
    { label: "Stok artır", target: "stok" },
    { label: "Endirim yarat", target: "mehsullar" },
    { label: "Hesabat aç", target: "hesabatlar" },
  ];
  return (
    <div>
      <PageHeader title="İcmal" />
      <div className="grid grid-cols-4 gap-4 mb-5">
        <StatCard label="Bu gün satış" value={`${fmt(bugunMeblegh)} AZN`} sub={`${bugunSales.length} satış`} icon={TrendingUp} tone="green" />
        <StatCard label="Satış sayı" value={String(sales.length)} sub="Ümumi (bütün tarix)" icon={Receipt} tone="blue" />
        <StatCard label="Stok dəyəri" value={`${fmt(stokDeyeri)} AZN`} sub="Anbar üzrə" icon={Boxes} tone="amber" />
        <StatCard label="Azalan stok" value={`${azalanStok} məhsul`} sub="Diqqət tələb edir" icon={AlertTriangle} tone="red" />
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-4 mb-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="text-sm font-bold text-gray-600 mb-3">SATIŞLAR — SON 7 GÜN</div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CHART_DATA}>
                <XAxis dataKey="gun" axisLine={false} tickLine={false} fontSize={12} />
                <Tooltip formatter={(v) => `${fmt(v)} AZN`} />
                <Bar dataKey="satish" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="text-sm font-bold text-gray-600 mb-3">SÜRƏTLİ ƏMƏLİYYATLAR</div>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((t) => (
              <button
                key={t.label}
                onClick={() => onNavigate && onNavigate(t.target)}
                className="border border-gray-200 rounded-xl py-4 text-sm font-semibold text-gray-600 hover:border-green-400 hover:text-green-600"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 font-bold text-sm text-gray-600 border-b border-gray-100">SON SATIŞLAR</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 text-xs">
              <th className="py-2 px-5">Çek</th><th className="py-2 px-5">Kassir</th><th className="py-2 px-5">Məbləğ</th>
              <th className="py-2 px-5">Ödəniş</th><th className="py-2 px-5">Vaxt</th><th className="py-2 px-5">Status</th>
            </tr>
          </thead>
          <tbody>
            {sales.slice(0, 3).map((s) => (
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

const emptyProductForm = { kod: "", ad: "", kat: "", alish: "", satish: "", endirim: "0", stok: "", minimum: "10", novu: "eded", tereziKodu: "" };

function MehsullarPage() {
  const { products, addProduct, updateProduct, deleteProduct, importProducts } = useMarket();
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProductForm);
  const [importMsg, setImportMsg] = useState(null);
  const fileInputRef = React.useRef(null);

  const filtered = products.filter(
    (p) => p.ad.toLowerCase().includes(q.toLowerCase()) || p.kod.includes(q)
  );

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
      novu: p.novu || "eded", tereziKodu: p.tereziKodu || "",
    });
    setModalOpen(true);
  };

  const save = () => {
    if (!form.kod.trim() || !form.ad.trim()) return;
    const payload = {
      kod: form.kod.trim(),
      ad: form.ad.trim(),
      kat: form.kat.trim() || "Digər",
      alish: parseFloat(form.alish) || 0,
      satish: parseFloat(form.satish) || 0,
      endirim: parseFloat(form.endirim) || 0,
      stok: parseInt(form.stok, 10) || 0,
      minimum: parseInt(form.minimum, 10) || 0,
      novu: form.novu === "çəki" ? "çəki" : "eded",
      tereziKodu: form.tereziKodu.trim(),
    };
    if (editing) updateProduct(editing.kod, payload);
    else addProduct(payload);
    setModalOpen(false);
  };

  const remove = (p) => {
    if (window.confirm(`"${p.ad}" silinsin?`)) deleteProduct(p.kod);
  };

  const downloadTemplate = () => {
    const header = "Barkod,Ad,Kateqoriya,AlisQiymeti,SatisQiymeti,Endirim,Stok,Minimum,Novu,TereziKodu\n";
    const example = "5449000000996,Coca Cola 1L,İçkilər,1.20,1.60,0,84,20,eded,\n";
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

  const pickImportFile = () => fileInputRef.current && fileInputRef.current.click();

  const onImportFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const rows = parseCSV(String(reader.result));
        if (rows.length < 2) {
          setImportMsg({ text: "Fayl boşdur və ya format səhvdir.", isError: true });
          return;
        }
        const header = rows[0].map((h) => h.trim().toLowerCase());
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
        const iTerezi = findCol(["tereziKodu".toLowerCase(), "tərəzikodu"]);

        const list = [];
        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.every((c) => !c || !c.trim())) continue;
          const kod = (iKod >= 0 ? row[iKod] : "").trim();
          const ad = (iAd >= 0 ? row[iAd] : "").trim();
          if (!kod || !ad) continue;
          list.push({
            kod,
            ad,
            kat: (iKat >= 0 ? row[iKat] : "").trim() || "Digər",
            alish: parseFloat((iAlis >= 0 ? row[iAlis] : "0").replace(",", ".")) || 0,
            satish: parseFloat((iSatis >= 0 ? row[iSatis] : "0").replace(",", ".")) || 0,
            endirim: parseFloat(iEndirim >= 0 ? row[iEndirim] : "0") || 0,
            stok: parseInt(iStok >= 0 ? row[iStok] : "0", 10) || 0,
            minimum: parseInt(iMin >= 0 ? row[iMin] : "10", 10) || 10,
            novu: iNovu >= 0 && (row[iNovu] || "").trim() === "çəki" ? "çəki" : "eded",
            tereziKodu: (iTerezi >= 0 ? row[iTerezi] : "").trim(),
          });
        }
        if (list.length === 0) {
          setImportMsg({ text: "Uyğun sətir tapılmadı — sütun adlarını nümunə fayl ilə müqayisə edin.", isError: true });
          return;
        }
        const ok = await importProducts(list);
        setImportMsg({
          text: ok ? `${list.length} məhsul idxal olundu (mövcud barkodlar yeniləndi).` : "İdxal alınmadı — server ilə əlaqəni yoxlayın.",
          isError: !ok,
        });
      } catch (err) {
        setImportMsg({ text: "Fayl oxuna bilmədi — CSV formatını yoxlayın.", isError: true });
      } finally {
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
            onChange={(e) => setQ(e.target.value)}
            placeholder="Məhsul adı və ya barkod..."
            className="w-full text-sm outline-none"
          />
        </div>
        <button onClick={downloadTemplate} className="border border-gray-200 text-gray-600 hover:border-gray-300 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap">
          Nümunə CSV
        </button>
        <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={onImportFile} className="hidden" />
        <button onClick={pickImportFile} className="border border-[#16a34a] text-[#16a34a] hover:bg-green-50 rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 whitespace-nowrap">
          <Upload size={16} /> CSV İDXAL ET
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
            {filtered.map((p) => (
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
      </div>

      {modalOpen && (
        <Modal title={editing ? "Məhsulu düzəlt" : "Yeni məhsul əlavə et"} onClose={() => setModalOpen(false)}>
          <div className="space-y-3">
            <FormField label="Barkod" value={form.kod} onChange={(e) => setForm({ ...form, kod: e.target.value })} />
            <FormField label="Məhsul adı" value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} />
            <FormField label="Kateqoriya" value={form.kat} onChange={(e) => setForm({ ...form, kat: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Alış qiyməti (AZN)" type="number" value={form.alish} onChange={(e) => setForm({ ...form, alish: e.target.value })} />
              <FormField label="Satış qiyməti (AZN)" type="number" value={form.satish} onChange={(e) => setForm({ ...form, satish: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Endirim (%)" type="number" value={form.endirim} onChange={(e) => setForm({ ...form, endirim: e.target.value })} />
              <FormField label="Stok miqdarı" type="number" value={form.stok} onChange={(e) => setForm({ ...form, stok: e.target.value })} />
              <FormField label="Minimum stok" type="number" value={form.minimum} onChange={(e) => setForm({ ...form, minimum: e.target.value })} />
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
              {form.novu === "çəki" && (
                <div className="pt-3">
                  <FormField
                    label="Tərəzi kodu (5 rəqəm)"
                    value={form.tereziKodu}
                    onChange={(e) => setForm({ ...form, tereziKodu: e.target.value })}
                    placeholder="00010"
                  />
                </div>
              )}
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

function StokPage() {
  const { products, adjustStock } = useMarket();
  const [adjusting, setAdjusting] = useState(null);
  const [newStok, setNewStok] = useState("");

  const totalUnits = products.reduce((s, p) => s + p.stok, 0);
  const lowStock = products.filter((p) => p.stok > 0 && p.stok < p.minimum).length;
  const outStock = products.filter((p) => p.stok <= 0).length;
  const stockValue = products.reduce((s, p) => s + p.stok * p.alish, 0);

  const openAdjust = (p) => {
    setAdjusting(p);
    setNewStok(String(p.stok));
  };
  const save = () => {
    adjustStock(adjusting.kod, Math.max(0, parseInt(newStok, 10) || 0));
    setAdjusting(null);
  };

  return (
    <div>
      <PageHeader title="Stok" />
      <div className="grid grid-cols-4 gap-4 mb-5">
        <StatCard label="Ümumi stok" value={totalUnits.toLocaleString("az-AZ")} sub="ədəd" icon={Boxes} tone="green" />
        <StatCard label="Azalan stok" value={String(lowStock)} sub="məhsul" icon={AlertTriangle} tone="amber" />
        <StatCard label="Bitən stok" value={String(outStock)} sub="məhsul" icon={XCircle} tone="red" />
        <StatCard label="Stok dəyəri" value={`${fmt(stockValue)} AZN`} sub="alış qiyməti ilə" icon={Wallet} tone="blue" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 font-bold text-sm text-gray-600 border-b border-gray-100">STOK NƏZARƏTİ</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 text-xs">
              <th className="py-2 px-5">Məhsul</th><th className="py-2 px-5">Mövcud</th><th className="py-2 px-5">Minimum</th>
              <th className="py-2 px-5">Fərq</th><th className="py-2 px-5">Vəziyyət</th><th className="py-2 px-5"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const ferq = p.stok - p.minimum;
              return (
                <tr key={p.kod} className="border-t border-gray-100">
                  <td className="py-3 px-5 font-medium">{p.ad}</td>
                  <td className="py-3 px-5">{p.stok}</td>
                  <td className="py-3 px-5">{p.minimum}</td>
                  <td className={`py-3 px-5 font-semibold ${ferq < 0 ? "text-red-500" : "text-green-600"}`}>
                    {ferq > 0 ? "+" : ""}{ferq}
                  </td>
                  <td className="py-3 px-5"><StatusPill status={stokVeziyyet(p)} /></td>
                  <td className="py-3 px-5">
                    <button onClick={() => openAdjust(p)} className="text-blue-600 text-xs font-semibold">STOKU DƏYİŞ</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {adjusting && (
        <Modal title={`Stoku dəyiş — ${adjusting.ad}`} onClose={() => setAdjusting(null)}>
          <div className="space-y-4">
            <FormField label="Yeni stok miqdarı" type="number" value={newStok} onChange={(e) => setNewStok(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={() => setAdjusting(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 font-semibold text-gray-500 text-sm">
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

function SatislarPage() {
  const { sales } = useMarket();
  return (
    <div>
      <PageHeader title="Satışlar" />
      <div className="flex items-center gap-2 mb-4">
        {["BUGÜN", "KASSİR 01", "ÖDƏNİŞ: HAMISI"].map((f) => (
          <span key={f} className="bg-white border border-gray-200 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-500">
            {f}
          </span>
        ))}
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
            {sales.map((s) => (
              <tr key={s.no} className="border-t border-gray-100">
                <td className="py-3 px-4 font-medium">{s.no}</td>
                <td className="py-3 px-4 text-gray-500">{s.tarix}</td>
                <td className="py-3 px-4">{s.kassir}</td>
                <td className="py-3 px-4">{s.say}</td>
                <td className="py-3 px-4 font-semibold">{fmt(s.meblegh)} AZN</td>
                <td className="py-3 px-4">{s.odenish}</td>
                <td className="py-3 px-4"><StatusPill status={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

  const bugunSales = sales.filter((s) => s.tarix && s.tarix.startsWith(TODAY_STR));
  const dovriyye = bugunSales.reduce((sum, s) => sum + (s.meblegh || 0), 0);
  const neghd = bugunSales.filter((s) => s.odenish === "NƏĞD").reduce((sum, s) => sum + (s.meblegh || 0), 0);
  const kart = bugunSales.filter((s) => s.odenish === "KART").reduce((sum, s) => sum + (s.meblegh || 0), 0);
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
          <div className="text-xs text-gray-400 mt-1">{TODAY_STR}</div>
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
      <div id="zehra-print-area" className="hidden print:block p-8 font-sans text-black">
        <div className="text-center mb-6">
          <div className="font-black text-2xl">{settings.magazaAdi || "ZƏHRƏ MARKET"}</div>
          <div className="text-sm text-gray-600 mt-1">{settings.unvan}</div>
          <div className="text-sm text-gray-600">VÖEN: {settings.voen} · Tel: {settings.telefon}</div>
          <div className="text-lg font-bold mt-3">Günlük Hesabat — {TODAY_STR}</div>
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

        <div className="text-center text-xs text-gray-500 mt-8">Hesabat yaradılma vaxtı: {TODAY_STR}</div>
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

const emptySupplierForm = { ad: "", tel: "", meblegh: "" };

function TechizatcilarPage() {
  const { suppliers, addSupplier } = useMarket();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptySupplierForm);

  const openAdd = () => {
    setForm(emptySupplierForm);
    setModalOpen(true);
  };

  const save = () => {
    if (!form.ad.trim()) return;
    addSupplier({
      ad: form.ad.trim(),
      tel: form.tel.trim(),
      sonAlish: TODAY_STR,
      meblegh: parseFloat(form.meblegh) || 0,
      borc: 0,
      status: "Aktiv",
    });
    setModalOpen(false);
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
              <th className="py-3 px-4">Məbləğ</th><th className="py-3 px-4">Borc</th><th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.ad} className="border-t border-gray-100">
                <td className="py-3 px-4 font-medium">{s.ad}</td>
                <td className="py-3 px-4 text-gray-500">{s.tel}</td>
                <td className="py-3 px-4">{s.sonAlish}</td>
                <td className="py-3 px-4 font-semibold">{fmt(s.meblegh)} AZN</td>
                <td className={`py-3 px-4 font-semibold ${s.borc > 0 ? "text-red-500" : "text-gray-400"}`}>{fmt(s.borc)} AZN</td>
                <td className="py-3 px-4"><StatusPill status={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <Modal title="Yeni təchizatçı əlavə et" onClose={() => setModalOpen(false)}>
          <div className="space-y-3">
            <FormField label="Təchizatçı adı" value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} />
            <FormField label="Əlaqə nömrəsi" value={form.tel} onChange={(e) => setForm({ ...form, tel: e.target.value })} />
            <FormField label="Son alış məbləği (AZN)" type="number" value={form.meblegh} onChange={(e) => setForm({ ...form, meblegh: e.target.value })} />
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

function BackupPage() {
  const { products, sales, employees, suppliers, settings, restoreBackup } = useMarket();
  const [restoring, setRestoring] = useState(false);
  const [msg, setMsg] = useState(null);
  const fileInputRef = React.useRef(null);

  const download = () => {
    const payload = { products, sales, employees, suppliers, settings, yaradilmaTarixi: new Date().toISOString() };
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
  const role = localStorage.getItem("zehra_role") || "admin";
  const serverUrl = localStorage.getItem("zehra_server_url") || "http://localhost:4000";

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
          <FormField label="Çek printeri" value={draft.printer} onChange={(e) => setDraft({ ...draft, printer: e.target.value })} />
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
  backup: BackupPage,
  parametrler: ParametrlerPage,
};

function AdminView({ onResetRole }) {
  const [active, setActive] = useState("icmal");
  const [ip, setIp] = useState(null);
  const [netToken, setNetToken] = useState(null);
  const Page = PAGES[active];

  React.useEffect(() => {
    fetch("http://localhost:4000/api/network-info")
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

function ConnectionBanner({ connected }) {
  if (connected) return null;
  return (
    <div className="bg-red-600 text-white text-sm font-semibold text-center py-2 px-4 fixed top-0 left-0 right-0 z-[100]">
      ⚠ Serverlə əlaqə yoxdur — Admin kompüteri açıq və eyni şəbəkədə olduğundan əmin olun. Yeni dəyişikliklər yadda saxlanmaya bilər.
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
  const { connected, settings } = useMarket();
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
    if (pwInput === (settings.adminSifre || "2580")) {
      setUnlocked(true);
      setPwOpen(false);
      setApp("admin");
    } else {
      setPwError(true);
    }
  };

  return (
    <div>
      <ConnectionBanner connected={connected} />
      {role === "admin" && (
        <div className="fixed top-3 right-3 z-[60] bg-white shadow-lg rounded-full p-1 flex gap-1 border border-gray-200">
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
      {role === "admin" ? (app === "kassa" ? <KassaView /> : <AdminView onResetRole={onResetRole} />) : <KassaView />}
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