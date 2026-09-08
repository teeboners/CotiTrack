from functools import wraps

from flask import Blueprint, g, jsonify, request, session
from mysql.connector import Error

from database import get_connection, close_connection
from domain import password_matches, required_text


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def buscar_usuario_activo(usuario_id):
    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                u.usuario_id,
                u.nombre,
                u.correo,
                u.rol_id,
                r.nombre AS rol
            FROM usuarios u
            INNER JOIN roles r ON r.rol_id = u.rol_id
            WHERE u.usuario_id = %s AND u.activo = 1
            """,
            (usuario_id,),
        )

        return cursor.fetchone()

    finally:
        close_connection(connection, cursor)


def login_required(function):
    @wraps(function)
    def wrapper(*args, **kwargs):
        usuario_id = session.get("usuario_id")

        if usuario_id is None:
            return jsonify({
                "ok": False,
                "mensaje": "Debe iniciar sesión"
            }), 401

        usuario = buscar_usuario_activo(usuario_id)

        if usuario is None:
            session.clear()

            return jsonify({
                "ok": False,
                "mensaje": "La sesión ya no es válida"
            }), 401

        g.usuario = usuario

        return function(*args, **kwargs)

    return wrapper


def admin_required(function):
    @wraps(function)
    @login_required
    def wrapper(*args, **kwargs):

        if g.usuario["rol"] != "Administrador":
            return jsonify({
                "ok": False,
                "mensaje": "Acceso no autorizado"
            }), 403

        return function(*args, **kwargs)

    return wrapper


@auth_bp.post("/login")
def login():
    datos = request.get_json(silent=True) or {}

    try:
        correo = required_text(
            datos.get("correo"),
            "El correo"
        ).lower()

        password = required_text(
            datos.get("password"),
            "La contraseña"
        )

    except ValueError as error:
        return jsonify({
            "ok": False,
            "mensaje": str(error)
        }), 400

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                u.usuario_id,
                u.nombre,
                u.correo,
                u.password_hash,
                r.nombre AS rol
            FROM usuarios u
            INNER JOIN roles r ON r.rol_id = u.rol_id
            WHERE u.correo = %s AND u.activo = 1
            """,
            (correo,),
        )

        usuario = cursor.fetchone()

        if usuario is None or not password_matches(
            password,
            usuario["password_hash"]
        ):
            return jsonify({
                "ok": False,
                "mensaje": "Correo o contraseña incorrectos"
            }), 401

        session.clear()
        session["usuario_id"] = usuario["usuario_id"]

        return jsonify({
            "ok": True,
            "usuario": {
                "usuario_id": usuario["usuario_id"],
                "nombre": usuario["nombre"],
                "correo": usuario["correo"],
                "rol": usuario["rol"],
            },
        })

    except Error:
        return jsonify({
            "ok": False,
            "mensaje": "No fue posible consultar MySQL"
        }), 500

    finally:
        close_connection(connection, cursor)


@auth_bp.get("/sesion")
@login_required
def sesion_actual():
    return jsonify({
        "ok": True,
        "usuario": g.usuario
    })


@auth_bp.post("/logout")
def logout():
    session.clear()

    return jsonify({
        "ok": True,
        "mensaje": "Sesión cerrada"
    })