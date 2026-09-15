import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "./api";


const ESTADOS = [
  { nombre: "Borrador", etiqueta: "Borradores" },
  { nombre: "Enviada", etiqueta: "Enviadas" },
  { nombre: "Aceptada", etiqueta: "Aceptadas" },
  { nombre: "Rechazada", etiqueta: "Rechazadas" },
  { nombre: "Parcialmente aceptada", etiqueta: "Parcialmente aceptadas" },
  { nombre: "Vencida", etiqueta: "Vencidas" },
];


function dinero(valor, moneda) {
  return `${moneda} ${Number(valor).toLocaleString("es-CL")}`;
}


function Dashboard() {
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/dashboard/resumen")
      .then((respuesta) => setResumen(respuesta.data.datos))
      .catch((problema) => {
        setError(problema.response?.data?.mensaje || "No fue posible cargar el panel");
      });
  }, []);

  if (error) {
    return <div className="mensaje-error">{error}</div>;
  }

  if (!resumen) {
    return <p>Cargando indicadores...</p>;
  }

  function obtenerEstado(nombre) {
    const registros = resumen.por_estado.filter((item) => item.estado === nombre);
    return {
      cantidad: registros.reduce((total, item) => total + Number(item.cantidad), 0),
      montos: registros,
    };
  }

  return (
    <section>
      <div className="titulo-pagina">
        <div>
          <h1>Dashboard</h1>
          <p>Resumen de tus cotizaciones y actividad reciente.</p>
        </div>
        <Link className="boton-enlace" to="/cotizaciones/nueva">
          Nueva cotización
        </Link>
      </div>

      <section className="resumen-principal">
        <div>
          <span>Monto total cotizado este mes</span>
          {resumen.monto_mes.length === 0 ? (
            <strong>CLP 0</strong>
          ) : (
            resumen.monto_mes.map((item) => (
              <strong key={item.moneda}>{dinero(item.monto, item.moneda)}</strong>
            ))
          )}
        </div>
        <div>
          <span>Cotizaciones creadas este mes</span>
          <strong>{resumen.total_cotizaciones_mes}</strong>
        </div>
      </section>

      <div className="indicadores indicadores-estados">
        {ESTADOS.map((estado) => {
          const datos = obtenerEstado(estado.nombre);
          return (
            <article className="tarjeta indicador" data-estado={estado.nombre} key={estado.nombre}>
              <span>{estado.etiqueta}</span>
              <strong>{datos.cantidad}</strong>
              {datos.montos.length === 0 ? (
                <small>CLP 0</small>
              ) : (
                datos.montos.map((item) => (
                  <small key={item.moneda}>{dinero(item.monto, item.moneda)}</small>
                ))
              )}
            </article>
          );
        })}
      </div>

      <section className="tarjeta panel-recientes">
        <div className="encabezado-panel">
          <div>
            <h2>Cotizaciones recientes</h2>
            <p>Últimas cinco cotizaciones actualizadas.</p>
          </div>
          <Link className="enlace-simple" to="/cotizaciones">Ver todas</Link>
        </div>

        <div className="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th>Folio</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {resumen.recientes.map((cotizacion) => (
                <tr key={cotizacion.cotizacion_id}>
                  <td data-label="Folio"><strong>{cotizacion.folio}</strong></td>
                  <td data-label="Cliente">{cotizacion.cliente}</td>
                  <td data-label="Fecha">{cotizacion.fecha_emision}</td>
                  <td data-label="Total">{dinero(cotizacion.total, cotizacion.moneda)}</td>
                  <td data-label="Estado">
                    <span className="etiqueta-estado" data-estado={cotizacion.estado}>{cotizacion.estado}</span>
                  </td>
                  <td data-label="Acción">
                    <Link className="enlace-simple" to={`/cotizaciones/${cotizacion.cotizacion_id}`}>Ver</Link>
                  </td>
                </tr>
              ))}
              {resumen.recientes.length === 0 && (
                <tr>
                  <td colSpan="6">Todavía no existen cotizaciones.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}


export default Dashboard;
