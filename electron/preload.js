const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  exportReportPdf: () => ipcRenderer.invoke("export-report-pdf"),
  testTereziConnection: (ip, port) => ipcRenderer.invoke("terezi-test-connection", ip, port),
  sendTereziPlu: (ip, port, products) => ipcRenderer.invoke("terezi-send-plu", ip, port, products),
  pickBackupFolder: () => ipcRenderer.invoke("backup-pick-folder"),
  runBackupNow: () => ipcRenderer.invoke("backup-run-now"),
});