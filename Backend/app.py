from flask import Flask, jsonify
from mysql.connector import Error
from auth import auth_bp
from catalogos import catalogos_bp
from cotizaciones import cotizaciones_bp
from dashboard import dashboard_bp

from config import Config
from database import get_connection, close_connection

def create_app():
    app = Flask(__name__)
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
    

    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
