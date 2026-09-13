# CotiTrack

Plataforma web para crear, administrar y realizar seguimiento de cotizaciones comerciales.

## Tecnologías

- React 17.0.2 y CSS propio para la interfaz.
- Python y Flask para la API y las reglas del sistema.
- MySQL 8 para la base de datos relacional.
- React PDF Renderer para generar las cotizaciones en PDF.

## Funciones implementadas

- Inicio y cierre de sesión con perfiles Administrador y Usuario de ventas.
- Gestión de usuarios, clientes, productos y servicios.
- Creación y edición de cotizaciones en estado Borrador.
- Cálculo de neto, IVA del 19 % y total en CLP o USD.
- Generación y descarga del PDF.
- Estados, historial y registro de aceptación total, parcial o rechazo.
- Búsqueda y filtros de cotizaciones.
- Dashboard de seguimiento comercial.
- Interfaz responsive desarrollada sin Bootstrap.

## Estructura

- Frontend: componentes y pantallas desarrollados con React.
- Backend: API Flask, validaciones y acceso a MySQL.
- Database: script de creación y diagrama del modelo de nueve tablas.

## Ejecución local

1. Ejecutar Database/cotitrack.sql en MySQL 8.
2. Crear Backend/.env utilizando .env.example como referencia.
3. Crear y activar un entorno virtual dentro de Backend.
4. Instalar Backend/requirements.txt y ejecutar python app.py.
5. En Frontend, ejecutar npm install y luego npm start.

Para generar un PDF debe existir un registro activo en la tabla
configuracion_empresa. Los usuarios iniciales se crean con
Backend/crear_usuarios.py, que solicita los datos por consola y guarda las
contraseñas mediante hash.

## Comprobaciones

- Backend: python -m pytest -q
- Frontend: npm run build

Las contraseñas, variables de entorno, entornos virtuales, node_modules y la
carpeta de compilación no se incluyen en el repositorio.
