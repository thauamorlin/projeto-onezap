import { ToastContainer } from "react-toastify";
import { useState, useEffect } from "react";
import { channels } from "./shared/constants";

import "./styles/base.css";
import "./styles/global.css";
import "react-toastify/dist/ReactToastify.css";

import { Login } from "./pages/Login";
import AppLayout from "./layouts/AppLayout";

const { ipcRenderer } = window.require("electron");

/**
 * Componente principal da aplicação que gerencia autenticação
 * @returns {JSX.Element} Componente React renderizado
 */
function App() {
  /** @type {[string|null, React.Dispatch<React.SetStateAction<string|null>>]} */
  const [token, setToken] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("authToken");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  /**
   * Handler para sucesso no login
   * @param {string} authToken - Token de autenticação
   */
  const handleLoginSuccess = (authToken) => {
    localStorage.setItem("authToken", authToken);
    setToken(authToken);
  };

  /**
   * Handler para logout
   */
  const handleLogout = async () => {
    localStorage.removeItem("authToken");
    await ipcRenderer.invoke(channels.DISCONNECTED_ALL);
    setToken(null);
  };

  return (
    <>
      <ToastContainer />
      {token ? (
        <AppLayout onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </>
  );
}

export default App;
