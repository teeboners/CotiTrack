# CotiTrack

Plataforma web para crear, administrar y realizar seguimiento de cotizaciones comerciales.

## Arquitectura

- Frontend: React 17.0.2 y CSS propio.
- Backend: Python y Flask.
- Base de datos: MySQL 8.
- PDF: React PDF Renderer.

## Estructura

- Frontend: interfaz, formularios y generación del PDF.
- Backend: API, validaciones y reglas de negocio.
- Database: script y modelo relacional de nueve tablas.

## Desarrollo local

1. Ejecutar `Database/cotitrack.sql` en MySQL 8.
2. Crear `Backend/.env` utilizando `.env.example` como referencia.
3. Crear y activar el entorno virtual de Python.
4. Instalar las dependencias de `Backend/requirements.txt`.
5. Ejecutar `python app.py` dentro de Backend.
6. Ejecutar `npm install` y `npm start` dentro de Frontend.

Las contraseñas y variables locales no se incluyen en el repositorio.


