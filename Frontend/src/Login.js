import { useState } from "react";
import api from "./api";


function Login({ onLogin }) {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviarFormulario(evento) {
    evento.preventDefault();
    setMensaje("");
    setCargando(true);

    try {
      const respuesta = await api.post("/auth/login", {
        correo,
        password,
      });

      onLogin(respuesta.data.usuario);
    } catch (error) {
      setMensaje(
        error.response?.data?.mensaje || "No fue posible iniciar sesión"
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={enviarFormulario}>
        <h1>CotiTrack</h1>
        <p>Gestión de cotizaciones comerciales</p>

        <label htmlFor="correo">Correo</label>
        <input
          id="correo"
          type="email"
          value={correo}
          onChange={(evento) => setCorreo(evento.target.value)}
          required
        />

        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(evento) => setPassword(evento.target.value)}
          required
        />

        {mensaje && <div className="mensaje-error">{mensaje}</div>}

        <button type="submit" disabled={cargando}>
          {cargando ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </main>
  );
}


export default Login;