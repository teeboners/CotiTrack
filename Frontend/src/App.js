import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Redirect,
  Route,
  Switch,
} from "react-router-dom";

import api from "./api";
import Clientes from "./catalogos/Clientes";
import Productos from "./catalogos/Productos";
import Usuarios from "./catalogos/Usuarios";
import Cotizaciones from "./Cotizaciones";
import CotizacionForm from "./CotizacionForm";
import CotizacionDetalle from "./CotizacionDetalle";
import Dashboard from "./Dashboard";
import Login from "./Login";
import MiCuenta from "./MiCuenta";
import "./styles.css";


function App() {
  const [usuario, setUsuario] = useState(null);
  const [comprobando, setComprobando] = useState(true);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cuentaAbierta, setCuentaAbierta] = useState(false);

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
      setMenuAbierto(false);
      setCuentaAbierta(false);
    }
  }

  function cerrarMenu() {
    setMenuAbierto(false);
  }

  if (comprobando) {
    return <main className="pantalla-carga">Comprobando sesión...</main>;
  }

  if (!usuario) {
    return <Login onLogin={setUsuario} />;
  }

  return (
    <BrowserRouter>
      <div className="aplicacion">
        <aside className={`barra-lateral ${menuAbierto ? "menu-abierto" : ""}`}>
          <div className="marca">
            <span className="marca-icono">CT</span>
            <div>
              <strong>CotiTrack</strong>
              <small>Gestión de cotizaciones</small>
            </div>
          </div>

          <nav className="menu-principal" aria-label="Navegación principal">
            <NavLink exact to="/" activeClassName="activo" onClick={cerrarMenu}>
              Dashboard
            </NavLink>
            <NavLink to="/clientes" activeClassName="activo" onClick={cerrarMenu}>
              Clientes
            </NavLink>
            <NavLink to="/productos" activeClassName="activo" onClick={cerrarMenu}>
              Productos y servicios
            </NavLink>
            <NavLink to="/cotizaciones" activeClassName="activo" onClick={cerrarMenu}>
              Cotizaciones
            </NavLink>
            {usuario.rol === "Administrador" && (
              <NavLink to="/usuarios" activeClassName="activo" onClick={cerrarMenu}>
                Gestión de usuarios
              </NavLink>
            )}
          </nav>

        </aside>

        {menuAbierto && (
          <button
            className="fondo-menu"
            type="button"
            aria-label="Cerrar menú"
            onClick={cerrarMenu}
          />
        )}

        <div className="area-principal">
          <header className="barra-superior">
            <button
              className="boton-menu"
              type="button"
              aria-label="Abrir menú"
              onClick={() => setMenuAbierto(!menuAbierto)}
            >
              ☰
            </button>

            <div className="cuenta-superior">
              <button
                className="usuario-actual"
                type="button"
                aria-expanded={cuentaAbierta}
                onClick={() => setCuentaAbierta(!cuentaAbierta)}
              >
                <span className="usuario-avatar">
                  {usuario.nombre.trim().charAt(0).toUpperCase()}
                </span>
                <span className="usuario-texto">
                  <strong>{usuario.nombre}</strong>
                  <small>{usuario.rol}</small>
                </span>
              </button>

              {cuentaAbierta && (
                <div className="menu-cuenta">
                  <Link to="/mi-cuenta" onClick={() => setCuentaAbierta(false)}>
                    Mi cuenta
                  </Link>
                  <button type="button" onClick={cerrarSesion}>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </header>

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
              <Route path="/mi-cuenta">
                <MiCuenta usuario={usuario} onUsuarioActualizado={setUsuario} />
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
      </div>
    </BrowserRouter>
  );
}


export default App;
