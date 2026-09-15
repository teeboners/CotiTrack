import React from "react";
import { Document, Image, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";


const estilos = StyleSheet.create({
  pagina: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#10263d" },
  encabezado: { flexDirection: "row", justifyContent: "space-between", paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: "#245b88" },
  empresa: { flexDirection: "row", alignItems: "flex-start", maxWidth: "62%" },
  logo: { width: 54, height: 54, objectFit: "contain", marginRight: 10 },
  titulo: { fontSize: 18, color: "#245b88", marginBottom: 6 },
  derecha: { textAlign: "right" },
  bloque: { marginTop: 16 },
  fila: { flexDirection: "row", padding: 7, borderBottomWidth: 1, borderBottomColor: "#dce4ec" },
  cabecera: { backgroundColor: "#245b88", color: "white" },
  descripcion: { width: "46%" },
  numero: { width: "18%", textAlign: "right" },
  totales: { width: 220, marginTop: 16, marginLeft: "auto" },
  totalFila: { flexDirection: "row", justifyContent: "space-between", padding: 6 },
  totalFinal: { backgroundColor: "#245b88", color: "white" },
  pie: { position: "absolute", bottom: 20, left: 36, right: 36, fontSize: 7, color: "#65788b" },
});


function dinero(valor, moneda) {
  return `${moneda} ${Number(valor).toLocaleString("es-CL")}`;
}


function CotizacionPDF({ cotizacion }) {
  const empresa = cotizacion.empresa;
  const logo = empresa.logo_url && empresa.logo_url.startsWith("/")
    ? `${window.location.origin}${empresa.logo_url}`
    : empresa.logo_url;

  return (
    <Document title={`Cotización ${cotizacion.folio}`}>
      <Page size="A4" style={estilos.pagina}>
        <View style={estilos.encabezado}>
          <View style={estilos.empresa}>
            {logo && <Image style={estilos.logo} src={logo} />}
            <View>
              <Text style={estilos.titulo}>{empresa.razon_social}</Text>
              <Text>RUT: {empresa.rut}</Text>
              <Text>{empresa.direccion}</Text>
              <Text>{empresa.correo} · {empresa.telefono}</Text>
            </View>
          </View>
          <View style={estilos.derecha}>
            <Text>COTIZACIÓN</Text>
            <Text style={estilos.titulo}>{cotizacion.folio}</Text>
            <Text>Emisión: {cotizacion.fecha_emision}</Text>
            <Text>Vencimiento: {cotizacion.fecha_vencimiento || "No indicada"}</Text>
          </View>
        </View>

        <View style={estilos.bloque}>
          <Text>Cliente: {cotizacion.cliente}</Text>
          <Text>RUT: {cotizacion.cliente_rut || "No informado"}</Text>
          <Text>Moneda: {cotizacion.moneda}</Text>
        </View>

        <View style={[estilos.fila, estilos.cabecera, estilos.bloque]}>
          <Text style={estilos.descripcion}>Producto o servicio</Text>
          <Text style={estilos.numero}>Cantidad</Text>
          <Text style={estilos.numero}>Precio</Text>
          <Text style={estilos.numero}>Subtotal</Text>
        </View>

        {cotizacion.items.map((item) => (
          <View key={item.detalle_id} style={estilos.fila} wrap={false}>
            <Text style={estilos.descripcion}>{item.descripcion_aplicada}</Text>
            <Text style={estilos.numero}>{Number(item.cantidad)}</Text>
            <Text style={estilos.numero}>{dinero(item.precio_unitario, cotizacion.moneda)}</Text>
            <Text style={estilos.numero}>{dinero(item.subtotal, cotizacion.moneda)}</Text>
          </View>
        ))}

        <View style={estilos.totales} wrap={false}>
          <View style={estilos.totalFila}>
            <Text>Neto</Text><Text>{dinero(cotizacion.valor_neto, cotizacion.moneda)}</Text>
          </View>
          <View style={estilos.totalFila}>
            <Text>IVA 19%</Text><Text>{dinero(cotizacion.iva, cotizacion.moneda)}</Text>
          </View>
          <View style={[estilos.totalFila, estilos.totalFinal]}>
            <Text>Total</Text><Text>{dinero(cotizacion.total, cotizacion.moneda)}</Text>
          </View>
        </View>

        <View style={estilos.bloque}>
          <Text>Condiciones comerciales</Text>
          <Text>{cotizacion.condiciones_comerciales || "Sin condiciones adicionales"}</Text>
        </View>
        <View style={estilos.bloque}>
          <Text>Observaciones</Text>
          <Text>{cotizacion.observaciones || "Sin observaciones"}</Text>
        </View>

        <Text
          style={estilos.pie}
          fixed
          render={({ pageNumber, totalPages }) => `${cotizacion.folio} · Página ${pageNumber} de ${totalPages} · Documento comercial no tributario`}
        />
      </Page>
    </Document>
  );
}


export async function prepararPdf(cotizacion) {
  return pdf(<CotizacionPDF cotizacion={cotizacion} />).toBlob();
}


export function descargarPdf(archivo, folio) {
  const direccion = URL.createObjectURL(archivo);
  const enlace = document.createElement("a");
  enlace.href = direccion;
  enlace.download = `Cotizacion_${folio}.pdf`;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(direccion), 30000);
}
