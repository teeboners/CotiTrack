# Backend de CotiTrack

API desarrollada con Flask para gestionar sesiones, permisos, catálogos,
cotizaciones, estados, resultados e indicadores. La información se almacena en
MySQL y las credenciales de conexión se leen desde el archivo `.env` local.

## Archivos principales

- `app.py`: crea la aplicación y registra sus módulos.
- `auth.py`: inicio de sesión, cierre de sesión y control de acceso.
- `catalogos.py`: usuarios, clientes, productos, servicios y roles.
- `cotizaciones.py`: borradores, cálculos, PDF, estados e historial.
- `dashboard.py`: indicadores comerciales.
- `database.py`: conexión y cierre de conexiones MySQL.
- `wsgi.py`: entrada utilizada para ejecutar Flask en producción.
- `tests`: pruebas automáticas de las validaciones básicas.
