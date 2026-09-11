import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "./api";


function Cotizaciones() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [filtros, setFiltros] = useState({
    folio: "",
    cliente: "",
    estado: "",
    desde: "",
    hasta: "",
  });
  const [error, setError] = useState("");

  async function cargarCotizaciones() {
    try {
      setError("");
      const respuesta = await api.get("/cotizaciones", { params: filtros });
      setCotizaciones(respuesta.data.datos);
    } catch (problema) {
      setError(problema.response?.data?.mensaje || "No fue posible consultar cotizaciones");
    }
  }

  useEffect(() => {
    api.get("/cotizaciones")
      .then((respuesta) => setCotizaciones(respuesta.data.datos))
      .catch((problema) => {
        setError(problema.response?.data?.mensaje || "No fue posible consultar cotizaciones");
      });
  }, []);

  function cambiarFiltro(evento) {
    const { name, value } = evento.target;
    setFiltros({ ...filtros, [name]: value });
  }

  function filtrar(evento) {
    evento.preventDefault();
    cargarCotizaciones();
  }

  return (
    <section>
      <div className="titulo-pagina">
        <div>
          <h1>Cotizaciones</h1>
          <p>Consulta y seguimiento comercial.</p>
        </div>
        <Link className="boton-enlace" to="/cotizaciones/nueva">
          Nueva cotización
        </Link>
      </div>

      <form className="filtros" onSubmit={filtrar}>
        <input name="folio" value={filtros.folio} onChange={cambiarFiltro} placeholder="Folio" />
        <input name="cliente" value={filtros.cliente} onChange={cambiarFiltro} placeholder="Cliente" />
        <select name="estado" value={filtros.estado} onChange={cambiarFiltro}>
          <option value="">Todos los estados</option>
          <option>Borrador</option>
          <option>Enviada</option>
          <option>Pendiente</option>
          <option>Aceptada</option>
          <option>Rechazada</option>
          <option>Parcialmente aceptada</option>
          <option>Vencida</option>
        </select>
        <input name="desde" type="date" value={filtros.desde} onChange={cambiarFiltro} title="Fecha desde" />
        <input name="hasta" type="date" value={filtros.hasta} onChange={cambiarFiltro} title="Fecha hasta" />
        <button type="submit">Filtrar</button>
      </form>

      {error && <div className="mensaje-error">{error}</div>}

      <div className="tabla-contenedor">
        <table>
          <thead>
            <tr>
              <th>Folio</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cotizaciones.map((cotizacion) => (
              <tr key={cotizacion.cotizacion_id}>
                <td>{cotizacion.folio}</td>
                <td>{cotizacion.cliente}</td>
                <td>{cotizacion.fecha_emision}</td>
                <td>{cotizacion.estado}</td>
                <td>
                  {cotizacion.moneda} {Number(cotizacion.total).toLocaleString("es-CL")}
                </td>
                <td className="acciones-tabla">
                  <Link to={`/cotizaciones/${cotizacion.cotizacion_id}`}>Ver detalle</Link>
                  {cotizacion.estado === "Borrador" && (
                    <Link to={`/cotizaciones/${cotizacion.cotizacion_id}/editar`}>Editar</Link>
                  )}
                </td>
              </tr>
            ))}
            {cotizaciones.length === 0 && (
              <tr>
                <td colSpan="6">No se encontraron cotizaciones.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}


export default Cotizaciones;
