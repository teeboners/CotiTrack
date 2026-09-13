import { useEffect, useState } from "react";
import { Link, useHistory, useParams } from "react-router-dom";

import api from "./api";


function obtenerFechaActual() {
  const fecha = new Date();
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${año}-${mes}-${dia}`;
}


const hoy = obtenerFechaActual();
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
  const [guardando, setGuardando] = useState(false);
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
    setGuardando(true);

    try {
      if (id) {
        await api.put(`/cotizaciones/${id}`, formulario);
      } else {
        await api.post("/cotizaciones", formulario);
      }
      history.push("/cotizaciones");
    } catch (problema) {
      setError(problema.response?.data?.mensaje || "No fue posible guardar el borrador");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section>
      <div className="titulo-pagina">
        <div>
          <Link className="volver" to="/cotizaciones">← Cotizaciones</Link>
          <h1>{id ? "Editar cotización" : "Crear cotización"}</h1>
          <p>Complete los datos y guarde el documento como borrador.</p>
        </div>
      </div>

      <form className="cotizacion-layout" onSubmit={guardar}>
        <div className="cotizacion-principal">
          <section className="tarjeta seccion-formulario">
            <h2>Información general</h2>
            <div className="formulario-grid">
              <label>
                Cliente
                <select name="cliente_id" value={formulario.cliente_id} onChange={cambiarGeneral} required>
                  <option value="">Seleccionar cliente</option>
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
                <input
                  name="fecha_vencimiento"
                  type="date"
                  min={formulario.fecha_emision}
                  value={formulario.fecha_vencimiento}
                  onChange={cambiarGeneral}
                />
              </label>
            </div>
          </section>

          <section className="tarjeta seccion-formulario">
            <div className="encabezado-seccion">
              <h2>Ítems de la cotización</h2>
              <button type="button" className="boton-texto" onClick={agregarItem}>
                + Agregar ítem
              </button>
            </div>

            <div className="encabezado-items" aria-hidden="true">
              <span>Producto o servicio</span>
              <span>Descripción</span>
              <span>Cantidad</span>
              <span>Precio unitario</span>
              <span>Subtotal</span>
              <span />
            </div>

            {formulario.items.map((item, indice) => (
              <div className="item-cotizacion" key={indice}>
                <select
                  aria-label={`Producto o servicio del ítem ${indice + 1}`}
                  value={item.producto_id}
                  onChange={(evento) => cambiarItem(indice, "producto_id", evento.target.value)}
                  required
                >
                  <option value="">Seleccionar</option>
                  {productos.map((producto) => (
                    <option key={producto.producto_id} value={producto.producto_id}>
                      {producto.nombre}
                    </option>
                  ))}
                </select>
                <input
                  aria-label={`Descripción del ítem ${indice + 1}`}
                  value={item.descripcion_aplicada}
                  onChange={(evento) => cambiarItem(indice, "descripcion_aplicada", evento.target.value)}
                  placeholder="Descripción"
                  required
                />
                <input
                  aria-label={`Cantidad del ítem ${indice + 1}`}
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={item.cantidad}
                  onChange={(evento) => cambiarItem(indice, "cantidad", evento.target.value)}
                  required
                />
                <input
                  aria-label={`Precio del ítem ${indice + 1}`}
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
                <button
                  type="button"
                  className="boton-quitar"
                  aria-label={`Quitar ítem ${indice + 1}`}
                  onClick={() => quitarItem(indice)}
                  disabled={formulario.items.length === 1}
                >
                  ×
                </button>
              </div>
            ))}
          </section>

          <section className="tarjeta seccion-formulario">
            <h2>Condiciones y observaciones</h2>
            <div className="formulario-grid">
              <label>
                Condiciones comerciales
                <textarea name="condiciones_comerciales" value={formulario.condiciones_comerciales} onChange={cambiarGeneral} />
              </label>
              <label>
                Observaciones
                <textarea name="observaciones" value={formulario.observaciones} onChange={cambiarGeneral} />
              </label>
            </div>
          </section>
        </div>

        <aside className="resumen-lateral">
          <section className="tarjeta resumen-totales">
            <h2>Resumen</h2>
            <p><span>Neto</span><strong>{formulario.moneda} {neto.toLocaleString("es-CL")}</strong></p>
            <p><span>IVA 19%</span><strong>{formulario.moneda} {iva.toLocaleString("es-CL")}</strong></p>
            <p className="total"><span>Total</span><strong>{formulario.moneda} {total.toLocaleString("es-CL")}</strong></p>

            {error && <div className="mensaje-error">{error}</div>}

            <button type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar borrador"}
            </button>
            <Link className="boton-enlace secundario" to="/cotizaciones">Cancelar</Link>
          </section>
        </aside>
      </form>
    </section>
  );
}


export default CotizacionForm;
