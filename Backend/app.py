from pathlib import Path

from flask import Flask, jsonify, send_from_directory
from mysql.connector import Error
from auth import auth_bp
from catalogos import catalogos_bp
from cotizaciones import cotizaciones_bp
from dashboard import dashboard_bp
from empresa import empresa_bp

from config import Config
from database import get_connection, close_connection


FRONTEND_BUILD = Path(__file__).resolve().parent.parent / "Frontend" / "build"


def create_app():
    app = Flask(__name__, static_folder=None)
    app.config.from_object(Config)
    app.config.update(
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE='Lax',
        SESSION_COOKIE_SECURE=app.config["COOKIE_SECURE"],
    )
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(catalogos_bp)
    app.register_blueprint(cotizaciones_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(empresa_bp)
    @app.get("/api/salud")
    def salud():
        return jsonify({"ok": True, "mensaje": "API CotiTrack operativa"})
    
    @app.get("/api/base-datos")
    def base_datos():
        connection = None
        cursor = None
        try:
            connection = get_connection()
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT COUNT(*) AS total FROM roles")
            resultado = cursor.fetchone()
            return jsonify({"ok": True, "roles": resultado["total"]})
        except Error:
            return jsonify({"ok": False, "mensaje": "No fue posible consultar MySQL"}), 500
        finally:
            close_connection(connection, cursor)

    @app.get("/")
    def frontend():
        return send_from_directory(FRONTEND_BUILD, "index.html")

    @app.get("/<path:ruta>")
    def archivos_frontend(ruta):
        archivo = FRONTEND_BUILD / ruta
        if archivo.is_file():
            return send_from_directory(FRONTEND_BUILD, ruta)
        return send_from_directory(FRONTEND_BUILD, "index.html")

    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
