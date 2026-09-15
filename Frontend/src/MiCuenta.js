import { useEffect, useState } from "react";

import api from "./api";
import Campo from "./catalogos/Campo";


const EMPRESA_VACIA = {
  razon_social: "",
  rut: "",
  direccion: "",
  correo: "",
  telefono: "",
  logo_url: "",
};


function MiCuenta({ usuario, onUsuarioActualizado }) {
  const [perfil, setPerfil] = useState({ nombre: usuario.nombre, correo: usuario.correo });
  const [empresa, setEmpresa] = useState({ ...EMPRESA_VACIA });
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [logo, setLogo] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/empresa")
      .then((respuesta) => {
        if (respuesta.data.datos) {
          setEmpresa(respuesta.data.datos);
        }
      })
      .catch((problema) => {
        setError(problema.response?.data?.mensaje || "No fue posible cargar los datos de la empresa");
      });
  }, []);

  function actualizarPerfil(evento) {
    setPerfil({ ...perfil, [evento.target.name]: evento.target.value });
  }

  function actualizarEmpresa(evento) {
    setEmpresa({ ...empresa, [evento.target.name]: evento.target.value });
  }

  async function guardarPerfil(evento) {
    evento.preventDefault();
    setMensaje("");
    setError("");
    try {
      const respuesta = await api.put("/auth/cuenta", perfil);
      onUsuarioActualizado(respuesta.data.usuario);
      setMensaje(respuesta.data.mensaje);
    } catch (problema) {
      setError(problema.response?.data?.mensaje || "No fue posible actualizar la cuenta");
    }
  }

  async function guardarPassword(evento) {
    evento.preventDefault();
    setMensaje("");
    setError("");

    if (password !== confirmacion) {
      setError("Las contraseñas no coinciden");
      return;
    }

    try {
      const respuesta = await api.put("/auth/cuenta/password", { password });
      setPassword("");
      setConfirmacion("");
      setMensaje(respuesta.data.mensaje);
    } catch (problema) {
      setError(problema.response?.data?.mensaje || "No fue posible cambiar la contraseña");
    }
  }

  async function guardarEmpresa(evento) {
    evento.preventDefault();
    setMensaje("");
    setError("");

    try {
      const respuesta = await api.put("/empresa", empresa);
      let empresaGuardada = respuesta.data.datos;

      if (logo) {
        const formularioLogo = new FormData();
        formularioLogo.append("logo", logo);
        const respuestaLogo = await api.post("/empresa/logo", formularioLogo);
        empresaGuardada = { ...empresaGuardada, logo_url: respuestaLogo.data.logo_url };
      }

      setEmpresa(empresaGuardada);
      setLogo(null);
      setMensaje("Datos de empresa guardados correctamente");
    } catch (problema) {
      setError(problema.response?.data?.mensaje || "No fue posible guardar los datos de la empresa");
    }
  }

  return (
    <section>
      <div className="titulo-pagina">
        <div>
          <h1>Mi cuenta</h1>
          <p>Actualiza tus datos personales y la información utilizada en las cotizaciones.</p>
        </div>
      </div>

      {error && <div className="mensaje-error">{error}</div>}
      {mensaje && <div className="mensaje-exito">{mensaje}</div>}

      <div className="cuenta-columnas">
        <div>
          <form className="tarjeta formulario formulario-cuenta" onSubmit={guardarPerfil}>
            <h2>Datos personales</h2>
            <Campo etiqueta="Nombre">
              <input name="nombre" value={perfil.nombre} onChange={actualizarPerfil} required />
            </Campo>
            <Campo etiqueta="Correo">
              <input name="correo" type="email" value={perfil.correo} onChange={actualizarPerfil} required />
            </Campo>
            <button type="submit">Guardar datos</button>
          </form>

          <form className="tarjeta formulario formulario-cuenta" onSubmit={guardarPassword}>
            <h2>Cambiar contraseña</h2>
            <Campo etiqueta="Nueva contraseña">
              <input type="password" minLength="8" value={password} onChange={(evento) => setPassword(evento.target.value)} required />
            </Campo>
            <Campo etiqueta="Confirmar contraseña">
              <input type="password" minLength="8" value={confirmacion} onChange={(evento) => setConfirmacion(evento.target.value)} required />
            </Campo>
            <button type="submit">Cambiar contraseña</button>
          </form>
        </div>

        <form className="tarjeta formulario formulario-cuenta" onSubmit={guardarEmpresa}>
          <h2>Datos de la empresa</h2>
          <p>Esta información se utiliza en las cotizaciones y en el PDF.</p>

          {empresa.logo_url && (
            <img className="vista-logo" src={`${empresa.logo_url}?v=${Date.now()}`} alt="Logo actual de la empresa" />
          )}

          <Campo etiqueta="Logo">
            <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(evento) => setLogo(evento.target.files[0] || null)} />
          </Campo>
          <Campo etiqueta="Razón social">
            <input name="razon_social" value={empresa.razon_social || ""} onChange={actualizarEmpresa} required />
          </Campo>
          <Campo etiqueta="RUT">
            <input name="rut" value={empresa.rut || ""} onChange={actualizarEmpresa} required />
          </Campo>
          <Campo etiqueta="Dirección">
            <input name="direccion" value={empresa.direccion || ""} onChange={actualizarEmpresa} required />
          </Campo>
          <Campo etiqueta="Correo">
            <input name="correo" type="email" value={empresa.correo || ""} onChange={actualizarEmpresa} required />
          </Campo>
          <Campo etiqueta="Teléfono">
            <input name="telefono" value={empresa.telefono || ""} onChange={actualizarEmpresa} required />
          </Campo>
          <button type="submit">Guardar empresa</button>
        </form>
      </div>
    </section>
  );
}


export default MiCuenta;
