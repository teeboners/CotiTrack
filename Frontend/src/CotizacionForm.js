import { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";

import api from "./api";


const hoy = new Date().toISOString().slice(0, 10);
const ITEM_VACIO = {
  producto_id: "",
  descripcion_aplicada: "",
  cantidad: 1,
  precio_unitario: 0,
};


function CotizacionForm() {
  const { id } = useParams();
  const history = useHistory();
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [formulario, setFormulario] = useState({
    cliente_id: "",
    fecha_emision: hoy,
    fecha_vencimiento: "",
    moneda: "CLP",
    condiciones_comerciales: "",
    observaciones: "",
    items: [{ ...ITEM_VACIO }],
  });
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/clientes"), api.get("/productos")])
      .then(([respuestaClientes, respuestaProductos]) => {
        setClientes(respuestaClientes.data.datos.filter((item) => item.activo));
        setProductos(respuestaProductos.data.datos.filter((item) => item.activo));
      })
      .catch(() => setError("No fue posible cargar clientes o productos"));

    if (id) {
      api.get(`/cotizaciones/${id}`)
        .then((respuesta) => {
          const datos = respuesta.data.datos;
          setFormulario({
            cliente_id: datos.cliente_id,
            fecha_emision: datos.fecha_emision,
            fecha_vencimiento: datos.fecha_vencimiento || "",
            moneda: datos.moneda,
            condiciones_comerciales: datos.condiciones_comerciales || "",
            observaciones: datos.observaciones || "",
            items: datos.items.map((item) => ({
              producto_id: item.producto_id,
              descripcion_aplicada: item.descripcion_aplicada,
              cantidad: item.cantidad,
              precio_unitario: item.precio_unitario,
            })),
          });
        })
        .catch((problema) => {
          setError(problema.response?.data?.mensaje || "No fue posible abrir el borrador");
        });
    }
  }, [id]);

  const neto = formulario.items.reduce(
    (suma, item) => suma + Number(item.cantidad || 0) * Number(item.precio_unitario || 0),
    0,
  );
  const iva = Math.round(neto * 0.19 * 100) / 100;
  const total = neto + iva;

  function cambiarGeneral(evento) {
    const { name, value } = evento.target;
    setFormulario({ ...formulario, [name]: value });
  }

  function cambiarItem(indice, campo, valor) {
    const items = formulario.items.map((item, posicion) => {
      if (posicion !== indice) {
        return item;
      }

      const itemActualizado = { ...item, [campo]: valor };

      if (campo === "producto_id") {
        const producto = productos.find(
          (opcion) => String(opcion.producto_id) === String(valor),
        );
        if (producto) {
          itemActualizado.descripcion_aplicada = producto.nombre;
          itemActualizado.precio_unitario = producto.precio_referencia;
        }
      }

      return itemActualizado;
    });

    setFormulario({ ...formulario, items });
  }

  function agregarItem() {
    setFormulario({
      ...formulario,
      items: [...formulario.items, { ...ITEM_VACIO }],
    });
  }

  function quitarItem(indice) {
    if (formulario.items.length === 1) {
      return;
    }

    setFormulario({
      ...formulario,
      items: formulario.items.filter((item, posicion) => posicion !== indice),
    });
  }

  async function guardar(evento) {
    evento.preventDefault();
    setError("");

    try {
      if (id) {
        await api.put(`/cotizaciones/${id}`, formulario);
      } else {
        await api.post("/cotizaciones", formulario);
      }
      history.push("/cotizaciones");
    } catch (problema) {
      setError(problema.response?.data?.mensaje || "No fue posible guardar el borrador");
    }
  }

  return (
    <form className="tarjeta cotizacion-form" onSubmit={guardar}>
      <h1>{id ? "Editar borrador" : "Nueva cotización"}</h1>

      <div className="formulario-grid">
        <label>
          Cliente
          <select name="cliente_id" value={formulario.cliente_id} onChange={cambiarGeneral} required>
            <option value="">Seleccionar</option>
            {clientes.map((cliente) => (
              <option key={cliente.cliente_id} value={cliente.cliente_id}>
                {cliente.nombre_razon_social}
              </option>
            ))}
          </select>
        </label>

        <label>
          Moneda
          <select name="moneda" value={formulario.moneda} onChange={cambiarGeneral}>
            <option value="CLP">CLP</option>
            <option value="USD">USD</option>
          </select>
        </label>

        <label>
          Fecha de emisión
          <input name="fecha_emision" type="date" value={formulario.fecha_emision} onChange={cambiarGeneral} required />
        </label>

        <label>
          Fecha de vencimiento
          <input name="fecha_vencimiento" type="date" value={formulario.fecha_vencimiento} onChange={cambiarGeneral} />
        </label>
      </div>

      <h2>Ítems</h2>
      {formulario.items.map((item, indice) => (
        <div className="item-cotizacion" key={indice}>
          <select
            value={item.producto_id}
            onChange={(evento) => cambiarItem(indice, "producto_id", evento.target.value)}
            required
          >
            <option value="">Producto o servicio</option>
            {productos.map((producto) => (
              <option key={producto.producto_id} value={producto.producto_id}>
                {producto.nombre}
              </option>
            ))}
          </select>
          <input
            value={item.descripcion_aplicada}
            onChange={(evento) => cambiarItem(indice, "descripcion_aplicada", evento.target.value)}
            placeholder="Descripción"
            required
          />
          <input
            type="number"
            min="0.001"
            step="0.001"
            value={item.cantidad}
            onChange={(evento) => cambiarItem(indice, "cantidad", evento.target.value)}
            required
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={item.precio_unitario}
            onChange={(evento) => cambiarItem(indice, "precio_unitario", evento.target.value)}
            required
          />
          <strong>
            {formulario.moneda} {(Number(item.cantidad || 0) * Number(item.precio_unitario || 0)).toLocaleString("es-CL")}
          </strong>
          <button type="button" className="secundario" onClick={() => quitarItem(indice)}>
            Quitar
          </button>
        </div>
      ))}

      <button type="button" onClick={agregarItem}>Agregar ítem</button>

      <div className="resumen-totales">
        <p>Neto: {formulario.moneda} {neto.toLocaleString("es-CL")}</p>
        <p>IVA 19%: {formulario.moneda} {iva.toLocaleString("es-CL")}</p>
        <strong>Total: {formulario.moneda} {total.toLocaleString("es-CL")}</strong>
      </div>

      <label>
        Condiciones comerciales
        <textarea name="condiciones_comerciales" value={formulario.condiciones_comerciales} onChange={cambiarGeneral} />
      </label>

      <label>
        Observaciones
        <textarea name="observaciones" value={formulario.observaciones} onChange={cambiarGeneral} />
      </label>

      {error && <div className="mensaje-error">{error}</div>}
      <button type="submit">Guardar borrador</button>
    </form>
  );
}


export default CotizacionForm;
