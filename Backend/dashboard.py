from decimal import Decimal
from datetime import date, datetime

from flask import Blueprint, g, jsonify
from mysql.connector import Error

from auth import login_required
from database import close_connection, get_connection


dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


def convertir(valor):
    if isinstance(valor, Decimal):
        return str(valor)
    if isinstance(valor, list):
        return [convertir(elemento) for elemento in valor]
    if isinstance(valor, dict):
        return {clave: convertir(contenido) for clave, contenido in valor.items()}
    if isinstance(valor, (date, datetime)):
        return valor.isoformat()
    return valor


@dashboard_bp.get("/resumen")
@login_required
def resumen():
    connection = None
    cursor = None
    usuario_id = g.usuario["usuario_id"]

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT q.moneda, COUNT(*) AS cantidad,
                   COALESCE(SUM(q.total), 0) AS monto
            FROM cotizaciones q
            WHERE q.usuario_id = %s
              AND YEAR(q.fecha_emision) = YEAR(CURDATE())
              AND MONTH(q.fecha_emision) = MONTH(CURDATE())
            GROUP BY q.moneda
            ORDER BY q.moneda
            """,
            (usuario_id,),
        )
        monto_mes = cursor.fetchall()

        cursor.execute(
            """
            SELECT e.nombre AS estado, q.moneda, COUNT(*) AS cantidad,
                   COALESCE(SUM(q.total), 0) AS monto
            FROM cotizaciones q
            INNER JOIN estados_cotizacion e ON e.estado_id = q.estado_id
            WHERE q.usuario_id = %s
            GROUP BY e.estado_id, e.nombre, q.moneda
            ORDER BY e.estado_id, q.moneda
            """,
            (usuario_id,),
        )
        por_estado = cursor.fetchall()

        cursor.execute(
            """
            SELECT q.cotizacion_id, q.folio,
                   c.nombre_razon_social AS cliente,
                   q.fecha_emision, q.moneda, q.total,
                   e.nombre AS estado
            FROM cotizaciones q
            INNER JOIN clientes c ON c.cliente_id = q.cliente_id
            INNER JOIN estados_cotizacion e ON e.estado_id = q.estado_id
            WHERE q.usuario_id = %s
            ORDER BY q.fecha_actualizacion DESC, q.cotizacion_id DESC
            LIMIT 5
            """,
            (usuario_id,),
        )
        recientes = cursor.fetchall()

        total_cotizaciones_mes = sum(fila["cantidad"] for fila in monto_mes)

        return jsonify(
            {
                "ok": True,
                "datos": convertir(
                    {
                        "total_cotizaciones_mes": total_cotizaciones_mes,
                        "monto_mes": monto_mes,
                        "por_estado": por_estado,
                        "recientes": recientes,
                    }
                ),
            }
        )
    except Error:
        return jsonify({"ok": False, "mensaje": "No fue posible generar los indicadores"}), 500
    finally:
        close_connection(connection, cursor)
