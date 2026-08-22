const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const net = require("net");

const isDev = !app.isPackaged;

// Old GPU drivers (common on Windows 7 machines) frequently fail to
// initialize hardware-accelerated rendering in Chromium, which shows up as
// a permanently blank/white window with nothing drawn and no error at all.
// Disabling GPU acceleration trades a little rendering performance for the
// app actually being visible — worth it for a simple POS UI like this one.
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-software-rasterizer");

// Writes a persistent log line and — once the window has appeared — pops up
// a real, readable error dialog. This is what makes a startup failure like
// "port already in use" or "data file unreadable" visible on a packaged
// build at all: without it, the app just silently never becomes reachable,
// with zero indication why (this is exactly what happened after the power
// outage — nothing in the UI hinted the local server had failed to start).
function reportFatalStartupError(title, err) {
  try {
    const logPath = path.join(app.getPath("userData"), "startup-error.log");
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${title}: ${err && err.stack ? err.stack : err}\n`);
  } catch {
    // even logging failed — nothing more we can do locally
  }
  const show = () => dialog.showErrorBox(title, String((err && err.message) || err));
  if (app.isReady()) show();
  else app.whenReady().then(show);
}

// Start the local network server (used when this PC acts as "Admin" / database).
// It's harmless to always run this — a Kassa-only PC simply won't use it.
try {
  const { startServer } = require(path.join(__dirname, "../server/index.js"));
  startServer(app.getPath("userData"), 4000, (err) => {
    reportFatalStartupError(
      "Server başlaya bilmədi (port 4000)",
      `${err.code === "EADDRINUSE" ? "4000 portu artıq başqa proqram tərəfindən istifadə olunur." : err.message}\n\nBu kompüteri yenidən başladıb bir də sınayın. Problem davam etsə, bu mesajı olduğu kimi göstərin.`
    );
  });
} catch (err) {
  reportFatalStartupError("Server başlaya bilmədi", err);
}

// Daily off-disk backup: copies the live data file to a folder the user
// picked (Ehtiyat nüsxə screen) — ideally a different physical drive or a
// USB stick, so data survives even if this PC's own disk fails. The
// server's own rolling backups/ folder (see server/index.js) only protects
// against bad edits, not disk loss, since it lives on the same drive.
function runDailyBackup() {
  try {
    const dataFile = path.join(app.getPath("userData"), "zehra-market-data.json");
    if (!fs.existsSync(dataFile)) return;
    const raw = fs.readFileSync(dataFile, "utf8");
    const data = JSON.parse(raw);
    const folder = data.settings && data.settings.avtoBackupQovlugu;
    if (!folder || !fs.existsSync(folder)) return;
    const stamp = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(path.join(folder, `zehra-market-ehtiyat-${stamp}.json`), raw, "utf8");
  } catch (err) {
    console.error("Daily backup failed:", err);
  }
}
setInterval(runDailyBackup, 24 * 60 * 60 * 1000);
app.whenReady().then(runDailyBackup);

// Lets the Parametrlər screen list real Windows printers, so "Çek printeri"
// can be an actual selectable device instead of a free-text label.
ipcMain.handle("list-printers", async (event) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    const printers = await win.webContents.getPrintersAsync();
    return { ok: true, printers: printers.map((p) => ({ name: p.name, isDefault: !!p.isDefault })) };
  } catch (err) {
    return { ok: false, error: String(err), printers: [] };
  }
});

// Prints whatever is currently marked as the print area (see index.css'
// `.print-area` rule) straight to the chosen (or default) printer, with no
// dialog — this is what makes "Avtomatik çek" actually automatic instead of
// just a UI toggle that did nothing.
ipcMain.handle("print-receipt", async (event, deviceName) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return new Promise((resolve) => {
    win.webContents.print(
      { silent: true, printBackground: true, deviceName: deviceName || undefined },
      (success, reason) => resolve({ ok: success, error: success ? null : reason })
    );
  });
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  // Blank/white window with nothing on it (a known failure mode on old
  // Windows/GPU combos) otherwise leaves zero trace of what went wrong —
  // catch it here so the log/error dialog actually says something useful.
  win.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
    reportFatalStartupError("Səhifə yüklənmədi", `${errorDescription} (kod: ${errorCode})`);
  });
  win.webContents.on("render-process-gone", (event, details) => {
    reportFatalStartupError("Tətbiq gözlənilmədən bağlandı", `reason: ${details.reason}`);
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

// Renders the currently-open page straight to a PDF file (respecting the
// app's @media print CSS, so only the report content shows up) and lets the
// person pick where to save it — no printer, no print dialog.
ipcMain.handle("export-report-pdf", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  try {
    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: "A4",
    });
    const stamp = new Date().toISOString().slice(0, 10);
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: "Hesabatı yadda saxla",
      defaultPath: `zehra-market-hesabat-${stamp}.pdf`,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };
    fs.writeFileSync(filePath, pdfBuffer);
    return { ok: true, filePath };
  } catch (err) {
    console.error("PDF export failed:", err);
    return { ok: false, error: String(err) };
  }
});

// Lets the Ehtiyat nüsxə screen pick the external folder that the daily
// backup (see runDailyBackup above) writes into.
ipcMain.handle("backup-pick-folder", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: "Avtomatik ehtiyat nüsxə qovluğunu seçin",
    properties: ["openDirectory", "createDirectory"],
  });
  if (canceled || !filePaths[0]) return { ok: false, canceled: true };
  return { ok: true, folder: filePaths[0] };
});

// Runs today's backup immediately (used right after picking a folder, so
// the user gets instant confirmation instead of waiting up to 24h).
ipcMain.handle("backup-run-now", async () => {
  runDailyBackup();
  return { ok: true };
});

// Opens a raw TCP connection to the scale (no 1C, no driver — we talk to it
// directly) and reports back whether it accepted the connection at all.
// This alone confirms the IP/port are reachable before we try sending data.
ipcMain.handle("terezi-test-connection", async (event, ip, port) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ ok: false, error: "Vaxt bitdi (bağlantı alınmadı)." });
    }, 4000);
    socket.connect(port, ip, () => {
      clearTimeout(timer);
      socket.end();
      resolve({ ok: true });
    });
    socket.on("error", (err) => {
      clearTimeout(timer);
      resolve({ ok: false, error: err.message });
    });
  });
});

// ACLAS PLU record format — reverse-engineered from a real exchange file
// (temp151.txp) produced by 1C's own scale driver at the shop, byte-for-byte
// verified against that sample. Fixed-width, left-justified fields, ASCII
// only (the sample file had zero non-ASCII bytes), one record per line,
// records separated by \r\n:
//
//   col   width  content
//   0      5     "0" + 4 spaces (record type, always "0")
//   5     37     product name, left-justified, ASCII only
//   42     7     PLU number (sequential, unique per record)
//   49    11     tərəzi kodu (the 5-digit weight-barcode code)
//   60     3     "7" (constant)
//   63     9     price in qəpik (AZN × 100), integer
//   72     2     "4" (constant)
//   74     3     "22" (constant — matches this app's tərəzi barkod prefiksi)
//   77     7     "0" (constant)
//   84     4     "15" (constant)
//   88     2     "0" (constant)
//   90     7     "0" (constant)
//   97     3     "5" (constant)
//   100    4     "0" (constant)
//   104    4     "0" (constant)
//   108    4     "0" (constant)
//   112    4     "0" (constant)
//   116    1     "0" (constant, no trailing pad — last char of the line)
const AZ_TO_ASCII = {
  ə: "e", Ə: "E", ş: "s", Ş: "S", ç: "c", Ç: "C", ğ: "g", Ğ: "G",
  ı: "i", İ: "I", ö: "o", Ö: "O", ü: "u", Ü: "U",
};
function toAsciiUpper(s) {
  return String(s || "")
    .split("")
    .map((ch) => AZ_TO_ASCII[ch] || ch)
    .join("")
    .toUpperCase()
    .replace(/[^\x20-\x7E]/g, ""); // drop anything still non-ASCII rather than send garbage bytes
}
function pad(v, w) {
  return String(v).padEnd(w, " ").slice(0, w);
}
function buildPluLine(pluNumber, product) {
  const priceQepik = Math.round((product.satish || 0) * 100);
  const tereziKodu = (product.tereziKodu || "").trim() || String(pluNumber).padStart(5, "0");
  return (
    pad("0", 5) +
    pad(toAsciiUpper(product.ad), 37) +
    pad(pluNumber, 7) +
    pad(tereziKodu, 11) +
    pad("7", 3) +
    pad(priceQepik, 9) +
    pad("4", 2) +
    pad("22", 3) +
    pad("0", 7) +
    pad("15", 4) +
    pad("0", 2) +
    pad("0", 7) +
    pad("5", 3) +
    pad("0", 4) +
    pad("0", 4) +
    pad("0", 4) +
    pad("0", 4) +
    "0"
  );
}

// Sends PLU records directly to the scale over TCP — no intermediate file,
// no 1C driver involved. Only çəki (weighed) products make sense to send —
// packaged/counted items aren't priced by this scale.
ipcMain.handle("terezi-send-plu", async (event, ip, port, products) => {
  const weighed = products.filter((p) => p.novu === "çəki");
  if (weighed.length === 0) {
    return { ok: false, error: "Çəki ilə satılan (novu=çəki) məhsul tapılmadı." };
  }
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ ok: false, error: "Vaxt bitdi (tərəzi cavab vermədi)." });
    }, 6000);

    socket.connect(port, ip, () => {
      const lines = weighed.map((p, i) => buildPluLine(i + 1, p));
      const payload = lines.join("\r\n") + "\r\n";
      socket.write(payload, "latin1", () => {
        clearTimeout(timer);
        socket.end();
        resolve({ ok: true, count: weighed.length });
      });
    });
    socket.on("error", (err) => {
      clearTimeout(timer);
      resolve({ ok: false, error: err.message });
    });
  });
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
