import { useEffect, useState } from "react";

import api from "../api";
import Campo from "./Campo";


const CLIENTE_VACIO = {
  nombre_razon_social: "",
  rut: "",
  correo: "",
  telefono: "",
  direccion: "",
};


function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [formulario, setFormulario] = useState({ ...CLIENTE_VACIO });
  const [clienteEditando, setClienteEditando] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/clientes")
      .then((respuesta) => setClientes(respuesta.data.datos))
      .catch((problema) => {
        setError(problema.response?.data?.mensaje || "No fue posible cargar los clientes");
      });
  }, []);

  async function cargarClientes(textoBusqueda = busqueda) {
    try {
      const respuesta = await api.get("/clientes", {
        params: { buscar: textoBusqueda },
      });
      setClientes(respuesta.data.datos);
    } catch (problema) {
      setError(problema.response?.data?.mensaje || "No fue posible cargar los clientes");
    }
  }

  function actualizarCampo(evento) {
    const { name, value } = evento.target;
    setFormulario({ ...formulario, [name]: value });
  }

  function comenzarEdicion(cliente) {
    setFormulario({
      nombre_razon_social: cliente.nombre_razon_social || "",
      rut: cliente.rut || "",
      correo: cliente.correo || "",
      telefono: cliente.telefono || "",
      direccion: cliente.direccion || "",
    });
    setClienteEditando(cliente.cliente_id);
    setMostrarFormulario(true);
    setMensaje("");
    setError("");
  }

  function limpiarFormulario() {
    setFormulario({ ...CLIENTE_VACIO });
    setClienteEditando(null);
    setMostrarFormulario(false);
  }

  async function guardarCliente(evento) {
    evento.preventDefault();
    setMensaje("");
    setError("");

    try {
      if (clienteEditando) {
        await api.put(`/clientes/${clienteEditando}`, formulario);
        setMensaje("Cliente actualizado correctamente");
      } else {
        await api.post("/clientes", formulario);
        setMensaje("Cliente registrado correctamente");
      }

      limpiarFormulario();
      await cargarClientes();
    } catch (problema) {
      setError(problema.response?.data?.mensaje || "No fue posible guardar el cliente");
    }
  }

  async function cambiarEstado(cliente) {
    const nuevoEstado = cliente.activo ? 0 : 1;
    const accion = cliente.activo ? "desactivar" : "activar";

    if (!window.confirm(`¿Desea ${accion} este cliente?`)) {
      return;
    }

    setMensaje("");
    setError("");

    try {
      await api.patch(`/clientes/${cliente.cliente_id}/estado`, {
        activo: nuevoEstado,
      });
      setMensaje(`Cliente ${cliente.activo ? "desactivado" : "activado"} correctamente`);
      await cargarClientes();
    } catch (problema) {
      setError(problema.response?.data?.mensaje || "No fue posible cambiar el estado del cliente");
    }
  }

  function buscarClientes(evento) {
    evento.preventDefault();
    setMensaje("");
    setError("");
    cargarClientes(busqueda);
  }

  return (
    <section>
      <div className="titulo-pagina">
        <div>
          <h1>Clientes</h1>
          <p>Consulta, registra y actualiza los clientes.</p>
        </div>
        <button type="button" onClick={() => {
          setFormulario({ ...CLIENTE_VACIO });
          setClienteEditando(null);
          setMostrarFormulario(true);
          setMensaje("");
          setError("");
        }}>
          Nuevo cliente
        </button>
      </div>

      <form className="busqueda" onSubmit={buscarClientes}>
        <input
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar por nombre"
        />
        <button type="submit">Buscar</button>
      </form>

      {mostrarFormulario && <form className="tarjeta formulario" onSubmit={guardarCliente}>
        <h2>{clienteEditando ? "Editar cliente" : "Nuevo cliente"}</h2>

        <Campo etiqueta="Nombre o razón social">
          <input
            name="nombre_razon_social"
            value={formulario.nombre_razon_social}
            onChange={actualizarCampo}
            required
          />
        </Campo>

        <Campo etiqueta="RUT">
          <input name="rut" value={formulario.rut} onChange={actualizarCampo} />
        </Campo>

        <Campo etiqueta="Correo">
          <input
            name="correo"
            type="email"
            value={formulario.correo}
            onChange={actualizarCampo}
          />
        </Campo>

        <Campo etiqueta="Teléfono">
          <input name="telefono" value={formulario.telefono} onChange={actualizarCampo} />
        </Campo>

        <Campo etiqueta="Dirección">
          <input name="direccion" value={formulario.direccion} onChange={actualizarCampo} />
        </Campo>

        {error && <div className="mensaje-error">{error}</div>}
        {mensaje && <div className="mensaje-exito">{mensaje}</div>}

        <div className="acciones-formulario">
          <button type="submit">
            {clienteEditando ? "Guardar cambios" : "Registrar cliente"}
          </button>
          <button type="button" className="secundario" onClick={limpiarFormulario}>
            Cancelar
          </button>
        </div>
      </form>}

      <div className="tabla-contenedor tabla-catalogo">
        <table>
          <thead>
            <tr>
              <th>Nombre o razón social</th>
              <th>RUT</th>
              <th>Correo</th>
              <th>Teléfono</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((cliente) => (
              <tr key={cliente.cliente_id}>
                <td data-label="Nombre"><strong>{cliente.nombre_razon_social}</strong></td>
                <td data-label="RUT">{cliente.rut || "—"}</td>
                <td data-label="Correo">{cliente.correo || "—"}</td>
                <td data-label="Teléfono">{cliente.telefono || "—"}</td>
                <td data-label="Estado"><span className={`etiqueta-activo ${cliente.activo ? "activo" : "inactivo"}`}>{cliente.activo ? "Activo" : "Inactivo"}</span></td>
                <td data-label="Acciones" className="acciones-tabla">
                  <button type="button" className="boton-tabla" onClick={() => comenzarEdicion(cliente)}>
                    Editar
                  </button>
                  <button type="button" className="boton-tabla peligro" onClick={() => cambiarEstado(cliente)}>
                    {cliente.activo ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td colSpan="6">No se encontraron clientes.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}


export default Clientes;
