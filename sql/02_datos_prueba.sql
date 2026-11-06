-- Ejecutar SOLO después de revisar y autorizar ambos scripts.
-- Añade únicamente registros que no existen; nunca actualiza datos previos.
USE DataCoreAI;
GO
SET XACT_ABORT ON;
BEGIN TRANSACTION;

INSERT INTO dbo.Categorias (Nombre)
SELECT datos.Nombre
FROM (VALUES (N'Tecnología'), (N'Papelería'), (N'Hogar'), (N'Accesorios')) datos(Nombre)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Categorias WITH (UPDLOCK, HOLDLOCK) WHERE Nombre = datos.Nombre
);

INSERT INTO dbo.Productos (Codigo, Nombre, CategoriaID, Precio, Existencias, StockMinimo)
SELECT d.Codigo, d.Nombre, c.CategoriaID, d.Precio, d.Existencias, 5
FROM (VALUES
    (N'DEMO-001', N'Teclado USB', N'Tecnología', 65.00, 15),
    (N'DEMO-002', N'Mouse óptico', N'Tecnología', 35.00, 4),
    (N'DEMO-003', N'Audífonos', N'Tecnología', 89.00, 12),
    (N'DEMO-004', N'Memoria USB 32 GB', N'Tecnología', 28.00, 20),
    (N'DEMO-005', N'Cámara web', N'Tecnología', 120.00, 3),
    (N'DEMO-006', N'Cuaderno cuadriculado', N'Papelería', 8.50, 40),
    (N'DEMO-007', N'Bolígrafo azul', N'Papelería', 1.50, 80),
    (N'DEMO-008', N'Resaltador amarillo', N'Papelería', 3.50, 5),
    (N'DEMO-009', N'Carpeta oficio', N'Papelería', 4.20, 25),
    (N'DEMO-010', N'Bloc de notas', N'Papelería', 6.50, 0),
    (N'DEMO-011', N'Taza cerámica', N'Hogar', 18.00, 18),
    (N'DEMO-012', N'Lámpara de escritorio', N'Hogar', 75.00, 4),
    (N'DEMO-013', N'Organizador de mesa', N'Hogar', 32.00, 10),
    (N'DEMO-014', N'Botella reutilizable', N'Hogar', 24.00, 16),
    (N'DEMO-015', N'Reloj de pared', N'Hogar', 45.00, 7),
    (N'DEMO-016', N'Mochila urbana', N'Accesorios', 98.00, 9),
    (N'DEMO-017', N'Estuche escolar', N'Accesorios', 15.00, 22),
    (N'DEMO-018', N'Soporte para celular', N'Accesorios', 22.00, 2),
    (N'DEMO-019', N'Cable USB C', N'Accesorios', 19.00, 30),
    (N'DEMO-020', N'Alfombrilla para mouse', N'Accesorios', 14.00, 14)
) d(Codigo, Nombre, Categoria, Precio, Existencias)
JOIN dbo.Categorias c ON c.Nombre = d.Categoria
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Productos WITH (UPDLOCK, HOLDLOCK) WHERE Codigo = d.Codigo
);

INSERT INTO dbo.Clientes (Documento, Nombre, Correo, Telefono)
SELECT d.Documento, d.Nombre, d.Correo, d.Telefono
FROM (VALUES
    (N'DEMO-C001', N'Ana Torres', N'ana@example.com', N'3000000001'),
    (N'DEMO-C002', N'Luis Pérez', N'luis@example.com', N'3000000002'),
    (N'DEMO-C003', N'María Gómez', N'maria@example.com', N'3000000003'),
    (N'DEMO-C004', N'Carlos Ruiz', N'carlos@example.com', N'3000000004'),
    (N'DEMO-C005', N'Laura Díaz', N'laura@example.com', N'3000000005'),
    (N'DEMO-C006', N'Pedro Castro', N'pedro@example.com', N'3000000006'),
    (N'DEMO-C007', N'Sofía Rojas', N'sofia@example.com', N'3000000007'),
    (N'DEMO-C008', N'Diego Vargas', N'diego@example.com', N'3000000008'),
    (N'DEMO-C009', N'Elena Mora', N'elena@example.com', N'3000000009'),
    (N'DEMO-C010', N'Jorge Silva', N'jorge@example.com', N'3000000010')
) d(Documento, Nombre, Correo, Telefono)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Clientes WITH (UPDLOCK, HOLDLOCK) WHERE Documento = d.Documento
);
COMMIT TRANSACTION;
GO
