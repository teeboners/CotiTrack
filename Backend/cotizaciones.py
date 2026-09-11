from datetime import date, datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from uuid import uuid4

from flask import Blueprint, g, jsonify, request
from mysql.connector import Error

from auth import login_required
from database import get_connection, close_connection


cotizaciones_bp = Blueprint("cotizaciones", __name__, url_prefix="/api/cotizaciones")
DOS_DECIMALES = Decimal("0.01")
IVA = Decimal("0.19")


def convertir_json(valor):
    if isinstance(valor, dict):
        return {clave: convertir_json(contenido) for clave, contenido in valor.items()}
    if isinstance(valor, list):
        return [convertir_json(contenido) for contenido in valor]
    if isinstance(valor, Decimal):
        return str(valor)
    if isinstance(valor, (date, datetime)):
        return valor.isoformat()
    return valor


def identificador(valor, nombre):
    try:
        resultado = int(valor)
    except (TypeError, ValueError):
        raise ValueError(f"{nombre} no es válido")

    if resultado <= 0:
        raise ValueError(f"{nombre} no es válido")
    return resultado


def numero_decimal(valor, nombre, permitir_cero=True):
    try:
        numero = Decimal(str(valor))
    except (InvalidOperation, TypeError):
        raise ValueError(f"{nombre} debe ser numérico")

    if numero < 0 or (not permitir_cero and numero == 0):
        raise ValueError(f"{nombre} debe ser mayor que cero")
    return numero


def fecha_valida(valor, nombre, obligatoria=True):
    if not valor and not obligatoria:
        return None
    try:
        return date.fromisoformat(str(valor))
    except (TypeError, ValueError):
        raise ValueError(f"{nombre} no es válida")


def texto_opcional(valor):
    valor = str(valor or "").strip()
    return valor or None


def obtener_estado_id(cursor, nombre):
    cursor.execute(
        "SELECT estado_id FROM estados_cotizacion WHERE nombre = %s",
        (nombre,),
    )
    estado = cursor.fetchone()
    if estado is None:
        raise ValueError(f"No existe el estado {nombre}")
    return estado["estado_id"]


def validar_cotizacion(cursor, datos):
    cliente_id = identificador(datos.get("cliente_id"), "El cliente")
    cursor.execute(
        "SELECT cliente_id FROM clientes WHERE cliente_id = %s AND activo = 1",
        (cliente_id,),
    )
    if cursor.fetchone() is None:
        raise ValueError("Debe seleccionar un cliente activo")

    fecha_emision = fecha_valida(datos.get("fecha_emision"), "La fecha de emisión")
    fecha_vencimiento = fecha_valida(
        datos.get("fecha_vencimiento"),
        "La fecha de vencimiento",
        obligatoria=False,
    )
    if fecha_vencimiento and fecha_vencimiento < fecha_emision:
        raise ValueError("La fecha de vencimiento no puede ser anterior a la emisión")

    moneda = datos.get("moneda", "CLP")
    if moneda not in ("CLP", "USD"):
        raise ValueError("La moneda debe ser CLP o USD")

    items_recibidos = datos.get("items")
    if not isinstance(items_recibidos, list) or not items_recibidos:
        raise ValueError("La cotización debe incluir al menos un ítem")

    items = []
    neto = Decimal("0")

    for posicion, item in enumerate(items_recibidos, start=1):
        producto_id = identificador(
            item.get("producto_id"),
            f"El producto del ítem {posicion}",
        )
        cursor.execute(
            """
            SELECT producto_id, nombre
            FROM productos_servicios
            WHERE producto_id = %s AND activo = 1
            """,
            (producto_id,),
        )
        producto = cursor.fetchone()
        if producto is None:
            raise ValueError(f"El producto del ítem {posicion} no está activo")

        cantidad = numero_decimal(
            item.get("cantidad"),
            "La cantidad",
            permitir_cero=False,
        )
        precio = numero_decimal(item.get("precio_unitario"), "El precio unitario")
        descripcion = str(
            item.get("descripcion_aplicada") or producto["nombre"]
        ).strip()
        if not descripcion:
            raise ValueError(f"El ítem {posicion} necesita una descripción")

        subtotal = (cantidad * precio).quantize(DOS_DECIMALES, rounding=ROUND_HALF_UP)
        neto += subtotal
        items.append(
            {
                "producto_id": producto_id,
                "descripcion_aplicada": descripcion[:255],
                "cantidad": cantidad,
                "precio_unitario": precio,
                "subtotal": subtotal,
            }
        )

    neto = neto.quantize(DOS_DECIMALES, rounding=ROUND_HALF_UP)
    iva = (neto * IVA).quantize(DOS_DECIMALES, rounding=ROUND_HALF_UP)
    total = neto + iva

    return {
        "cliente_id": cliente_id,
        "fecha_emision": fecha_emision,
        "fecha_vencimiento": fecha_vencimiento,
        "moneda": moneda,
        "valor_neto": neto,
        "iva": iva,
        "total": total,
        "condiciones_comerciales": texto_opcional(datos.get("condiciones_comerciales")),
        "observaciones": texto_opcional(datos.get("observaciones")),
        "items": items,
    }


def consultar_detalle(cursor, cotizacion_id):
    cursor.execute(
        """
        SELECT
            q.*,
            c.nombre_razon_social AS cliente,
            c.rut AS cliente_rut,
            c.correo AS cliente_correo,
            c.telefono AS cliente_telefono,
            c.direccion AS cliente_direccion,
            u.nombre AS vendedor,
            e.nombre AS estado
        FROM cotizaciones q
        INNER JOIN clientes c ON c.cliente_id = q.cliente_id
        INNER JOIN usuarios u ON u.usuario_id = q.usuario_id
        INNER JOIN estados_cotizacion e ON e.estado_id = q.estado_id
        WHERE q.cotizacion_id = %s
        """,
        (cotizacion_id,),
    )
    cotizacion = cursor.fetchone()
    if cotizacion is None:
        return None

    cursor.execute(
        """
        SELECT
            d.detalle_id,
            d.producto_id,
            p.tipo,
            p.nombre AS producto,
            d.descripcion_aplicada,
            d.cantidad,
            d.precio_unitario,
            d.subtotal,
            d.cantidad_aceptada
        FROM detalle_cotizacion d
        INNER JOIN productos_servicios p ON p.producto_id = d.producto_id
        WHERE d.cotizacion_id = %s
        ORDER BY d.detalle_id
        """,
        (cotizacion_id,),
    )
    cotizacion["items"] = cursor.fetchall()

    cursor.execute(
        """
        SELECT
            h.historial_id,
            h.fecha_cambio,
            h.observacion,
            anterior.nombre AS estado_anterior,
            nuevo.nombre AS estado_nuevo,
            u.nombre AS usuario
        FROM historial_estados h
        LEFT JOIN estados_cotizacion anterior
            ON anterior.estado_id = h.estado_anterior_id
        INNER JOIN estados_cotizacion nuevo
            ON nuevo.estado_id = h.estado_nuevo_id
        INNER JOIN usuarios u ON u.usuario_id = h.usuario_id
        WHERE h.cotizacion_id = %s
        ORDER BY h.historial_id
        """,
        (cotizacion_id,),
    )
    cotizacion["historial"] = cursor.fetchall()

    cursor.execute(
        """
        SELECT razon_social, rut, direccion, correo, telefono, logo_url
        FROM configuracion_empresa
        WHERE activa = 1
        ORDER BY configuracion_id DESC
        LIMIT 1
        """
    )
    cotizacion["empresa"] = cursor.fetchone()
    return cotizacion


def cambiar_estado(cursor, cotizacion, nombre_nuevo, observacion):
    nuevo_id = obtener_estado_id(cursor, nombre_nuevo)
    if nuevo_id == cotizacion["estado_id"]:
        return False

    cursor.execute(
        """
        UPDATE cotizaciones
        SET estado_id = %s,
            fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE cotizacion_id = %s
        """,
        (nuevo_id, cotizacion["cotizacion_id"]),
    )
    cursor.execute(
        """
        INSERT INTO historial_estados (
            cotizacion_id, usuario_id, estado_anterior_id,
            estado_nuevo_id, observacion
        )
        VALUES (%s, %s, %s, %s, %s)
        """,
        (
            cotizacion["cotizacion_id"],
            g.usuario["usuario_id"],
            cotizacion["estado_id"],
            nuevo_id,
            observacion,
        ),
    )
    return True


@cotizaciones_bp.get("")
@login_required
def listar_cotizaciones():
    folio = request.args.get("folio", "").strip()
    cliente = request.args.get("cliente", "").strip()
    estado = request.args.get("estado", "").strip()
    desde = request.args.get("desde", "").strip()
    hasta = request.args.get("hasta", "").strip()

    condiciones = []
    parametros = []

    if folio:
        condiciones.append("q.folio LIKE %s")
        parametros.append(f"%{folio}%")
    if cliente:
        condiciones.append("c.nombre_razon_social LIKE %s")
        parametros.append(f"%{cliente}%")
    if estado:
        condiciones.append("e.nombre = %s")
        parametros.append(estado)
    if desde:
        try:
            date.fromisoformat(desde)
        except ValueError:
            return jsonify({"ok": False, "mensaje": "La fecha desde no es válida"}), 400
        condiciones.append("q.fecha_emision >= %s")
        parametros.append(desde)
    if hasta:
        try:
            date.fromisoformat(hasta)
        except ValueError:
            return jsonify({"ok": False, "mensaje": "La fecha hasta no es válida"}), 400
        condiciones.append("q.fecha_emision <= %s")
        parametros.append(hasta)

    consulta = """
        SELECT
            q.cotizacion_id,
            q.folio,
            q.fecha_emision,
            q.fecha_vencimiento,
            q.moneda,
            q.valor_neto,
            q.iva,
            q.total,
            c.nombre_razon_social AS cliente,
            e.nombre AS estado
        FROM cotizaciones q
        INNER JOIN clientes c ON c.cliente_id = q.cliente_id
        INNER JOIN estados_cotizacion e ON e.estado_id = q.estado_id
    """
    if condiciones:
        consulta += " WHERE " + " AND ".join(condiciones)
    consulta += " ORDER BY q.cotizacion_id DESC"

    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute(consulta, parametros)
        return jsonify({"ok": True, "datos": convertir_json(cursor.fetchall())})
    except Error:
        return jsonify({"ok": False, "mensaje": "No fue posible consultar cotizaciones"}), 500
    finally:
        close_connection(connection, cursor)


@cotizaciones_bp.get("/<int:cotizacion_id>")
@login_required
def obtener_cotizacion(cotizacion_id):
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        cotizacion = consultar_detalle(cursor, cotizacion_id)
        if cotizacion is None:
            return jsonify({"ok": False, "mensaje": "Cotización no encontrada"}), 404
        return jsonify({"ok": True, "datos": convertir_json(cotizacion)})
    finally:
        close_connection(connection, cursor)


@cotizaciones_bp.post("")
@login_required
def crear_cotizacion():
    datos = request.get_json(silent=True) or {}
    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        cotizacion = validar_cotizacion(cursor, datos)
        borrador_id = obtener_estado_id(cursor, "Borrador")

        cursor.execute(
            """
            INSERT INTO cotizaciones (
                folio, cliente_id, usuario_id, estado_id,
                fecha_emision, fecha_vencimiento, moneda,
                valor_neto, iva, total,
                condiciones_comerciales, observaciones
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                "TMP-" + uuid4().hex[:20],
                cotizacion["cliente_id"],
                g.usuario["usuario_id"],
                borrador_id,
                cotizacion["fecha_emision"],
                cotizacion["fecha_vencimiento"],
                cotizacion["moneda"],
                cotizacion["valor_neto"],
                cotizacion["iva"],
                cotizacion["total"],
                cotizacion["condiciones_comerciales"],
                cotizacion["observaciones"],
            ),
        )
        cotizacion_id = cursor.lastrowid
        folio = f"COT-{cotizacion['fecha_emision'].year}-{cotizacion_id:06d}"
        cursor.execute(
            "UPDATE cotizaciones SET folio = %s WHERE cotizacion_id = %s",
            (folio, cotizacion_id),
        )

        for item in cotizacion["items"]:
            cursor.execute(
                """
                INSERT INTO detalle_cotizacion (
                    cotizacion_id, producto_id, descripcion_aplicada,
                    cantidad, precio_unitario, subtotal
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    cotizacion_id,
                    item["producto_id"],
                    item["descripcion_aplicada"],
                    item["cantidad"],
                    item["precio_unitario"],
                    item["subtotal"],
                ),
            )

        cursor.execute(
            """
            INSERT INTO historial_estados (
                cotizacion_id, usuario_id, estado_anterior_id,
                estado_nuevo_id, observacion
            )
            VALUES (%s, %s, NULL, %s, %s)
            """,
            (
                cotizacion_id,
                g.usuario["usuario_id"],
                borrador_id,
                "Creación del borrador",
            ),
        )

        connection.commit()
        return jsonify({"ok": True, "id": cotizacion_id, "folio": folio}), 201
    except ValueError as error:
        if connection is not None:
            connection.rollback()
        return jsonify({"ok": False, "mensaje": str(error)}), 400
    except Error:
        if connection is not None:
            connection.rollback()
        return jsonify({"ok": False, "mensaje": "No fue posible guardar la cotización"}), 500
    finally:
        close_connection(connection, cursor)


@cotizaciones_bp.put("/<int:cotizacion_id>")
@login_required
def editar_cotizacion(cotizacion_id):
    datos = request.get_json(silent=True) or {}
    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        actual = consultar_detalle(cursor, cotizacion_id)
        if actual is None:
            return jsonify({"ok": False, "mensaje": "Cotización no encontrada"}), 404
        if actual["estado"] != "Borrador":
            return jsonify({"ok": False, "mensaje": "Solo se puede editar un borrador"}), 409

        cotizacion = validar_cotizacion(cursor, datos)
        cursor.execute(
            """
            UPDATE cotizaciones
            SET cliente_id = %s,
                fecha_emision = %s,
                fecha_vencimiento = %s,
                moneda = %s,
                valor_neto = %s,
                iva = %s,
                total = %s,
                condiciones_comerciales = %s,
                observaciones = %s,
                fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE cotizacion_id = %s
            """,
            (
                cotizacion["cliente_id"],
                cotizacion["fecha_emision"],
                cotizacion["fecha_vencimiento"],
                cotizacion["moneda"],
                cotizacion["valor_neto"],
                cotizacion["iva"],
                cotizacion["total"],
                cotizacion["condiciones_comerciales"],
                cotizacion["observaciones"],
                cotizacion_id,
            ),
        )
        cursor.execute(
            "DELETE FROM detalle_cotizacion WHERE cotizacion_id = %s",
            (cotizacion_id,),
        )

        for item in cotizacion["items"]:
            cursor.execute(
                """
                INSERT INTO detalle_cotizacion (
                    cotizacion_id, producto_id, descripcion_aplicada,
                    cantidad, precio_unitario, subtotal
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    cotizacion_id,
                    item["producto_id"],
                    item["descripcion_aplicada"],
                    item["cantidad"],
                    item["precio_unitario"],
                    item["subtotal"],
                ),
            )

        connection.commit()
        return jsonify({"ok": True, "mensaje": "Borrador actualizado"})
    except ValueError as error:
        if connection is not None:
            connection.rollback()
        return jsonify({"ok": False, "mensaje": str(error)}), 400
    except Error:
        if connection is not None:
            connection.rollback()
        return jsonify({"ok": False, "mensaje": "No fue posible editar la cotización"}), 500
    finally:
        close_connection(connection, cursor)


@cotizaciones_bp.post("/<int:cotizacion_id>/emitir")
@login_required
def emitir_cotizacion(cotizacion_id):
    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        cotizacion = consultar_detalle(cursor, cotizacion_id)

        if cotizacion is None:
            return jsonify({"ok": False, "mensaje": "Cotización no encontrada"}), 404
        if cotizacion["empresa"] is None:
            return jsonify({"ok": False, "mensaje": "Falta configurar la empresa"}), 400
        if not cotizacion["items"]:
            return jsonify({"ok": False, "mensaje": "La cotización no contiene ítems"}), 400

        neto = sum(
            (Decimal(str(item["subtotal"])) for item in cotizacion["items"]),
            Decimal("0"),
        )
        iva_calculado = (neto * IVA).quantize(DOS_DECIMALES, rounding=ROUND_HALF_UP)
        total_calculado = neto + iva_calculado

        if (
            neto != cotizacion["valor_neto"]
            or iva_calculado != cotizacion["iva"]
            or total_calculado != cotizacion["total"]
        ):
            return jsonify({"ok": False, "mensaje": "Los totales no coinciden con los ítems"}), 409

        if cotizacion["estado"] == "Borrador":
            cambiar_estado(
                cursor,
                cotizacion,
                "Enviada",
                "Documento PDF generado para descarga",
            )

        connection.commit()
        actualizada = consultar_detalle(cursor, cotizacion_id)
        return jsonify({"ok": True, "datos": convertir_json(actualizada)})
    except Error:
        if connection is not None:
            connection.rollback()
        return jsonify({"ok": False, "mensaje": "No fue posible emitir la cotización"}), 500
    finally:
        close_connection(connection, cursor)


@cotizaciones_bp.patch("/<int:cotizacion_id>/estado")
@login_required
def actualizar_estado(cotizacion_id):
    datos = request.get_json(silent=True) or {}
    nuevo_estado = datos.get("estado")
    observacion = str(datos.get("observacion") or "").strip()
    permitidos = ("Borrador", "Enviada", "Pendiente", "Vencida")

    if nuevo_estado not in permitidos:
        return jsonify(
            {"ok": False, "mensaje": "Para aceptación o rechazo utilice Registrar resultado"}
        ), 400
    if not observacion:
        return jsonify({"ok": False, "mensaje": "La observación es obligatoria"}), 400

    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        cotizacion = consultar_detalle(cursor, cotizacion_id)
        if cotizacion is None:
            return jsonify({"ok": False, "mensaje": "Cotización no encontrada"}), 404

        if nuevo_estado == "Borrador":
            cursor.execute(
                "UPDATE detalle_cotizacion SET cantidad_aceptada = NULL WHERE cotizacion_id = %s",
                (cotizacion_id,),
            )

        cambiar_estado(cursor, cotizacion, nuevo_estado, observacion[:255])
        connection.commit()
        actualizada = consultar_detalle(cursor, cotizacion_id)
        return jsonify({"ok": True, "datos": convertir_json(actualizada)})
    except Error:
        if connection is not None:
            connection.rollback()
        return jsonify({"ok": False, "mensaje": "No fue posible actualizar el estado"}), 500
    finally:
        close_connection(connection, cursor)


@cotizaciones_bp.put("/<int:cotizacion_id>/resultado")
@login_required
def registrar_resultado(cotizacion_id):
    datos = request.get_json(silent=True) or {}
    recibidos = datos.get("items")
    observacion = str(
        datos.get("observacion") or "Resultado comercial registrado"
    ).strip()

    if not isinstance(recibidos, list) or not recibidos:
        return jsonify({"ok": False, "mensaje": "Debe informar el resultado de los ítems"}), 400

    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        cotizacion = consultar_detalle(cursor, cotizacion_id)
        if cotizacion is None:
            return jsonify({"ok": False, "mensaje": "Cotización no encontrada"}), 404
        if cotizacion["estado"] == "Borrador":
            return jsonify({"ok": False, "mensaje": "Primero debe generar el PDF"}), 409

        resultados = {}
        for item in recibidos:
            detalle_id = identificador(item.get("detalle_id"), "El detalle")
            cantidad_aceptada = numero_decimal(
                item.get("cantidad_aceptada"),
                "La cantidad aceptada",
            )
            resultados[detalle_id] = cantidad_aceptada

        ids_reales = {item["detalle_id"] for item in cotizacion["items"]}
        if set(resultados) != ids_reales:
            return jsonify({"ok": False, "mensaje": "Debe registrar todos los ítems de la cotización"}), 400

        todos_completos = True
        todos_descartados = True

        for item in cotizacion["items"]:
            aceptada = resultados[item["detalle_id"]]
            cotizada = Decimal(str(item["cantidad"]))

            if aceptada > cotizada:
                return jsonify(
                    {"ok": False, "mensaje": "La cantidad aceptada no puede superar la cotizada"}
                ), 400

            if aceptada != cotizada:
                todos_completos = False
            if aceptada != 0:
                todos_descartados = False

            cursor.execute(
                "UPDATE detalle_cotizacion SET cantidad_aceptada = %s WHERE detalle_id = %s",
                (aceptada, item["detalle_id"]),
            )

        if todos_completos:
            nuevo_estado = "Aceptada"
        elif todos_descartados:
            nuevo_estado = "Rechazada"
        else:
            nuevo_estado = "Parcialmente aceptada"

        cambiar_estado(cursor, cotizacion, nuevo_estado, observacion[:255])
        connection.commit()
        actualizada = consultar_detalle(cursor, cotizacion_id)
        return jsonify({"ok": True, "datos": convertir_json(actualizada)})
    except ValueError as error:
        if connection is not None:
            connection.rollback()
        return jsonify({"ok": False, "mensaje": str(error)}), 400
    except Error:
        if connection is not None:
            connection.rollback()
        return jsonify({"ok": False, "mensaje": "No fue posible registrar el resultado"}), 500
    finally:
        close_connection(connection, cursor)
