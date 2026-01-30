import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

// Detectar se está rodando no Electron ou na Web
const isElectron = () => {
  // Renderer process
  if (typeof window !== 'undefined' && typeof window.process === 'object' && window.process.type === 'renderer') {
    return true;
  }
  // Main process
  if (typeof process !== 'undefined' && typeof process.versions === 'object' && !!process.versions.electron) {
    return true;
  }
  // Detect the user agent when the `nodeIntegration` option is set to true
  if (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('Electron') >= 0) {
    return true;
  }
  return false;
};

const root = ReactDOM.createRoot(document.getElementById("root"));

// Carregar o App correto baseado no ambiente
if (isElectron()) {
  // Versão Desktop (Electron)
  const App = require("./App").default;
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  // Versão Web (SaaS)
  const AppWeb = require("./AppWeb").default;
  root.render(
    <React.StrictMode>
      <AppWeb />
    </React.StrictMode>
  );
}
