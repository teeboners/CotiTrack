import { useEffect, useState } from "react";

import api from "./api";
import Login from "./Login";
import "./styles.css";


function App() {
  const [usuario, setUsuario] = useState(null);
  const [comprobando, setComprobando] = useState(true);

  useEffect(() => {
    api.get("/auth/sesion")
      .then((respuesta) => setUsuario(respuesta.data.usuario))
      .catch(() => setUsuario(null))
      .finally(() => setComprobando(false));
  }, []);

  async function cerrarSesion() {
    try {
      await api.post("/auth/logout");
    } finally {
      setUsuario(null);
    }
  }

  if (comprobando) {
    return <main className="inicio">Comprobando sesión...</main>;
  }

  if (!usuario) {
    return <Login onLogin={setUsuario} />;
  }

  return (
    <div className="aplicacion">
      <header className="barra-superior">
        <div>
          <strong>CotiTrack</strong>
          <span>{usuario.nombre} · {usuario.rol}</span>
        </div>

        <button type="button" onClick={cerrarSesion}>
          Cerrar sesión
        </button>
      </header>

      <main className="contenido">
        <h1>Bienvenido, {usuario.nombre}</h1>
        <p>La autenticación funciona correctamente.</p>

        {usuario.rol === "Administrador" && (
          <section className="tarjeta">
            <h2>Gestión de usuarios</h2>
            <p>Este módulo se construirá en la siguiente fase.</p>
          </section>
        )}
      </main>
    </div>
  );
}


export default App;