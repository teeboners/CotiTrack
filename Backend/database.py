import mysql.connector #Modulo que permite a Python comunicarse con mysql
from flask import current_app #permite acceder a la aplicacion flask activa y su config

def get_connection():
    return mysql.connector.connect(  # Funcion de mysql-connector-python para crear conexion con mysql
        host=current_app.config['DB_HOST'],
        port=current_app.config['DB_PORT'],
        database=current_app.config['DB_NAME'],
        user=current_app.config['DB_USER'],
        password=current_app.config['DB_PASSWORD']
    )

def close_connection(connection, cursor): #si existe un cursor lo ceirra para liberar recursos usados en las consultas
    if cursor is not None:
        cursor.close()
    if connection is not None and connection.is_connected(): # si existe una conexion y sigue abierta, la cierra para no dejar conexiones consumiendo recursos
        connection.close()

