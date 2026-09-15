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
  const [vistaPdf, setVistaPdf] = useState("");
  const [archivoPdf, setArchivoPdf] = useState(null);
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
      const cantidad = item.cantidad_aceptada === null
        ? Math.max(1, parseInt(item.cantidad, 10) || 1)
        : Math.max(0, parseInt(item.cantidad_aceptada, 10) || 0);
      nuevasCantidades[item.detalle_id] = cantidad;
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

  useEffect(() => {
    return () => {
      if (vistaPdf) {
        URL.revokeObjectURL(vistaPdf);
      }
    };
  }, [vistaPdf]);

  async function abrirVistaPrevia() {
    setError("");
    setMensaje("");

    if (!cotizacion.empresa) {
      setError("Falta configurar la empresa antes de generar el PDF");
      return;
    }

    setProcesando(true);
    try {
      const archivo = await prepararPdf(cotizacion);
      setArchivoPdf(archivo);
      setVistaPdf(URL.createObjectURL(archivo));
    } catch (problema) {
      setError("No fue posible preparar la vista previa del PDF");
    } finally {
      setProcesando(false);
    }
  }

  function cerrarVistaPrevia() {
    if (vistaPdf) {
      URL.revokeObjectURL(vistaPdf);
    }
    setVistaPdf("");
    setArchivoPdf(null);
  }

  async function descargarDesdeVista() {
    setProcesando(true);
    setError("");
    try {
      const respuesta = await api.post(`/cotizaciones/${id}/emitir`);
      aplicar(respuesta.data.datos);
      descargarPdf(archivoPdf, respuesta.data.datos.folio);
      cerrarVistaPrevia();
      setMensaje("PDF descargado correctamente");
    } catch (problema) {
      setError(problema.response?.data?.mensaje || "No fue posible descargar el PDF");
    } finally {
      setProcesando(false);
    }
  }

  async function descargarDirectamente() {
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
      setError(problema.response?.data?.mensaje || "No fue posible descargar el PDF");
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

  async function guardarCambiosItems(evento) {
    evento.preventDefault();
    setError("");
    setMensaje("");
    setProcesando(true);

    try {
      const items = cotizacion.items.map((item) => ({
        detalle_id: item.detalle_id,
        cantidad_aceptada: Number(cantidades[item.detalle_id]),
      }));
      const respuesta = await api.put(`/cotizaciones/${id}/resultado`, {
        items,
        observacion: observacionResultado,
      });
      aplicar(respuesta.data.datos);
      setObservacionResultado("");
      setMensaje("Cambios de los ítems guardados correctamente");
    } catch (problema) {
      setError(problema.response?.data?.mensaje || "No fue posible guardar los cambios de los ítems");
    } finally {
      setProcesando(false);
    }
  }

  function cambiarCantidad(item, valor) {
    const cantidadMaxima = Math.max(1, parseInt(item.cantidad, 10) || 1);
    const nuevaCantidad = Math.min(
      cantidadMaxima,
      Math.max(1, parseInt(valor, 10) || 1),
    );
    setCantidades({ ...cantidades, [item.detalle_id]: nuevaCantidad });
  }

  function marcarDescartado(item, descartado) {
    setCantidades({
      ...cantidades,
      [item.detalle_id]: descartado
        ? 0
        : Math.max(1, parseInt(item.cantidad, 10) || 1),
    });
  }

  if (!cotizacion) {
    return <p>{error || "Cargando cotización..."}</p>;
  }

  const montoAceptado = cotizacion.items.reduce((total, item) => {
    const cantidad = Number(cantidades[item.detalle_id] || 0);
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
              Editar cotización
            </Link>
          )}
          <button type="button" onClick={abrirVistaPrevia} disabled={procesando}>
            {procesando ? "Procesando..." : "Vista previa PDF"}
          </button>
          <button type="button" onClick={descargarDirectamente} disabled={procesando}>
            Descargar PDF
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

          <form onSubmit={guardarCambiosItems}>
            <div className="tabla-contenedor">
              <table>
                <thead>
                  <tr>
                    <th>Ítem</th>
                    <th>Cantidad</th>
                    <th>Precio</th>
                    <th>Subtotal</th>
                    <th>Cantidad aceptada</th>
                    <th>Descartado</th>
                  </tr>
                </thead>
                <tbody>
                  {cotizacion.items.map((item) => {
                    const descartado = Number(cantidades[item.detalle_id]) === 0;
                    return (
                      <tr key={item.detalle_id}>
                        <td data-label="Ítem">{item.descripcion_aplicada}</td>
                        <td data-label="Cantidad">{Number(item.cantidad)}</td>
                        <td data-label="Precio">{cotizacion.moneda} {Number(item.precio_unitario).toLocaleString("es-CL")}</td>
                        <td data-label="Subtotal">{cotizacion.moneda} {Number(item.subtotal).toLocaleString("es-CL")}</td>
                        <td data-label="Cantidad aceptada">
                          <input
                            className="cantidad-aceptada"
                            aria-label={`Cantidad aceptada de ${item.descripcion_aplicada}`}
                            type="number"
                            min="1"
                            max={Number(item.cantidad)}
                            step="1"
                            value={descartado ? "" : cantidades[item.detalle_id]}
                            onChange={(evento) => cambiarCantidad(item, evento.target.value)}
                            disabled={cotizacion.estado === "Borrador" || descartado}
                          />
                        </td>
                        <td data-label="Descartado">
                          <label className="control-descartado">
                            <input
                              type="checkbox"
                              checked={descartado}
                              onChange={(evento) => marcarDescartado(item, evento.target.checked)}
                              disabled={cotizacion.estado === "Borrador"}
                            />
                            Descartar
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {cotizacion.estado !== "Borrador" && (
              <div className="tarjeta cambios-items">
                <label>
                  Observación de los cambios
                  <textarea
                    value={observacionResultado}
                    onChange={(evento) => setObservacionResultado(evento.target.value)}
                    placeholder="Ejemplo: el cliente descartó un producto"
                  />
                </label>
                <button type="submit" disabled={procesando}>Guardar cambios</button>
              </div>
            )}
          </form>

          <section className="tarjeta totales-detalle">
            <p><span>Valor neto</span><strong>{cotizacion.moneda} {Number(cotizacion.valor_neto).toLocaleString("es-CL")}</strong></p>
            <p><span>IVA</span><strong>{cotizacion.moneda} {Number(cotizacion.iva).toLocaleString("es-CL")}</strong></p>
            <p><span>Total</span><strong>{cotizacion.moneda} {Number(cotizacion.total).toLocaleString("es-CL")}</strong></p>
            <p className="monto-aceptado"><span>Monto neto aceptado</span><strong>{cotizacion.moneda} {montoAceptado.toLocaleString("es-CL")}</strong></p>
          </section>
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

      {vistaPdf && (
        <div className="modal-pdf" role="dialog" aria-modal="true" aria-label="Vista previa de la cotización">
          <div className="modal-pdf-contenido">
            <div className="modal-pdf-cabecera">
              <h2>Vista previa PDF</h2>
              <button type="button" className="secundario" onClick={cerrarVistaPrevia}>Cerrar</button>
            </div>
            <iframe src={vistaPdf} title="Vista previa de la cotización en PDF" />
            <div className="modal-pdf-acciones">
              <button type="button" onClick={descargarDesdeVista} disabled={procesando}>
                Generar y descargar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


export default CotizacionDetalle;
