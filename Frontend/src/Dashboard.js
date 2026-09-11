import { useEffect, useState } from "react";

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

  return (
    <section>
      <div className="titulo-pagina">
        <div>
          <h1>Dashboard</h1>
          <p>Resumen del seguimiento de cotizaciones.</p>
        </div>
      </div>

      <div className="indicadores">
        <article className="tarjeta indicador">
          <span>Total de cotizaciones</span>
          <strong>{resumen.total_cotizaciones}</strong>
        </article>

        <article className="tarjeta indicador">
          <span>Ítems descartados</span>
          <strong>{resumen.items_descartados}</strong>
        </article>

        {resumen.aceptado_por_moneda.map((item) => (
          <article className="tarjeta indicador" key={item.moneda}>
            <span>Neto aceptado en {item.moneda}</span>
            <strong>{item.moneda} {Number(item.neto_aceptado).toLocaleString("es-CL")}</strong>
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
