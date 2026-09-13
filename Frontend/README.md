# Frontend de CotiTrack

Interfaz desarrollada con React 17.0.2 y CSS propio. Contiene las pantallas de
inicio de sesión, dashboard, clientes, productos y servicios, usuarios,
cotizaciones, seguimiento y generación del documento PDF.

## Comandos

- `npm install`: instala las dependencias declaradas.
- `npm start`: inicia el entorno de desarrollo en el puerto 3000.
- `npm run build`: genera la carpeta optimizada para publicación.

Durante el desarrollo, las solicitudes que comienzan con `/api` se envían al
backend Flask mediante el proxy definido en `package.json`. En producción se
debe publicar el frontend y dirigir `/api` al backend en el mismo sitio.
