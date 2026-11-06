-- Revisar y autorizar antes de ejecutar en SSMS. La app no ejecuta este script.
-- Nueva tabla auxiliar; no modifica las cinco tablas existentes ni sus datos.
USE DataCoreAI;
GO
IF OBJECT_ID(N'dbo.VentasSolicitudes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.VentasSolicitudes (
        SolicitudID UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        Huella CHAR(64) NOT NULL,
        VentaID INT NULL REFERENCES dbo.Ventas(VentaID),
        FechaCreacion DATETIME2 NOT NULL DEFAULT SYSDATETIME()
    );
END;
GO
