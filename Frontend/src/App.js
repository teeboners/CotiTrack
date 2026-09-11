import { useEffect, useState } from "react";
import { BrowserRouter, Link, Redirect, Route, Switch } from "react-router-dom";

import api from "./api";
import Clientes from "./catalogos/Clientes";
import Productos from "./catalogos/Productos";
import Usuarios from "./catalogos/Usuarios";
import Cotizaciones from "./Cotizaciones";
import CotizacionForm from "./CotizacionForm";
import CotizacionDetalle from "./CotizacionDetalle";
import Dashboard from "./Dashboard";
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
    <BrowserRouter>
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

        <nav className="menu-principal">
          <Link to="/">Dashboard</Link>
          <Link to="/clientes">Clientes</Link>
          <Link to="/productos">Productos y servicios</Link>
          <Link to="/cotizaciones">Cotizaciones</Link>
          {usuario.rol === "Administrador" && (
            <Link to="/usuarios">Gestión de usuarios</Link>
          )}
        </nav>

        <main className="contenido">
          <Switch>
            <Route exact path="/">
              <Dashboard />
            </Route>

            <Route path="/clientes">
              <Clientes />
            </Route>

            <Route path="/productos">
              <Productos />
            </Route>

            <Route path="/usuarios">
              {usuario.rol === "Administrador" ? <Usuarios /> : <Redirect to="/" />}
            </Route>

            <Route exact path="/cotizaciones/nueva">
              <CotizacionForm />
            </Route>

            <Route exact path="/cotizaciones/:id/editar">
              <CotizacionForm />
            </Route>

            <Route exact path="/cotizaciones/:id">
              <CotizacionDetalle />
            </Route>

            <Route exact path="/cotizaciones">
              <Cotizaciones />
            </Route>

            <Redirect to="/" />
          </Switch>
        </main>
      </div>
    </BrowserRouter>
  );
}


export default App;
