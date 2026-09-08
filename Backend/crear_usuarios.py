from getpass import getpass #permite escribir pw sin mostrarla en pantalla

from app import app
from database import get_connection, close_connection
from domain import password_hash


def crear_usuario(nombre_rol):
    print("Crear usuario:", nombre_rol)

    nombre = input("Nombre: ")
    correo = input("Correo: ")
    password = getpass("Contraseña: ")

    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute(
        "SELECT rol_id FROM roles WHERE nombre = %s",
        (nombre_rol,)
    )

    rol = cursor.fetchone()

    if rol is None:
        print("El rol no existe")
        close_connection(connection, cursor)
        return

    cursor.execute(
        """
        INSERT INTO usuarios (rol_id, nombre, correo, password_hash)
        VALUES (%s, %s, %s, %s)
        """,
        (rol["rol_id"], nombre, correo, password_hash(password))
    )

    connection.commit()
    close_connection(connection, cursor)

    print("Usuario creado correctamente")


with app.app_context(): #permite que database.py lea la configuracion de flask.
    crear_usuario("Administrador")
    crear_usuario("Usuario de ventas")