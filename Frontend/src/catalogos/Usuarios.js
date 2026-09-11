import { useEffect, useState } from "react";

import api from "../api";
import Campo from "./Campo";


const USUARIO_VACIO = {
  rol_id: "2",
  nombre: "",
  correo: "",
  password: "",
};


function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [formulario, setFormulario] = useState({ ...USUARIO_VACIO });
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/usuarios")
      .then((respuesta) => setUsuarios(respuesta.data.datos))
      .catch((problema) => {
        setError(problema.response?.data?.mensaje || "No fue posible cargar los usuarios");
      });
  }, []);

  async function cargarUsuarios(textoBusqueda = busqueda) {
    try {
      const respuesta = await api.get("/usuarios", {
        params: { buscar: textoBusqueda },
      });
      setUsuarios(respuesta.data.datos);
    } catch (problema) {
      setError(problema.response?.data?.mensaje || "No fue posible cargar los usuarios");
    }
  }

  function actualizarCampo(evento) {
    const { name, value } = evento.target;
    setFormulario({ ...formulario, [name]: value });
  }

  function comenzarEdicion(usuario) {
    setFormulario({
      rol_id: String(usuario.rol_id),
      nombre: usuario.nombre || "",
      correo: usuario.correo || "",
      password: "",
    });
    setUsuarioEditando(usuario.usuario_id);
    setMensaje("");
    setError("");
  }

  function limpiarFormulario() {
    setFormulario({ ...USUARIO_VACIO });
    setUsuarioEditando(null);
  }

  async function guardarUsuario(evento) {
    evento.preventDefault();
    setMensaje("");
    setError("");

    const datosUsuario = {
      rol_id: formulario.rol_id,
      nombre: formulario.nombre,
      correo: formulario.correo,
    };

    if (!usuarioEditando) {
      datosUsuario.password = formulario.password;
    }

    try {
      if (usuarioEditando) {
        await api.put(`/usuarios/${usuarioEditando}`, datosUsuario);
        setMensaje("Usuario actualizado correctamente");
      } else {
        await api.post("/usuarios", datosUsuario);
        setMensaje("Usuario registrado correctamente");
      }

      limpiarFormulario();
      await cargarUsuarios();
    } catch (problema) {
      setError(problema.response?.data?.mensaje || "No fue posible guardar el usuario");
    }
  }

  async function cambiarEstado(usuario) {
    const nuevoEstado = usuario.activo ? 0 : 1;
    const accion = usuario.activo ? "desactivar" : "activar";

    if (!window.confirm(`¿Desea ${accion} este usuario?`)) {
      return;
    }

    setMensaje("");
    setError("");

    try {
      await api.patch(`/usuarios/${usuario.usuario_id}/estado`, {
        activo: nuevoEstado,
      });
      setMensaje(`Usuario ${usuario.activo ? "desactivado" : "activado"} correctamente`);
      await cargarUsuarios();
    } catch (problema) {
      setError(problema.response?.data?.mensaje || "No fue posible cambiar el estado del usuario");
    }
  }

  function buscarUsuarios(evento) {
    evento.preventDefault();
    setMensaje("");
    setError("");
    cargarUsuarios(busqueda);
  }

  return (
    <section>
      <div className="titulo-pagina">
        <div>
          <h1>Gestión de usuarios</h1>
          <p>Consulta, registra y actualiza las cuentas del sistema.</p>
        </div>
      </div>

      <form className="busqueda" onSubmit={buscarUsuarios}>
        <input
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar por nombre o correo"
        />
        <button type="submit">Buscar</button>
      </form>

      <form className="tarjeta formulario" onSubmit={guardarUsuario}>
        <h2>{usuarioEditando ? "Editar usuario" : "Nuevo usuario"}</h2>

        <Campo etiqueta="Rol">
          <select name="rol_id" value={formulario.rol_id} onChange={actualizarCampo}>
            <option value="1">Administrador</option>
            <option value="2">Usuario de ventas</option>
          </select>
        </Campo>

        <Campo etiqueta="Nombre">
          <input name="nombre" value={formulario.nombre} onChange={actualizarCampo} required />
        </Campo>

        <Campo etiqueta="Correo">
          <input
            name="correo"
            type="email"
            value={formulario.correo}
            onChange={actualizarCampo}
            required
          />
        </Campo>

        {!usuarioEditando && (
          <Campo etiqueta="Contraseña inicial">
            <input
              name="password"
              type="password"
              minLength="8"
              value={formulario.password}
              onChange={actualizarCampo}
              required
            />
          </Campo>
        )}

        {error && <div className="mensaje-error">{error}</div>}
        {mensaje && <div className="mensaje-exito">{mensaje}</div>}

        <div className="acciones-formulario">
          <button type="submit">
            {usuarioEditando ? "Guardar cambios" : "Registrar usuario"}
          </button>
          {usuarioEditando && (
            <button type="button" className="secundario" onClick={limpiarFormulario}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="tabla-contenedor">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => (
              <tr key={usuario.usuario_id}>
                <td>{usuario.nombre}</td>
                <td>{usuario.correo}</td>
                <td>{usuario.rol}</td>
                <td>{usuario.activo ? "Activo" : "Inactivo"}</td>
                <td className="acciones-tabla">
                  <button type="button" onClick={() => comenzarEdicion(usuario)}>
                    Editar
                  </button>
                  <button type="button" className="secundario" onClick={() => cambiarEstado(usuario)}>
                    {usuario.activo ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan="5">No se encontraron usuarios.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}


export default Usuarios;
