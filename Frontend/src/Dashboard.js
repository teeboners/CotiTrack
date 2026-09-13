import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "./api";


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

  const montosPorMoneda = {};
  resumen.por_estado.forEach((item) => {
    montosPorMoneda[item.moneda] =
      (montosPorMoneda[item.moneda] || 0) + Number(item.monto);
  });

  return (
    <section>
      <div className="titulo-pagina">
        <div>
          <h1>Dashboard</h1>
          <p>Resumen del seguimiento de cotizaciones.</p>
        </div>
        <Link className="boton-enlace" to="/cotizaciones/nueva">
          Nueva cotización
        </Link>
      </div>

      <section className="resumen-principal">
        <div>
          <span>Monto total cotizado</span>
          {Object.entries(montosPorMoneda).length === 0 ? (
            <strong>Sin cotizaciones</strong>
          ) : (
            Object.entries(montosPorMoneda).map(([moneda, monto]) => (
              <strong key={moneda}>{moneda} {monto.toLocaleString("es-CL")}</strong>
            ))
          )}
        </div>
        <div>
          <span>Total de cotizaciones</span>
          <strong>{resumen.total_cotizaciones}</strong>
        </div>
      </section>

      <div className="indicadores">
        {resumen.por_estado.map((item) => (
          <article className="tarjeta indicador" key={`${item.estado}-${item.moneda}`}>
            <span className="etiqueta-estado" data-estado={item.estado}>
              {item.estado}
            </span>
            <strong>{item.cantidad}</strong>
            <small>{item.moneda} {Number(item.monto).toLocaleString("es-CL")}</small>
          </article>
        ))}

        <article className="tarjeta indicador indicador-descartados">
          <span>Ítems descartados</span>
          <strong>{resumen.items_descartados}</strong>
          <small>Resultado registrado con cantidad cero</small>
        </article>

        {resumen.aceptado_por_moneda.map((item) => (
          <article className="tarjeta indicador indicador-aceptado" key={item.moneda}>
            <span>Neto aceptado en {item.moneda}</span>
            <strong>{item.moneda} {Number(item.neto_aceptado).toLocaleString("es-CL")}</strong>
            <small>Monto aceptado por los clientes</small>
          </article>
        ))}
      </div>

      <section className="tarjeta panel-estados">
        <h2>Cotizaciones por estado y moneda</h2>
        {resumen.por_estado.length === 0 ? (
          <p>Todavía no existen cotizaciones.</p>
        ) : (
          <div className="tabla-contenedor">
            <table>
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Moneda</th>
                  <th>Cantidad</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {resumen.por_estado.map((item) => (
                  <tr key={`${item.estado}-${item.moneda}`}>
                    <td>{item.estado}</td>
                    <td>{item.moneda}</td>
                    <td>{item.cantidad}</td>
                    <td>{item.moneda} {Number(item.monto).toLocaleString("es-CL")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}


export default Dashboard;
