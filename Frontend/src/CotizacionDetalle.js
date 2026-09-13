import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import api from "./api";
import { descargarPdf, prepararPdf } from "./Pdf";


const ESTADOS_MANUALES = ["Borrador", "Enviada", "Pendiente", "Vencida"];


function CotizacionDetalle() {
  const { id } = useParams();
  const [cotizacion, setCotizacion] = useState(null);
  const [cantidades, setCantidades] = useState({});
  const [estado, setEstado] = useState("Pendiente");
  const [observacionEstado, setObservacionEstado] = useState("");
  const [observacionResultado, setObservacionResultado] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  function aplicar(datos) {
    setCotizacion(datos);

    if (ESTADOS_MANUALES.includes(datos.estado)) {
      setEstado(datos.estado);
    } else {
      setEstado("Pendiente");
    }

    const nuevasCantidades = {};
    datos.items.forEach((item) => {
      nuevasCantidades[item.detalle_id] = item.cantidad_aceptada ?? item.cantidad;
    });
    setCantidades(nuevasCantidades);
  }

  useEffect(() => {
    api.get(`/cotizaciones/${id}`)
      .then((respuesta) => aplicar(respuesta.data.datos))
      .catch((problema) => {
        setError(problema.response?.data?.mensaje || "No fue posible abrir la cotización");
      });
  }, [id]);

  async function generarPdf() {
    setError("");
    setMensaje("");

    if (!cotizacion.empresa) {
      setError("Falta configurar la empresa antes de generar el PDF");
      return;
    }

    setProcesando(true);
    try {
      const archivo = await prepararPdf(cotizacion);
      const respuesta = await api.post(`/cotizaciones/${id}/emitir`);
      aplicar(respuesta.data.datos);
      descargarPdf(archivo, respuesta.data.datos.folio);
      setMensaje("PDF descargado correctamente");
    } catch (problema) {
      setError(problema.response?.data?.mensaje || "No fue posible generar el PDF");
    } finally {
      setProcesando(false);
    }
  }

  async function guardarEstado(evento) {
    evento.preventDefault();
    setError("");
    setMensaje("");
    setProcesando(true);

    try {
      const respuesta = await api.patch(`/cotizaciones/${id}/estado`, {
        estado,
        observacion: observacionEstado,
      });
      aplicar(respuesta.data.datos);
      setObservacionEstado("");
      setMensaje("Estado actualizado correctamente");
    } catch (problema) {
      setError(problema.response?.data?.mensaje || "No fue posible actualizar el estado");
    } finally {
      setProcesando(false);
    }
  }

  async function guardarResultado(evento) {
    evento.preventDefault();
    setError("");
    setMensaje("");
    setProcesando(true);

    try {
      const items = cotizacion.items.map((item) => ({
        detalle_id: item.detalle_id,
        cantidad_aceptada: cantidades[item.detalle_id],
      }));
      const respuesta = await api.put(`/cotizaciones/${id}/resultado`, {
        items,
        observacion: observacionResultado,
      });
      aplicar(respuesta.data.datos);
      setObservacionResultado("");
      setMensaje("Resultado registrado correctamente");
    } catch (problema) {
      setError(problema.response?.data?.mensaje || "No fue posible registrar el resultado");
    } finally {
      setProcesando(false);
    }
  }

  if (!cotizacion) {
    return <p>{error || "Cargando cotización..."}</p>;
  }

  const montoAceptado = cotizacion.items.reduce((total, item) => {
    const cantidad = Number(item.cantidad_aceptada || 0);
    return total + cantidad * Number(item.precio_unitario);
  }, 0);

  return (
    <section>
      <div className="titulo-pagina">
        <div>
          <Link className="volver" to="/cotizaciones">← Cotizaciones</Link>
          <h1>{cotizacion.folio} · Detalle y seguimiento</h1>
          <p>{cotizacion.cliente}</p>
        </div>
        <div className="acciones-formulario">
          {cotizacion.estado === "Borrador" && (
            <Link className="boton-enlace secundario" to={`/cotizaciones/${id}/editar`}>
              Editar
            </Link>
          )}
          <button type="button" onClick={generarPdf} disabled={procesando}>
            {procesando ? "Procesando..." : "Generar y descargar PDF"}
          </button>
        </div>
      </div>

      {error && <div className="mensaje-error">{error}</div>}
      {mensaje && <div className="mensaje-exito">{mensaje}</div>}

      <div className="detalle-layout">
        <div className="detalle-principal">
          <section className="tarjeta datos-cotizacion">
            <div><span>Cliente</span><strong>{cotizacion.cliente}</strong></div>
            <div><span>Fecha de emisión</span><strong>{cotizacion.fecha_emision}</strong></div>
            <div><span>Fecha de vencimiento</span><strong>{cotizacion.fecha_vencimiento || "Sin fecha"}</strong></div>
            <div>
              <span>Estado actual</span>
              <strong><span className="etiqueta-estado" data-estado={cotizacion.estado}>{cotizacion.estado}</span></strong>
            </div>
          </section>

          <div className="tabla-contenedor">
            <table>
              <thead>
                <tr>
                  <th>Ítem</th>
                  <th>Cantidad</th>
                  <th>Precio</th>
                  <th>Subtotal</th>
                  <th>Cantidad aceptada</th>
                </tr>
              </thead>
              <tbody>
                {cotizacion.items.map((item) => (
                  <tr key={item.detalle_id}>
                    <td>{item.descripcion_aplicada}</td>
                    <td>{Number(item.cantidad)}</td>
                    <td>{cotizacion.moneda} {Number(item.precio_unitario).toLocaleString("es-CL")}</td>
                    <td>{cotizacion.moneda} {Number(item.subtotal).toLocaleString("es-CL")}</td>
                    <td>
                      <input
                        aria-label={`Cantidad aceptada de ${item.descripcion_aplicada}`}
                        type="number"
                        min="0"
                        max={item.cantidad}
                        step="0.001"
                        value={cantidades[item.detalle_id]}
                        onChange={(evento) => setCantidades({
                          ...cantidades,
                          [item.detalle_id]: evento.target.value,
                        })}
                        disabled={cotizacion.estado === "Borrador"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="tarjeta totales-detalle">
            <p><span>Valor neto</span><strong>{cotizacion.moneda} {Number(cotizacion.valor_neto).toLocaleString("es-CL")}</strong></p>
            <p><span>IVA</span><strong>{cotizacion.moneda} {Number(cotizacion.iva).toLocaleString("es-CL")}</strong></p>
            <p><span>Total</span><strong>{cotizacion.moneda} {Number(cotizacion.total).toLocaleString("es-CL")}</strong></p>
            <p className="monto-aceptado"><span>Monto neto aceptado</span><strong>{cotizacion.moneda} {montoAceptado.toLocaleString("es-CL")}</strong></p>
          </section>

          {cotizacion.estado !== "Borrador" && (
            <form className="tarjeta seguimiento" onSubmit={guardarResultado}>
              <h2>Registrar resultado</h2>
              <p>Use cero para descartar un ítem, la cantidad completa para aceptarlo o un valor intermedio para registrar una aceptación parcial.</p>
              <textarea
                value={observacionResultado}
                onChange={(evento) => setObservacionResultado(evento.target.value)}
                placeholder="Observación del resultado"
              />
              <button type="submit" disabled={procesando}>Guardar resultado de los ítems</button>
            </form>
          )}
        </div>

        <aside className="detalle-lateral">
          <form className="tarjeta seguimiento" onSubmit={guardarEstado}>
            <h2>Actualizar estado</h2>
            <label>
              Nuevo estado
              <select value={estado} onChange={(evento) => setEstado(evento.target.value)}>
                <option>Borrador</option>
                <option>Enviada</option>
                <option>Pendiente</option>
                <option>Vencida</option>
              </select>
            </label>
            <label>
              Motivo del cambio
              <textarea
                value={observacionEstado}
                onChange={(evento) => setObservacionEstado(evento.target.value)}
                placeholder="Escriba una observación"
                required
              />
            </label>
            <button type="submit" disabled={procesando}>Actualizar estado</button>
          </form>

          <section className="tarjeta historial">
            <h2>Historial de estados</h2>
            <ol>
              {cotizacion.historial.map((item) => (
                <li key={item.historial_id}>
                  <strong>{item.estado_anterior || "Inicio"} → {item.estado_nuevo}</strong>
                  <span>{item.fecha_cambio} · {item.usuario}</span>
                  {item.observacion && <p>{item.observacion}</p>}
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </section>
  );
}


export default CotizacionDetalle;
