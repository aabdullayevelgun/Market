const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  exportReportPdf: () => ipcRenderer.invoke("export-report-pdf"),
  listPrinters: () => ipcRenderer.invoke("list-printers"),
  printReceipt: (deviceName) => ipcRenderer.invoke("print-receipt", deviceName),
  testTereziConnection: (ip, port) => ipcRenderer.invoke("terezi-test-connection", ip, port),
  sendTereziPlu: (ip, port, products) => ipcRenderer.invoke("terezi-send-plu", ip, port, products),
  pickBackupFolder: () => ipcRenderer.invoke("backup-pick-folder"),
  runBackupNow: () => ipcRenderer.invoke("backup-run-now"),
  testEdvConnection: (ip, key) => ipcRenderer.invoke("edv-test-connection", ip, key),
  sendEdvSale: (ip, key, sale, autoPrint) => ipcRenderer.invoke("edv-sale", ip, key, sale, autoPrint),
});
