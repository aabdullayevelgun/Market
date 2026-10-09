import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

async function start() {
  // Offline demo build (VITE_DEMO=1): answer every /api/* call inside the
  // page instead of from the Admin PC's server. Loaded as its own chunk and
  // dropped entirely from normal builds.
  if (import.meta.env.VITE_DEMO === "1") {
    const { installDemoServer } = await import("./demo/mockServer.js");
    installDemoServer();
  }
  createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

start();
