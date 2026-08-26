CREATE DATABASE IF NOT EXISTS cotitrack;

USE cotitrack;

-- Tabla de roles

CREATE TABLE IF NOT EXISTS roles (
    rol_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255)
);


-- Tabla de Usuarios

CREATE TABLE IF NOT EXISTS usuarios (
    usuario_id INT AUTO_INCREMENT PRIMARY KEY,
    rol_id INT NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    correo VARCHAR(160) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    activo TINYINT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (rol_id) REFERENCES roles(rol_id)
);


-- Tabla de clientes

CREATE TABLE IF NOT EXISTS clientes (
    cliente_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_razon_social VARCHAR(160) NOT NULL,
    rut VARCHAR(20) UNIQUE,
    correo VARCHAR(160),
    telefono VARCHAR(40),
    direccion VARCHAR(255),
    activo TINYINT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- Tabla de productos y servicios

CREATE TABLE IF NOT EXISTS productos_servicios (
    producto_id INT AUTO_INCREMENT PRIMARY KEY,
    tipo ENUM('PRODUCTO', 'SERVICIO') NOT NULL,
    nombre VARCHAR(160) NOT NULL,
    descripcion TEXT,
    precio_referencia DECIMAL(12,2) DEFAULT 0,
    activo TINYINT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- Tabla de estados de una cotización

CREATE TABLE IF NOT EXISTS estados_cotizacion (
    estado_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255)
);


-- Tabla principal de cotizaciones

CREATE TABLE IF NOT EXISTS cotizaciones (
    cotizacion_id INT AUTO_INCREMENT PRIMARY KEY,
    folio VARCHAR(30) NOT NULL UNIQUE,
    cliente_id INT NOT NULL,
    usuario_id INT NOT NULL,
    estado_id INT NOT NULL,
    fecha_emision DATE NOT NULL,
    fecha_vencimiento DATE,
    moneda CHAR(3) DEFAULT 'CLP',
    valor_neto DECIMAL(14,2) DEFAULT 0,
    iva DECIMAL(14,2) DEFAULT 0,
    total DECIMAL(14,2) DEFAULT 0,
    condiciones_comerciales TEXT,
    observaciones TEXT,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (cliente_id) REFERENCES clientes(cliente_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(usuario_id),
    FOREIGN KEY (estado_id) REFERENCES estados_cotizacion(estado_id)
);


-- Tabla de productos o servicios incluidos en cada cotización

CREATE TABLE IF NOT EXISTS detalle_cotizacion (
    detalle_id INT AUTO_INCREMENT PRIMARY KEY,
    cotizacion_id INT NOT NULL,
    producto_id INT NOT NULL,
    descripcion_aplicada VARCHAR(255) NOT NULL,
    cantidad DECIMAL(12,3) NOT NULL,
    precio_unitario DECIMAL(14,2) NOT NULL,
    subtotal DECIMAL(14,2) NOT NULL,
    cantidad_aceptada DECIMAL(12,3),

    FOREIGN KEY (cotizacion_id)
        REFERENCES cotizaciones(cotizacion_id),

    FOREIGN KEY (producto_id)
        REFERENCES productos_servicios(producto_id)
);


-- Tabla del historial de estados

CREATE TABLE IF NOT EXISTS historial_estados (
    historial_id INT AUTO_INCREMENT PRIMARY KEY,
    cotizacion_id INT NOT NULL,
    usuario_id INT NOT NULL,
    estado_anterior_id INT,
    estado_nuevo_id INT NOT NULL,
    fecha_cambio DATETIME DEFAULT CURRENT_TIMESTAMP,
    observacion VARCHAR(255),

    FOREIGN KEY (cotizacion_id)
        REFERENCES cotizaciones(cotizacion_id),

    FOREIGN KEY (usuario_id)
        REFERENCES usuarios(usuario_id),

    FOREIGN KEY (estado_anterior_id)
        REFERENCES estados_cotizacion(estado_id),

    FOREIGN KEY (estado_nuevo_id)
        REFERENCES estados_cotizacion(estado_id)
);


-- Tabla con los datos generales de la empresa

CREATE TABLE IF NOT EXISTS configuracion_empresa (
    configuracion_id INT AUTO_INCREMENT PRIMARY KEY,
    razon_social VARCHAR(160) NOT NULL,
    rut VARCHAR(20) NOT NULL,
    direccion VARCHAR(255),
    correo VARCHAR(160),
    telefono VARCHAR(40),
    logo_url VARCHAR(500),
    activa TINYINT DEFAULT 1,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- Roles iniciales

INSERT INTO roles (nombre, descripcion)
VALUES
('Administrador', 'Administra las cuentas de usuario'),
('Usuario de ventas', 'Gestiona clientes y cotizaciones');


-- Estados iniciales de las cotizaciones

INSERT INTO estados_cotizacion (nombre, descripcion)
VALUES
('Borrador', 'Cotización en elaboración'),
('Enviada', 'Cotización generada y enviada'),
('Pendiente', 'Cotización sin respuesta del cliente'),
('Aceptada', 'Cotización aceptada por el cliente'),
('Rechazada', 'Cotización rechazada por el cliente'),
('Parcialmente aceptada', 'Parte de la cotización fue aceptada'),
('Vencida', 'Cotización fuera de su fecha de vigencia');