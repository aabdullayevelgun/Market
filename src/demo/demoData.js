// Demo-only dataset for the offline "show it to a shop" build (VITE_DEMO=1).
// Everything here is invented: no real store's products, prices, staff or
// sales. Dates are generated relative to "now" so the dashboard always shows
// today's numbers, this week's chart, etc., whenever the demo is opened.

export const demoDateKey = () => fmtDate(new Date());

export const DEMO_PASSWORD = "123123";

const pad2 = (n) => String(n).padStart(2, "0");
const fmtDate = (d) => `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
const fmtDateTime = (d) => `${fmtDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const round3 = (n) => Math.round((n + Number.EPSILON) * 1000) / 1000;

// Small deterministic PRNG so every fresh install shows the same demo story.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Valid EAN-13 (check digit computed), 476 = Azerbaijan GS1 prefix.
function ean13(body12) {
  const digits = body12.split("").map(Number);
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  return body12 + ((10 - (sum % 10)) % 10);
}

// [ad, kat, alış, satış, endirim%, stok, minimum]
const EDED = [
  ["Kola 1L", "İçkilər", 1.2, 1.6, 0, 84, 20],
  ["Kola 0.5L", "İçkilər", 0.75, 1.0, 0, 120, 30],
  ["Portağal şirəsi 1L", "İçkilər", 1.9, 2.6, 0, 36, 12],
  ["Alma şirəsi 1L", "İçkilər", 1.8, 2.5, 10, 28, 12],
  ["Mineral su 0.5L", "İçkilər", 0.3, 0.5, 0, 210, 50],
  ["Su 1.5L", "İçkilər", 0.35, 0.6, 0, 126, 40],
  ["Su 5L", "İçkilər", 0.9, 1.4, 0, 44, 15],
  ["Limonad 1L", "İçkilər", 0.95, 1.4, 0, 3, 15],
  ["Enerji içkisi 0.25L", "İçkilər", 1.1, 1.8, 0, 58, 20],
  ["Ayran 0.5L", "Süd məhsulları", 0.55, 0.8, 0, 40, 20],
  ["Süd 1L", "Süd məhsulları", 1.05, 1.4, 0, 7, 20],
  ["Kefir 1L", "Süd məhsulları", 1.1, 1.5, 0, 22, 15],
  ["Qatıq 500q", "Süd məhsulları", 0.9, 1.3, 0, 18, 15],
  ["Xama 200q", "Süd məhsulları", 1.0, 1.45, 0, 26, 10],
  ["Kərə yağı 200q", "Süd məhsulları", 3.2, 4.3, 0, 31, 10],
  ["Ağ pendir 400q", "Süd məhsulları", 4.1, 5.6, 0, 19, 8],
  ["Kəsmik 400q", "Süd məhsulları", 2.2, 3.0, 0, 4, 8],
  ["Kənd çörəyi", "Çörək", 0.32, 0.5, 0, 22, 30],
  ["Baton", "Çörək", 0.4, 0.6, 0, 35, 25],
  ["Lavaş", "Çörək", 0.25, 0.4, 0, 60, 20],
  ["Qara çay 500q", "Çay və qəhvə", 3.4, 4.5, 10, 41, 15],
  ["Yaşıl çay 100q", "Çay və qəhvə", 2.1, 3.0, 0, 17, 8],
  ["Qəhvə 3ü1-də (10 əd)", "Çay və qəhvə", 2.0, 2.9, 0, 48, 15],
  ["Dənli qəhvə 250q", "Çay və qəhvə", 6.5, 8.9, 0, 12, 6],
  ["Düyü 1kq", "Bakaleya", 2.0, 2.8, 0, 65, 20],
  ["Qarabaşaq 900q", "Bakaleya", 1.7, 2.4, 0, 38, 15],
  ["Makaron 400q", "Bakaleya", 0.7, 1.1, 0, 90, 25],
  ["Un 2kq", "Bakaleya", 1.6, 2.2, 0, 27, 10],
  ["Şəkər 1kq", "Bakaleya", 1.3, 1.8, 0, 54, 20],
  ["Günəbaxan yağı 1L", "Bakaleya", 2.9, 3.8, 0, 33, 12],
  ["Zeytun yağı 0.5L", "Bakaleya", 7.2, 9.5, 15, 9, 6],
  ["Tomat pastası 700q", "Bakaleya", 2.1, 2.9, 0, 24, 10],
  ["Noxud konservi 400q", "Bakaleya", 1.1, 1.6, 0, 30, 10],
  ["Yumurta 10 əd", "Ət və yumurta", 2.4, 3.2, 0, 46, 20],
  ["Sosiska 500q", "Ət və yumurta", 3.6, 4.9, 0, 21, 10],
  ["Kolbasa 400q", "Ət və yumurta", 4.4, 5.9, 0, 2, 8],
  ["Şokolad 90q", "Şirniyyat", 1.4, 2.0, 0, 72, 20],
  ["Peçenye 300q", "Şirniyyat", 1.3, 1.9, 0, 55, 15],
  ["Vafli 200q", "Şirniyyat", 1.0, 1.5, 20, 40, 15],
  ["Dondurma (eskimo)", "Şirniyyat", 0.5, 0.8, 0, 64, 20],
  ["Saqqız", "Şirniyyat", 0.3, 0.5, 0, 150, 30],
  ["Çips 150q", "Qəlyanaltı", 1.5, 2.2, 0, 47, 15],
  ["Günəbaxan tumu 200q", "Qəlyanaltı", 0.9, 1.4, 0, 60, 20],
  ["Fındıq 200q", "Qəlyanaltı", 3.5, 4.8, 0, 14, 6],
  ["Paltar tozu 3kq", "Məişət", 9.8, 12.9, 15, 9, 15],
  ["Qab yuyucu 500ml", "Məişət", 1.6, 2.3, 0, 34, 12],
  ["Kağız dəsmal (2 rulon)", "Məişət", 1.9, 2.7, 0, 25, 10],
  ["Tualet kağızı (8 rulon)", "Məişət", 3.9, 5.4, 0, 0, 10],
  ["Zibil paketi (30 əd)", "Məişət", 1.2, 1.8, 0, 38, 10],
  ["Şampun 400ml", "Gigiyena", 3.8, 5.3, 0, 23, 8],
  ["Sabun 90q", "Gigiyena", 0.6, 0.9, 0, 80, 20],
  ["Diş məcunu 100ml", "Gigiyena", 1.8, 2.6, 0, 29, 10],
  ["Uşaq bezi (Midi)", "Gigiyena", 11.5, 15.9, 10, 11, 6],
];

// [ad, kat, alış/kq, satış/kq, stok kq, tərəzi kodu]
const CEKI = [
  ["Pomidor", "Tərəvəz", 1.5, 2.2, 45.5, "00010"],
  ["Xiyar", "Tərəvəz", 1.2, 1.8, 38.2, "00011"],
  ["Kartof", "Tərəvəz", 0.6, 0.9, 120.0, "00012"],
  ["Soğan", "Tərəvəz", 0.5, 0.8, 85.4, "00013"],
  ["Bibər", "Tərəvəz", 2.0, 2.9, 14.6, "00014"],
  ["Alma", "Meyvə", 1.3, 1.9, 62.3, "00020"],
  ["Banan", "Meyvə", 2.1, 2.9, 31.7, "00021"],
  ["Portağal", "Meyvə", 1.8, 2.6, 4.2, "00022"],
  ["Üzüm", "Meyvə", 2.4, 3.5, 18.9, "00023"],
  ["Toyuq filesi", "Ət və yumurta", 7.5, 9.9, 16.4, "00030"],
  ["Mal əti", "Ət və yumurta", 15.0, 18.5, 22.8, "00031"],
  ["Qoyun əti", "Ət və yumurta", 16.0, 19.9, 9.3, "00032"],
  ["Holland pendiri", "Süd məhsulları", 11.0, 14.5, 7.6, "00040"],
];

// Fresh/unpackaged items sold from the "Barkodu yoxdur" quick-add grid.
const BARKODSUZ = [
  ["ÇÖRƏK (təndir)", "Çörək", 0.35, 0.6, 40],
  ["YUMURTA (ədədlə)", "Ət və yumurta", 0.24, 0.35, 180],
  ["SU (bidon 19L)", "İçkilər", 2.0, 3.0, 12],
];

function buildProducts() {
  const products = [];
  EDED.forEach(([ad, kat, alish, satish, endirim, stok, minimum], i) => {
    products.push({
      kod: ean13(`476${String(1000000 + i * 137).padStart(9, "0")}`),
      ad, kat, alish, satish, endirim, stok, minimum,
      novu: "eded", vahid: "ədəd", tereziKodu: "",
    });
  });
  CEKI.forEach(([ad, kat, alish, satish, stok, tereziKodu]) => {
    products.push({
      kod: ean13(`21${tereziKodu}00000`),
      ad, kat, alish, satish, endirim: 0, stok, minimum: 5,
      novu: "çəki", vahid: "kq", tereziKodu,
    });
  });
  BARKODSUZ.forEach(([ad, kat, alish, satish, stok], i) => {
    products.push({
      kod: `BK${String(i + 1).padStart(4, "0")}`,
      ad, kat, alish, satish, endirim: 0, stok, minimum: 10,
      novu: "eded", vahid: "ədəd", tereziKodu: "", barkodsuz: true,
    });
  });
  return products;
}

const KASSIRLER = ["Aysel Məmmədova", "Rəşad Əliyev", "Günay Həsənova"];

export function buildDemoData() {
  const rand = rng(20261010);
  const now = new Date();
  const products = buildProducts();
  // Starting stock is what the shelves should show *now*; the generated
  // sales below are history, so they're not subtracted again.
  const sellable = products.filter((p) => p.satish > 0);

  const employees = [
    ...KASSIRLER.map((ad, i) => ({
      ad, rol: "Kassir", icaze: "Yalnız kassa", status: "Aktiv",
      giris: `0${8 + i}:00`, sifre: DEMO_PASSWORD,
    })),
    { ad: "Elvin Abdullayev", rol: "Rəhbər", icaze: "Tam giriş", status: "Aktiv", giris: "09:00", sifre: DEMO_PASSWORD },
  ];

  const sales = [];
  const shifts = [];
  let saleNo = 1;
  const DAYS = 21;
  for (let back = DAYS - 1; back >= 0; back--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
    const isToday = back === 0;
    const kassir = KASSIRLER[back % KASSIRLER.length];
    const shiftStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 8, 55);
    const shiftEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 22, 5);
    const shiftId = `demo-shift-${back}`;
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    let count = Math.round((weekend ? 70 : 52) + rand() * 25);
    // Today only has the sales made so far (store opens at 9:00) — but at
    // least a couple dozen, so the dashboard never looks empty in a demo
    // shown early in the morning (those then fall between 00:00 and now).
    const nowMinute = now.getHours() * 60 + now.getMinutes();
    const openMinute = isToday && nowMinute < 10 * 60 ? 0 : 9 * 60;
    const lastMinute = isToday ? Math.max(1, nowMinute - openMinute) : 13 * 60;
    if (isToday) count = Math.max(24, Math.round(count * Math.min(1, lastMinute / (13 * 60))));

    const daySales = [];
    for (let k = 0; k < count; k++) {
      const minute = Math.floor(rand() * Math.max(1, lastMinute));
      const t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, (isToday ? openMinute : 9 * 60) + minute);
      const lineCount = 1 + Math.floor(rand() * 5);
      const items = [];
      for (let j = 0; j < lineCount; j++) {
        const p = sellable[Math.floor(rand() * sellable.length)];
        if (items.some((it) => it.kod === p.kod)) continue;
        const miqdar = p.novu === "çəki" ? round3(0.3 + rand() * 1.7) : 1 + Math.floor(rand() * (rand() < 0.8 ? 1 : 3));
        items.push({ kod: p.kod, ad: p.ad, qiymet: p.satish, endirim: p.endirim, miqdar, novu: p.novu, vahid: p.vahid });
      }
      const total = round2(items.reduce((s, it) => s + round2(it.qiymet * it.miqdar * (1 - (it.endirim || 0) / 100)), 0));
      const r = rand();
      const method = r < 0.5 ? "nagd" : r < 0.92 ? "kart" : "qarisiq";
      const cashPart = method === "qarisiq" ? round2(Math.floor(total / 2)) : null;
      const received = method === "nagd" ? Math.ceil(total) : method === "qarisiq" ? cashPart : total;
      daySales.push({
        t,
        sale: {
          tarix: fmtDateTime(t),
          kassir,
          shiftId,
          say: items.length,
          meblegh: total,
          odenish: method === "nagd" ? "NƏĞD" : method === "kart" ? "KART" : "QARIŞIQ",
          status: rand() < 0.015 ? "İadə edilib" : "Tamamlandı",
          items,
          received,
          change: method === "nagd" ? round2(received - total) : 0,
          method,
          cashPart,
          cardPart: method === "qarisiq" ? round2(total - cashPart) : null,
        },
      });
    }
    daySales.sort((a, b) => a.t - b.t);
    daySales.forEach(({ sale }) => {
      sale.no = "#" + String(saleNo++).padStart(6, "0");
      sales.push(sale);
    });

    if (!isToday) {
      const ss = daySales.map((d) => d.sale);
      const ok = ss.filter((s) => s.status !== "İadə edilib");
      const ret = ss.filter((s) => s.status === "İadə edilib");
      const nagd = round2(ok.reduce((s, x) => s + (x.method === "nagd" ? x.meblegh : x.method === "qarisiq" ? x.cashPart : 0), 0));
      const kart = round2(ok.reduce((s, x) => s + (x.method === "kart" ? x.meblegh : x.method === "qarisiq" ? x.cardPart : 0), 0));
      const qaytarma = round2(ret.reduce((s, x) => s + x.meblegh, 0));
      shifts.push({
        id: shiftId, kassir, baslama: fmtDateTime(shiftStart), bitme: fmtDateTime(shiftEnd), status: "Bağlı",
        satisSayi: ok.length, nagdCemi: nagd, kartCemi: kart, qaytarmaSayi: ret.length, qaytarmaCemi: qaytarma,
        umumiCemi: round2(nagd + kart - qaytarma),
      });
    }
  }
  // Newest first, like the real server keeps them. Today's sales were made
  // without an open shift in this demo, so detach them from the shift id.
  sales.reverse();
  shifts.reverse();
  const todayStr = fmtDate(now);
  sales.forEach((s) => {
    if (s.tarix.startsWith(todayStr)) s.shiftId = null;
  });

  const suppliers = [
    { ad: "Araz Distribusiya", tel: "050 111 22 33", meblegh: 1240, borc: 0, status: "Aktiv" },
    { ad: "Qida Təchizat MMC", tel: "051 222 33 44", meblegh: 860, borc: 320, status: "Borc var" },
    { ad: "Məişət Dünyası MMC", tel: "055 333 44 55", meblegh: 1480, borc: 0, status: "Aktiv" },
    { ad: "Su və İçki Distribusiya", tel: "070 444 55 66", meblegh: 2160, borc: 540, status: "Borc var" },
    { ad: "Kənd Təsərrüfatı Bazası", tel: "077 555 66 77", meblegh: 930, borc: 0, status: "Aktiv" },
  ];

  // A few recent deliveries, so Təchizatçılar / Stok hərəkətləri aren't empty.
  const purchases = [];
  const stockMovements = [];
  const deliveries = [
    { back: 1, tedarukcu: "Su və İçki Distribusiya", kats: ["İçkilər"] },
    { back: 3, tedarukcu: "Qida Təchizat MMC", kats: ["Bakaleya", "Süd məhsulları"] },
    { back: 5, tedarukcu: "Kənd Təsərrüfatı Bazası", kats: ["Tərəvəz", "Meyvə"] },
    { back: 8, tedarukcu: "Məişət Dünyası MMC", kats: ["Məişət", "Gigiyena"] },
  ];
  deliveries.forEach((dlv, idx) => {
    const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dlv.back, 10, 15 + idx * 7);
    const tarix = fmtDateTime(t);
    const lines = products.filter((p) => dlv.kats.includes(p.kat)).slice(0, 6);
    const items = lines.map((p) => {
      const miqdar = p.novu === "çəki" ? 25 : 24;
      return { kod: p.kod, ad: p.ad, miqdar, alish: p.alish, satish: p.satish, mebleg: round2(miqdar * p.alish) };
    });
    const cemi = round2(items.reduce((s, it) => s + it.mebleg, 0));
    purchases.push({
      id: `demo-purchase-${idx}`, cekNo: "M-" + String(deliveries.length - idx).padStart(6, "0"), tarix,
      tedarukcu: dlv.tedarukcu, sened: `QF-${2400 + idx}`, ekspeditor: "", items, cemi, endirimPct: 0, odeniler: cemi,
    });
    items.forEach((it, j) => {
      const p = products.find((x) => x.kod === it.kod);
      stockMovements.push({
        id: `demo-mv-${idx}-${j}`, tarix, kod: it.kod, ad: it.ad, tip: "Giriş", miqdar: it.miqdar,
        sebeb: `Mal qəbulu — ${dlv.tedarukcu}`, qaliq: p.stok,
      });
    });
    const sup = suppliers.find((s) => s.ad === dlv.tedarukcu);
    if (sup && !sup.sonAlish) sup.sonAlish = tarix;
  });
  suppliers.forEach((s) => {
    if (!s.sonAlish) s.sonAlish = fmtDateTime(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 12, 11, 0));
  });
  stockMovements.unshift({
    id: "demo-mv-writeoff", tarix: fmtDateTime(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 18, 40)),
    kod: products.find((p) => p.ad === "Süd 1L").kod, ad: "Süd 1L", tip: "Çıxış", miqdar: 3, sebeb: "Vaxtı bitib", qaliq: 7,
  });

  const priceChanges = [
    {
      id: "demo-price-1", tarix: fmtDateTime(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 4, 12, 10)),
      kod: products.find((p) => p.ad === "Kərə yağı 200q").kod, ad: "Kərə yağı 200q", eskiQiymet: 3.9, yeniQiymet: 4.3,
    },
  ];

  return {
    _demoGeneratedFor: fmtDate(now),
    products,
    sales,
    employees,
    suppliers,
    stockMovements,
    purchases,
    priceChanges,
    scannerUsers: [{ username: "demo", password: DEMO_PASSWORD }],
    shifts,
    settings: {
      magazaAdi: "ZƏHRA MARKET",
      voen: "0000000000",
      telefon: "012 000 00 00",
      unvan: "Bakı şəhəri (demo)",
      valyuta: "AZN",
      printer: "Printer 01 — Aktiv",
      avtomatikCek: false,
      endirimSistemi: true,
      tereziPrefiks: "22",
      adminSifre: DEMO_PASSWORD,
      cekBasliqQeydi: "DEMO VERSİYA",
      cekTesekkurMesaji: "TƏŞƏKKÜRLƏR!\nXoş gəlmisiniz!",
      edvEnabled: false,
      edvTerminalIp: "",
      edvKey: "",
      edvMergePrint: false,
      apiToken: "DEMO",
    },
  };
}
