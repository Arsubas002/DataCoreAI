-- Revisar antes de ejecutar en SSMS contra localhost\SQLEXPRESS.
-- No elimina ni altera tablas existentes. GO es un separador de lotes de SSMS.
USE master;
GO
IF DB_ID(N'DataCoreAI') IS NULL
    EXEC(N'CREATE DATABASE DataCoreAI');
GO
USE DataCoreAI;
GO
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.Categorias', N'U') IS NULL
CREATE TABLE dbo.Categorias (
    CategoriaID INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(100) NOT NULL UNIQUE,
    CONSTRAINT CK_Categorias_Nombre CHECK (LEN(LTRIM(RTRIM(Nombre))) > 0)
);

IF OBJECT_ID(N'dbo.Productos', N'U') IS NULL
CREATE TABLE dbo.Productos (
    ProductoID INT IDENTITY(1,1) PRIMARY KEY,
    Codigo NVARCHAR(30) NOT NULL UNIQUE,
    Nombre NVARCHAR(150) NOT NULL,
    CategoriaID INT NOT NULL REFERENCES dbo.Categorias(CategoriaID),
    Precio DECIMAL(12,2) NOT NULL,
    Existencias INT NOT NULL DEFAULT 0,
    StockMinimo INT NOT NULL DEFAULT 5,
    Activo BIT NOT NULL DEFAULT 1,
    FechaCreacion DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    VersionFila ROWVERSION,
    CONSTRAINT CK_Productos_Codigo CHECK (LEN(LTRIM(RTRIM(Codigo))) > 0),
    CONSTRAINT CK_Productos_Nombre CHECK (LEN(LTRIM(RTRIM(Nombre))) > 0),
    CONSTRAINT CK_Productos_Precio CHECK (Precio >= 0),
    CONSTRAINT CK_Productos_Existencias CHECK (Existencias >= 0),
    CONSTRAINT CK_Productos_StockMinimo CHECK (StockMinimo >= 0)
);

IF OBJECT_ID(N'dbo.Clientes', N'U') IS NULL
CREATE TABLE dbo.Clientes (
    ClienteID INT IDENTITY(1,1) PRIMARY KEY,
    Documento NVARCHAR(30) NOT NULL UNIQUE,
    Nombre NVARCHAR(150) NOT NULL,
    Correo NVARCHAR(254) NULL,
    Telefono NVARCHAR(30) NULL,
    Activo BIT NOT NULL DEFAULT 1,
    CONSTRAINT CK_Clientes_Documento CHECK (LEN(LTRIM(RTRIM(Documento))) > 0),
    CONSTRAINT CK_Clientes_Nombre CHECK (LEN(LTRIM(RTRIM(Nombre))) > 0)
);

IF OBJECT_ID(N'dbo.Ventas', N'U') IS NULL
CREATE TABLE dbo.Ventas (
    VentaID INT IDENTITY(1,1) PRIMARY KEY,
    ClienteID INT NOT NULL REFERENCES dbo.Clientes(ClienteID),
    Fecha DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    Total DECIMAL(12,2) NOT NULL,
    CONSTRAINT CK_Ventas_Total CHECK (Total >= 0)
);

IF OBJECT_ID(N'dbo.DetalleVentas', N'U') IS NULL
CREATE TABLE dbo.DetalleVentas (
    DetalleVentaID INT IDENTITY(1,1) PRIMARY KEY,
    VentaID INT NOT NULL REFERENCES dbo.Ventas(VentaID),
    ProductoID INT NOT NULL REFERENCES dbo.Productos(ProductoID),
    Cantidad INT NOT NULL,
    PrecioUnitario DECIMAL(12,2) NOT NULL,
    Subtotal DECIMAL(12,2) NOT NULL,
    CONSTRAINT CK_DetalleVentas_Cantidad CHECK (Cantidad > 0),
    CONSTRAINT CK_DetalleVentas_Precio CHECK (PrecioUnitario >= 0),
    CONSTRAINT CK_DetalleVentas_Subtotal CHECK (
        Subtotal >= 0 AND Subtotal = Cantidad * PrecioUnitario
    )
);
COMMIT TRANSACTION;
GO
-- Si ya existen tablas con otro diseño, este script las conserva.
-- Su compatibilidad debe revisarse antes de usar la aplicación.
