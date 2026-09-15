from pathlib import Path
from urllib.parse import urlparse

from flask import Blueprint, jsonify, redirect, request, send_from_directory
from mysql.connector import Error
from werkzeug.utils import secure_filename

from auth import login_required
from database import close_connection, get_connection
from domain import required_text


empresa_bp = Blueprint("empresa", __name__, url_prefix="/api/empresa")

CARPETA_LOGOS = Path(__file__).resolve().parent / "uploads"
EXTENSIONES_PERMITIDAS = {".jpg", ".jpeg", ".png", ".webp"}


def buscar_empresa(cursor, preparar_logo=True):
    cursor.execute(
        """
        SELECT configuracion_id, razon_social, rut, direccion, correo,
               telefono, logo_url
        FROM configuracion_empresa
        WHERE activa = 1
        ORDER BY configuracion_id DESC
        LIMIT 1
        """
    )
    empresa = cursor.fetchone()

    if preparar_logo and empresa and empresa.get("logo_url"):
        logo_url = empresa["logo_url"]
        if not logo_url.startswith(("http://", "https://", "/")):
            empresa["logo_url"] = "/api/empresa/logo"

    return empresa


@empresa_bp.get("")
@login_required
def obtener_empresa():
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        return jsonify({"ok": True, "datos": buscar_empresa(cursor)})
    except Error:
        return jsonify({"ok": False, "mensaje": "No fue posible consultar los datos de la empresa"}), 500
    finally:
        close_connection(connection, cursor)


@empresa_bp.put("")
@login_required
def guardar_empresa():
    datos = request.get_json(silent=True) or {}

    try:
        razon_social = required_text(datos.get("razon_social"), "La razón social")
        rut = required_text(datos.get("rut"), "El RUT")
        direccion = required_text(datos.get("direccion"), "La dirección")
        correo = required_text(datos.get("correo"), "El correo")
        telefono = required_text(datos.get("telefono"), "El teléfono")
    except ValueError as error:
        return jsonify({"ok": False, "mensaje": str(error)}), 400

    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        empresa = buscar_empresa(cursor)

        if empresa:
            cursor.execute(
                """
                UPDATE configuracion_empresa
                SET razon_social = %s, rut = %s, direccion = %s,
                    correo = %s, telefono = %s,
                    fecha_actualizacion = CURRENT_TIMESTAMP
                WHERE configuracion_id = %s
                """,
                (razon_social, rut, direccion, correo, telefono, empresa["configuracion_id"]),
            )
        else:
            cursor.execute(
                """
                INSERT INTO configuracion_empresa
                    (razon_social, rut, direccion, correo, telefono, activa)
                VALUES (%s, %s, %s, %s, %s, 1)
                """,
                (razon_social, rut, direccion, correo, telefono),
            )

        connection.commit()
        empresa = buscar_empresa(cursor)
        return jsonify({"ok": True, "mensaje": "Datos de empresa guardados correctamente", "datos": empresa})
    except Error:
        if connection:
            connection.rollback()
        return jsonify({"ok": False, "mensaje": "No fue posible guardar los datos de la empresa"}), 500
    finally:
        close_connection(connection, cursor)


@empresa_bp.post("/logo")
@login_required
def guardar_logo():
    archivo = request.files.get("logo")

    if archivo is None or not archivo.filename:
        return jsonify({"ok": False, "mensaje": "Debe seleccionar un archivo"}), 400

    extension = Path(secure_filename(archivo.filename)).suffix.lower()
    if extension not in EXTENSIONES_PERMITIDAS:
        return jsonify({"ok": False, "mensaje": "El logo debe ser JPG, PNG o WEBP"}), 400

    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        empresa = buscar_empresa(cursor, preparar_logo=False)

        if empresa is None:
            return jsonify({"ok": False, "mensaje": "Primero debe guardar los datos de la empresa"}), 400

        CARPETA_LOGOS.mkdir(parents=True, exist_ok=True)
        nombre_archivo = f"logo_empresa{extension}"
        archivo.save(CARPETA_LOGOS / nombre_archivo)

        cursor.execute(
            """
            UPDATE configuracion_empresa
            SET logo_url = %s, fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE configuracion_id = %s
            """,
            (nombre_archivo, empresa["configuracion_id"]),
        )
        connection.commit()
        return jsonify({"ok": True, "mensaje": "Logo guardado correctamente", "logo_url": "/api/empresa/logo"})
    except (Error, OSError):
        if connection:
            connection.rollback()
        return jsonify({"ok": False, "mensaje": "No fue posible guardar el logo"}), 500
    finally:
        close_connection(connection, cursor)


@empresa_bp.get("/logo")
def mostrar_logo():
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        empresa = buscar_empresa(cursor, preparar_logo=False)

        if not empresa or not empresa.get("logo_url"):
            return jsonify({"ok": False, "mensaje": "La empresa no tiene un logo configurado"}), 404

        logo_url = empresa["logo_url"]
        if logo_url.startswith(("http://", "https://")):
            destino = urlparse(logo_url)
            if destino.scheme in {"http", "https"}:
                return redirect(logo_url)

        archivo_logo = CARPETA_LOGOS / Path(logo_url).name
        if not archivo_logo.is_file():
            return jsonify({"ok": False, "mensaje": "No se encontró el archivo del logo"}), 404

        return send_from_directory(CARPETA_LOGOS, archivo_logo.name)
    except Error:
        return jsonify({"ok": False, "mensaje": "No fue posible consultar el logo"}), 500
    finally:
        close_connection(connection, cursor)
