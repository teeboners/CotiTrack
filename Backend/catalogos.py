from decimal import Decimal, InvalidOperation
import re

from flask import Blueprint, g, jsonify, request
from mysql.connector import Error, IntegrityError

from auth import login_required
from database import get_connection, close_connection
from domain import password_hash, required_text


catalogos_bp = Blueprint("catalogos", __name__, url_prefix="/api")


ESPECIFICACIONES = {
    "clientes": {
        "tabla": "clientes",
        "clave": "cliente_id",
        "columnas": ["nombre_razon_social", "rut", "correo", "telefono", "direccion"],
    },
    "productos": {
        "tabla": "productos_servicios",
        "clave": "producto_id",
        "columnas": ["tipo", "nombre", "descripcion", "precio_referencia"],
    },
    "usuarios": {
        "tabla": "usuarios",
        "clave": "usuario_id",
        "columnas": ["rol_id", "nombre", "correo"],
    },
}


def texto_opcional(valor, maximo):
    if valor is None:
        return None

    valor = str(valor).strip()

    if not valor:
        return None

    if len(valor) > maximo:
        raise ValueError(f"El texto no puede superar {maximo} caracteres")

    return valor


def correo_valido(valor, obligatorio=False):
    correo = texto_opcional(valor, 160)

    if obligatorio and correo is None:
        raise ValueError("El correo es obligatorio")

    if correo and not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", correo):
        raise ValueError("El correo no tiene un formato válido")

    return correo.lower() if correo else None


def precio_valido(valor):
    try:
        precio = Decimal(str(valor or 0))
    except InvalidOperation:
        raise ValueError("El precio debe ser numérico")

    if precio < 0:
        raise ValueError("El precio no puede ser negativo")

    return precio


def comprobar_tipo(tipo):
    if tipo not in ESPECIFICACIONES:
        return None

    if tipo == "usuarios" and g.usuario["rol"] != "Administrador":
        return jsonify({"ok": False, "mensaje": "Acceso no autorizado"}), 403

    return ESPECIFICACIONES[tipo]


def valores_recibidos(tipo, datos, creando):
    if tipo == "clientes":
        return [
            required_text(
                datos.get("nombre_razon_social"),
                "El nombre o razón social"
            ),
            texto_opcional(datos.get("rut"), 20),
            correo_valido(datos.get("correo")),
            texto_opcional(datos.get("telefono"), 40),
            texto_opcional(datos.get("direccion"), 255),
        ]

    if tipo == "productos":
        clase = datos.get("tipo")

        if clase not in ("PRODUCTO", "SERVICIO"):
            raise ValueError("El tipo debe ser PRODUCTO o SERVICIO")

        return [
            clase,
            required_text(datos.get("nombre"), "El nombre"),
            texto_opcional(datos.get("descripcion"), 5000),
            precio_valido(datos.get("precio_referencia")),
        ]

    rol_id = datos.get("rol_id")

    try:
        rol_id = int(rol_id)
    except (TypeError, ValueError):
        raise ValueError("Debe seleccionar un rol")

    valores = [
        rol_id,
        required_text(datos.get("nombre"), "El nombre"),
        correo_valido(datos.get("correo"), obligatorio=True),
    ]

    if creando:
        password = required_text(datos.get("password"), "La contraseña")

        if len(password) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")

        valores.append(password_hash(password))

    return valores


@catalogos_bp.get("/roles")
@login_required
def listar_roles():
    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            "SELECT rol_id, nombre FROM roles ORDER BY rol_id"
        )

        return jsonify({
            "ok": True,
            "datos": cursor.fetchall()
        })

    finally:
        close_connection(connection, cursor)


@catalogos_bp.get("/<tipo>")
@login_required
def listar(tipo):
    especificacion = comprobar_tipo(tipo)

    if especificacion is None:
        return jsonify({
            "ok": False,
            "mensaje": "Módulo no encontrado"
        }), 404

    if not isinstance(especificacion, dict):
        return especificacion

    tabla = especificacion["tabla"]
    clave = especificacion["clave"]
    columnas = especificacion["columnas"]
    buscar = request.args.get("buscar", "").strip()

    if tipo == "usuarios":
        seleccion = (
            "u.usuario_id, u.rol_id, u.nombre, u.correo, u.activo, "
            "r.nombre AS rol"
        )

        consulta = (
            "SELECT " + seleccion + " FROM usuarios u "
            "INNER JOIN roles r ON r.rol_id = u.rol_id"
        )

        parametros = []

        if buscar:
            consulta += " WHERE u.nombre LIKE %s OR u.correo LIKE %s"
            parametros.extend([
                f"%{buscar}%",
                f"%{buscar}%"
            ])

        consulta += " ORDER BY u.usuario_id DESC"

    else:
        seleccion = ", ".join([clave] + columnas + ["activo"])
        consulta = f"SELECT {seleccion} FROM {tabla}"
        parametros = []

        if buscar:
            campo = (
                "nombre_razon_social"
                if tipo == "clientes"
                else "nombre"
            )

            consulta += f" WHERE {campo} LIKE %s"
            parametros.append(f"%{buscar}%")

        consulta += f" ORDER BY {clave} DESC"

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(consulta, parametros)

        return jsonify({
            "ok": True,
            "datos": cursor.fetchall()
        })

    except Error:
        return jsonify({
            "ok": False,
            "mensaje": "No fue posible consultar los datos"
        }), 500

    finally:
        close_connection(connection, cursor)


@catalogos_bp.post("/<tipo>")
@login_required
def crear(tipo):
    especificacion = comprobar_tipo(tipo)

    if especificacion is None:
        return jsonify({
            "ok": False,
            "mensaje": "Módulo no encontrado"
        }), 404

    if not isinstance(especificacion, dict):
        return especificacion

    datos = request.get_json(silent=True) or {}

    try:
        valores = valores_recibidos(tipo, datos, creando=True)

    except ValueError as error:
        return jsonify({
            "ok": False,
            "mensaje": str(error)
        }), 400

    tabla = especificacion["tabla"]
    columnas = especificacion["columnas"].copy()

    if tipo == "usuarios":
        columnas.append("password_hash")

    nombres = ", ".join(columnas)
    posiciones = ", ".join(["%s"] * len(columnas))

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        if tipo == "usuarios":
            cursor.execute(
                "SELECT rol_id FROM roles WHERE rol_id = %s",
                (valores[0],)
            )

            if cursor.fetchone() is None:
                return jsonify({
                    "ok": False,
                    "mensaje": "El rol no existe"
                }), 400

        cursor.execute(
            f"INSERT INTO {tabla} ({nombres}) VALUES ({posiciones})",
            valores,
        )

        connection.commit()

        return jsonify({
            "ok": True,
            "id": cursor.lastrowid
        }), 201

    except IntegrityError:
        connection.rollback()

        return jsonify({
            "ok": False,
            "mensaje": "El correo o RUT ya está registrado"
        }), 409

    except Error:
        connection.rollback()

        return jsonify({
            "ok": False,
            "mensaje": "No fue posible crear el registro"
        }), 500

    finally:
        close_connection(connection, cursor)


@catalogos_bp.put("/<tipo>/<int:registro_id>")
@login_required
def editar(tipo, registro_id):
    especificacion = comprobar_tipo(tipo)

    if especificacion is None:
        return jsonify({
            "ok": False,
            "mensaje": "Módulo no encontrado"
        }), 404

    if not isinstance(especificacion, dict):
        return especificacion

    datos = request.get_json(silent=True) or {}

    try:
        valores = valores_recibidos(tipo, datos, creando=False)

    except ValueError as error:
        return jsonify({
            "ok": False,
            "mensaje": str(error)
        }), 400

    tabla = especificacion["tabla"]
    clave = especificacion["clave"]
    columnas = especificacion["columnas"]

    asignaciones = ", ".join(
        f"{columna} = %s"
        for columna in columnas
    )

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            f"UPDATE {tabla} SET {asignaciones} WHERE {clave} = %s",
            valores + [registro_id],
        )

        if cursor.rowcount == 0:
            connection.rollback()

            return jsonify({
                "ok": False,
                "mensaje": "Registro no encontrado"
            }), 404

        connection.commit()

        return jsonify({
            "ok": True,
            "mensaje": "Registro actualizado"
        })

    except IntegrityError:
        connection.rollback()

        return jsonify({
            "ok": False,
            "mensaje": "El correo o RUT ya está registrado"
        }), 409

    except Error:
        connection.rollback()

        return jsonify({
            "ok": False,
            "mensaje": "No fue posible actualizar"
        }), 500

    finally:
        close_connection(connection, cursor)


@catalogos_bp.patch("/<tipo>/<int:registro_id>/estado")
@login_required
def cambiar_estado(tipo, registro_id):
    especificacion = comprobar_tipo(tipo)

    if especificacion is None:
        return jsonify({
            "ok": False,
            "mensaje": "Módulo no encontrado"
        }), 404

    if not isinstance(especificacion, dict):
        return especificacion

    datos = request.get_json(silent=True) or {}
    activo = datos.get("activo")

    if activo not in (0, 1, False, True):
        return jsonify({
            "ok": False,
            "mensaje": "Estado inválido"
        }), 400

    if (
        tipo == "usuarios"
        and registro_id == g.usuario["usuario_id"]
        and not activo
    ):
        return jsonify({
            "ok": False,
            "mensaje": "No puede desactivar su propia cuenta"
        }), 400

    tabla = especificacion["tabla"]
    clave = especificacion["clave"]

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            f"UPDATE {tabla} SET activo = %s WHERE {clave} = %s",
            (int(bool(activo)), registro_id),
        )

        if cursor.rowcount == 0:
            connection.rollback()

            return jsonify({
                "ok": False,
                "mensaje": "Registro no encontrado"
            }), 404

        connection.commit()

        return jsonify({
            "ok": True,
            "mensaje": "Estado actualizado"
        })

    except Error:
        connection.rollback()

        return jsonify({
            "ok": False,
            "mensaje": "No fue posible cambiar el estado"
        }), 500

    finally:
        close_connection(connection, cursor)