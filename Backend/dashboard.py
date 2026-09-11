from decimal import Decimal

from flask import Blueprint, jsonify
from mysql.connector import Error

from auth import login_required
from database import get_connection, close_connection


dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


def convertir(valor):
    if isinstance(valor, Decimal):
        return str(valor)
    if isinstance(valor, list):
        return [convertir(elemento) for elemento in valor]
    if isinstance(valor, dict):
        return {clave: convertir(contenido) for clave, contenido in valor.items()}
    return valor


@dashboard_bp.get("/resumen")
@login_required
def resumen():
    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT COUNT(*) AS total FROM cotizaciones")
        total_cotizaciones = cursor.fetchone()["total"]

        cursor.execute(
            """
            SELECT
                e.nombre AS estado,
                q.moneda,
                COUNT(*) AS cantidad,
                COALESCE(SUM(q.total), 0) AS monto
            FROM cotizaciones q
            INNER JOIN estados_cotizacion e ON e.estado_id = q.estado_id
            GROUP BY e.estado_id, e.nombre, q.moneda
            ORDER BY e.estado_id, q.moneda
            """
        )
        por_estado = cursor.fetchall()

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM detalle_cotizacion
            WHERE cantidad_aceptada = 0
            """
        )
        items_descartados = cursor.fetchone()["total"]

        cursor.execute(
            """
            SELECT
                q.moneda,
                COALESCE(SUM(d.cantidad_aceptada * d.precio_unitario), 0) AS neto_aceptado
            FROM detalle_cotizacion d
            INNER JOIN cotizaciones q ON q.cotizacion_id = d.cotizacion_id
            WHERE d.cantidad_aceptada IS NOT NULL
            GROUP BY q.moneda
            ORDER BY q.moneda
            """
        )
        aceptado_por_moneda = cursor.fetchall()

        return jsonify(
            {
                "ok": True,
                "datos": convertir(
                    {
                        "total_cotizaciones": total_cotizaciones,
                        "por_estado": por_estado,
                        "items_descartados": items_descartados,
                        "aceptado_por_moneda": aceptado_por_moneda,
                    }
                ),
            }
        )
    except Error:
        return jsonify({"ok": False, "mensaje": "No fue posible generar los indicadores"}), 500
    finally:
        close_connection(connection, cursor)
