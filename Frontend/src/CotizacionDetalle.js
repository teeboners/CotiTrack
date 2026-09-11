import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import api from "./api";
import { descargarPdf, prepararPdf } from "./Pdf";


function CotizacionDetalle() {
  const { id } = useParams();
  const [cotizacion, setCotizacion] = useState(null);
  const [cantidades, setCantidades] = useState({});
  const [estado, setEstado] = useState("Pendiente");
  const [observacionEstado, setObservacionEstado] = useState("");
  const [observacionResultado, setObservacionResultado] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  function aplicar(datos) {
    setCotizacion(datos);
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

    try {
      const archivo = await prepararPdf(cotizacion);
      const respuesta = await api.post(`/cotizaciones/${id}/emitir`);
      aplicar(respuesta.data.datos);
      descargarPdf(archivo, respuesta.data.datos.folio);
      setMensaje("PDF descargado correctamente");
    } catch (problema) {
      setError(problema.response?.data?.mensaje || "No fue posible generar el PDF");
    }
  }

  async function guardarEstado(evento) {
    evento.preventDefault();
    setError("");
    setMensaje("");

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
    }
  }

  async function guardarResultado(evento) {
    evento.preventDefault();
    setError("");
    setMensaje("");

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
    }
  }

  if (!cotizacion) {
    return <p>{error || "Cargando cotización..."}</p>;
  }

  return (
    <section>
      <div className="titulo-pagina">
        <div>
          <h1>{cotizacion.folio}</h1>
          <p>{cotizacion.cliente} · {cotizacion.estado}</p>
        </div>
        <div className="acciones-formulario">
          {cotizacion.estado === "Borrador" && (
            <Link to={`/cotizaciones/${id}/editar`}>Editar</Link>
          )}
          <button type="button" onClick={generarPdf}>Generar y descargar PDF</button>
        </div>
      </div>

      {error && <div className="mensaje-error">{error}</div>}
      {mensaje && <div className="mensaje-exito">{mensaje}</div>}

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
                    type="number"
                    min="0"
                    max={item.cantidad}
                    step="0.001"
                    value={cantidades[item.detalle_id]}
                    onChange={(evento) => setCantidades({
                      ...cantidades,
                      [item.detalle_id]: evento.target.value,
                    })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cotizacion.estado !== "Borrador" && (
        <form className="tarjeta seguimiento" onSubmit={guardarResultado}>
          <h2>Registrar resultado</h2>
          <p>La cantidad cero descarta un ítem. Un valor intermedio registra aceptación parcial.</p>
          <textarea
            value={observacionResultado}
            onChange={(evento) => setObservacionResultado(evento.target.value)}
            placeholder="Observación del resultado"
          />
          <button type="submit">Guardar resultado de los ítems</button>
        </form>
      )}

      <form className="tarjeta seguimiento" onSubmit={guardarEstado}>
        <h2>Actualizar estado</h2>
        <select value={estado} onChange={(evento) => setEstado(evento.target.value)}>
          <option>Pendiente</option>
          <option>Enviada</option>
          <option>Vencida</option>
          <option>Borrador</option>
        </select>
        <textarea
          value={observacionEstado}
          onChange={(evento) => setObservacionEstado(evento.target.value)}
          placeholder="Motivo del cambio"
          required
        />
        <button type="submit">Actualizar estado</button>
      </form>

      <section className="tarjeta seguimiento">
        <h2>Historial de estados</h2>
        <ol>
          {cotizacion.historial.map((item) => (
            <li key={item.historial_id}>
              <strong>{item.estado_anterior || "Inicio"} → {item.estado_nuevo}</strong>
              <br />
              {item.fecha_cambio} · {item.usuario}
              <br />
              {item.observacion}
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}


export default CotizacionDetalle;
