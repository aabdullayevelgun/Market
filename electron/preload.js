const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  exportReportPdf: () => ipcRenderer.invoke("export-report-pdf"),
});