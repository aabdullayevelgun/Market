import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const isDev = !app.isPackaged;

// Start the local network server (used when this PC acts as "Admin" / database).
// It's harmless to always run this — a Kassa-only PC simply won't use it.
try {
  const { startServer } = require(path.join(__dirname, "../server/index.js"));
  startServer(app.getPath("userData"), 4000);
} catch (err) {
  console.error("Server could not start:", err);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
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

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});