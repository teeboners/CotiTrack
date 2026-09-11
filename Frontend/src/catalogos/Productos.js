import { useEffect, useState } from "react";

import api from "../api";
import Campo from "./Campo";


const PRODUCTO_VACIO = {
  tipo: "PRODUCTO",
  nombre: "",
  descripcion: "",
  precio_referencia: 0,
};


function Productos() {
  const [productos, setProductos] = useState([]);
  const [formulario, setFormulario] = useState({ ...PRODUCTO_VACIO });
  const [productoEditando, setProductoEditando] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/productos")
      .then((respuesta) => setProductos(respuesta.data.datos))
      .catch((problema) => {
        setError(problema.response?.data?.mensaje || "No fue posible cargar los productos y servicios");
      });
  }, []);

  async function cargarProductos(textoBusqueda = busqueda) {
    try {
      const respuesta = await api.get("/productos", {
        params: { buscar: textoBusqueda },
      });
      setProductos(respuesta.data.datos);
    } catch (problema) {
      setError(problema.response?.data?.mensaje || "No fue posible cargar los productos y servicios");
    }
  }

  function actualizarCampo(evento) {
    const { name, value } = evento.target;
    setFormulario({ ...formulario, [name]: value });
  }

  function comenzarEdicion(producto) {
    setFormulario({
      tipo: producto.tipo || "PRODUCTO",
      nombre: producto.nombre || "",
      descripcion: producto.descripcion || "",
      precio_referencia: producto.precio_referencia || 0,
    });
    setProductoEditando(producto.producto_id);
    setMensaje("");
    setError("");
  }

  function limpiarFormulario() {
    setFormulario({ ...PRODUCTO_VACIO });
    setProductoEditando(null);
  }

  async function guardarProducto(evento) {
    evento.preventDefault();
    setMensaje("");
    setError("");

    try {
      if (productoEditando) {
        await api.put(`/productos/${productoEditando}`, formulario);
        setMensaje("Producto o servicio actualizado correctamente");
      } else {
        await api.post("/productos", formulario);
        setMensaje("Producto o servicio registrado correctamente");
      }

      limpiarFormulario();
      await cargarProductos();
    } catch (problema) {
      setError(problema.response?.data?.mensaje || "No fue posible guardar el producto o servicio");
    }
  }

  async function cambiarEstado(producto) {
    const nuevoEstado = producto.activo ? 0 : 1;
    const accion = producto.activo ? "desactivar" : "activar";

    if (!window.confirm(`¿Desea ${accion} este producto o servicio?`)) {
      return;
    }

    setMensaje("");
    setError("");

    try {
      await api.patch(`/productos/${producto.producto_id}/estado`, {
        activo: nuevoEstado,
      });
      setMensaje(`Registro ${producto.activo ? "desactivado" : "activado"} correctamente`);
      await cargarProductos();
    } catch (problema) {
      setError(problema.response?.data?.mensaje || "No fue posible cambiar el estado");
    }
  }

  function buscarProductos(evento) {
    evento.preventDefault();
    setMensaje("");
    setError("");
    cargarProductos(busqueda);
  }

  return (
    <section>
      <div className="titulo-pagina">
        <div>
          <h1>Productos y servicios</h1>
          <p>Consulta, registra y actualiza el catálogo comercial.</p>
        </div>
      </div>

      <form className="busqueda" onSubmit={buscarProductos}>
        <input
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar por nombre"
        />
        <button type="submit">Buscar</button>
      </form>

      <form className="tarjeta formulario" onSubmit={guardarProducto}>
        <h2>{productoEditando ? "Editar producto o servicio" : "Nuevo producto o servicio"}</h2>

        <Campo etiqueta="Tipo">
          <select name="tipo" value={formulario.tipo} onChange={actualizarCampo}>
            <option value="PRODUCTO">Producto</option>
            <option value="SERVICIO">Servicio</option>
          </select>
        </Campo>

        <Campo etiqueta="Nombre">
          <input name="nombre" value={formulario.nombre} onChange={actualizarCampo} required />
        </Campo>

        <Campo etiqueta="Descripción">
          <textarea
            name="descripcion"
            value={formulario.descripcion}
            onChange={actualizarCampo}
          />
        </Campo>

        <Campo etiqueta="Precio de referencia">
          <input
            name="precio_referencia"
            type="number"
            min="0"
            step="0.01"
            value={formulario.precio_referencia}
            onChange={actualizarCampo}
            required
          />
        </Campo>

        {error && <div className="mensaje-error">{error}</div>}
        {mensaje && <div className="mensaje-exito">{mensaje}</div>}

        <div className="acciones-formulario">
          <button type="submit">
            {productoEditando ? "Guardar cambios" : "Registrar"}
          </button>
          {productoEditando && (
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
              <th>Tipo</th>
              <th>Precio de referencia</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((producto) => (
              <tr key={producto.producto_id}>
                <td>{producto.nombre}</td>
                <td>{producto.tipo}</td>
                <td>{producto.precio_referencia}</td>
                <td>{producto.activo ? "Activo" : "Inactivo"}</td>
                <td className="acciones-tabla">
                  <button type="button" onClick={() => comenzarEdicion(producto)}>
                    Editar
                  </button>
                  <button type="button" className="secundario" onClick={() => cambiarEstado(producto)}>
                    {producto.activo ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
            {productos.length === 0 && (
              <tr>
                <td colSpan="5">No se encontraron productos o servicios.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}


export default Productos;
