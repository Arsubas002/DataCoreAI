# Instalación y prueba local en Windows

Esta guía prepara **un entorno de pruebas aislado** con SQL Server Express.
No ejecutamos estos pasos contra Windows ni contra una base real durante el
desarrollo. La CI de Windows prueba Python/UI/archivos con fuentes simuladas;
no instala ni valida SQL Server Express ni Groq.

## 1. Requisitos

- Windows 10/11 de 64 bits y PowerShell. Usa una cuenta Windows autorizada para
  la instancia de pruebas; no se necesita usuario `sa` ni autenticación SQL.
- [Python 3.13 de 64 bits](https://www.python.org/downloads/windows/), con el
  lanzador `py`. Comprueba `py -3.13 --version`.
- [Git para Windows](https://git-scm.com/download/win).
- [SQL Server Express](https://www.microsoft.com/sql-server/sql-server-downloads),
  instalado como instancia **SQLEXPRESS** con autenticación de Windows.
- [SQL Server Management Studio](https://learn.microsoft.com/sql/ssms/download-sql-server-management-studio-ssms).
- [Microsoft ODBC Driver 18 for SQL Server x64](https://learn.microsoft.com/sql/connect/odbc/download-odbc-driver-for-sql-server).
  `pip install pyodbc` no instala este controlador del sistema.

La aplicación fija `localhost\SQLEXPRESS` y la base `DataCoreAI`. Usa una
máquina/instancia de pruebas sin datos reales con ese nombre. No cambies
`DATACORE_DATABASE` para intentar redirigir las funciones comerciales: estas
solicitan `DataCoreAI` explícitamente. No abras la aplicación contra una instancia
real para preparar el entorno. Ningún instalador se ejecuta automáticamente.

## 2. Descargar la rama final y preparar Python

En una carpeta nueva, desde PowerShell:

```powershell
git clone --branch release/integracion-final https://github.com/Arsubas002/DataCoreAI.git
Set-Location DataCoreAI
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -c constraints-tested.txt -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pip check
.\.venv\Scripts\python.exe scripts/pruebas_aisladas.py
```

Necesitas acceso al repositorio privado con tu cliente Git; no escribas tokens
en la URL ni en archivos. Si ya tienes un checkout con cambios, consérvalos y
usa una carpeta nueva para esta prueba. No es necesario activar `.venv` ni
cambiar la política de ejecución de PowerShell.

`requirements-dev.txt` incluye la aplicación y el lector PDF de pruebas.
Para instalar solo la aplicación usa `requirements.txt`. El ejecutor aislado
fuerza SQL real y Groq a desactivados, bloquea SQL/HTTP reales y falla si no
descubre pruebas. Genera `test-results/resultado.json`, excluido de Git. Las
4 pruebas SQL optativas deben figurar como omitidas; consulta el informe de
integración para el total de la versión revisada.

## 3. Revisar los componentes, sin conectar a SQL

```powershell
Get-Service -Name 'MSSQL$SQLEXPRESS'
.\.venv\Scripts\python.exe scripts/diagnostico.py
```

El diagnóstico por defecto solo comprueba Python, paquetes y presencia del
controlador ODBC 18. **No abre conexiones**, no prueba Groq y no imprime claves.
Devuelve código 1 si falta algún requisito; instálalo antes de continuar.
Que esté instalado el controlador no demuestra que SQL Server esté accesible.

## 4. Preparar el esquema solo en la instancia vacía de pruebas

Este paso sí crea esquema y, opcionalmente, ejemplos. No lo realices sobre datos
reales. Revisa los scripts y confirma la instancia de pruebas antes de ejecutarlos
manualmente. No se ejecutaron como parte de esta entrega.

1. Abre SSMS y conecta a `localhost\SQLEXPRESS` con **Autenticación de Windows**.
2. Revisa `sql/01_crear_base_y_tablas.sql`: crea DataCoreAI y las tablas que falten.
   Ejecútalo únicamente en el entorno de pruebas identificado.
3. Revisa y ejecuta `sql/03_solicitudes_ventas.sql` en ese entorno: crea la tabla
   de idempotencia necesaria para las futuras confirmaciones de ventas.
4. Opcionalmente, revisa y ejecuta `sql/02_datos_prueba.sql` solo allí: añade
   categorías, clientes y productos ficticios, sin crear ventas.

Los scripts contienen `GO`; ejecútalos en SSMS, no mediante `cursor.execute`.
No son una migración para una base existente: omiten objetos presentes y no
comprueban ni corrigen sus tipos/restricciones. Ante incompatibilidad, detente
y revisa un plan de migración aparte. No borres ni recrees tablas para resolverla.

## 5. Verificar conexión y nombres del esquema, sin escribir

Solo después de identificar y preparar la instancia de pruebas:

```powershell
$env:DATACORE_READ_ONLY = '1'
$env:DATACORE_GROQ_ENABLED = '0'
$env:DATACORE_TEST_SQL = '0'
.\.venv\Scripts\python.exe scripts/diagnostico.py --sql
```

`--sql` abre DataCoreAI, consulta únicamente nombres de tablas/columnas en
`sys.tables`, `sys.schemas` y `sys.columns`, y cierra la conexión. No lee filas
comerciales ni escribe. Debe mostrar `conexion_sql_probada: true` y
`columnas_requeridas_presentes: true`. Esto solo verifica acceso y nombres:
no demuestra tipos, claves, ROWVERSION, restricciones, permisos completos,
atomicidad ni concurrencia. Un fallo devuelve un mensaje seguro y código 1.

La conexión integrada utiliza el usuario Windows que ejecuta Python. No uses
credenciales compartidas ni cambies a `sa`. Actualmente `Encrypt=yes` y
`TrustServerCertificate=yes` están limitados al desarrollo local; una instalación
fuera de ese alcance requiere revisar certificado y verificación TLS antes de
considerarse apta para producción.

## 6. Abrir Streamlit en modo de solo lectura

En la misma PowerShell con las variables anteriores:

```powershell
.\.venv\Scripts\python.exe -m streamlit run app.py --server.address 127.0.0.1
```

Abre [http://localhost:8501](http://localhost:8501). Solo se enlaza la interfaz
local. Detén con Ctrl+C. No se necesita abrir puertos de entrada ni publicar la
aplicación. El modo de solo lectura bloquea las tres entradas de escritura en
la capa de datos y deshabilita sus botones, sin alterar permisos del servidor.
Para aislamiento adicional pide una identidad SQL autorizada con solo SELECT.

Comprueba sin guardar ni confirmar:

1. **Dashboard:** cambia fechas y actualiza; distingue cero, vacío y fallo.
2. **Productos:** busca y consulta activos/inactivos. Guardar y Desactivar
   deben permanecer deshabilitados.
3. **Ventas:** prepara un carrito ficticio, cambia cantidades y elimina líneas.
   Confirmar venta debe estar deshabilitado; el carrito no reserva existencias.
4. **Inventario:** filtra alertas; el stock igual al mínimo cuenta como alerta.
5. **Reportes:** genera el periodo, cambia CSV/Excel/PDF y abre las descargas.
   Comprueba filtros, acentos, códigos, totales y paginación. CSV tiene cinco
   filas de metadatos antes de los encabezados; importa códigos como texto.
6. **Asistente IA:** consulta las cuatro preguntas y contrasta las respuestas
   con las tablas. Groq debe mostrarse desactivado.
7. Navega entre las seis pantallas; verifica persistencia de carrito y reportes.

El inventario siempre es actual. Las ventas usan el reloj local SQL sin zona;
la fecha de generación usa la zona del servidor de la aplicación. El ranking
incluye como máximo ocho productos y muestra sus nombres actuales. Las consultas
independientes no representan una instantánea transaccional.

## 7. Groq opcional: prueba separada con agregados sintéticos

No se necesita para validar la aplicación guiada. No se probó con un proveedor
real en esta entrega. Consulta [GROQ.md](GROQ.md) antes de habilitarlo. La clave
se debe inyectar mediante el gestor de secretos del servidor; no se escribe
en archivos versionados, ni se solicita dentro de la UI.

Para una prueba local puntual en la base ficticia, PowerShell puede recibir la
clave sin eco ni literal en el historial. El ejemplo no se ejecuta durante CI:

```powershell
$claveSegura = Read-Host 'Clave de Groq para la prueba' -AsSecureString
try {
    $env:GROQ_API_KEY = [System.Net.NetworkCredential]::new('', $claveSegura).Password
    $env:DATACORE_GROQ_ENABLED = '1'
    $env:GROQ_MODEL = 'llama-3.3-70b-versatile'
    $env:DATACORE_READ_ONLY = '1'
    .\.venv\Scripts\python.exe -m streamlit run app.py --server.address 127.0.0.1
}
finally {
    Remove-Item Env:GROQ_API_KEY -ErrorAction SilentlyContinue
    $env:DATACORE_GROQ_ENABLED = '0'
    $claveSegura.Dispose()
}
```

Verifica primero que el modelo siga disponible en tu cuenta; su disponibilidad
no está garantizada por esta prueba. La clave permanece en el entorno del proceso
mientras se ejecuta la aplicación. No captures ni imprimas ese entorno. En el
asistente revisa el JSON agregado y autoriza solo el envío de datos sintéticos.
Groq no recibe nombres, códigos, clientes ni acceso SQL. La explicación puede
fallar o equivocarse; la respuesta verificada debe seguir disponible. Detén
Streamlit y cierra la sesión al terminar.

## 8. Escrituras y validación pendiente

No desactives el modo de solo lectura para completar esta lista. El registro de
productos/ventas y las pruebas de bloqueos reales requieren autorización aparte,
una base de pruebas identificada, un plan de verificación y un usuario autorizado.
La aplicación histórica permite escrituras si DATACORE_READ_ONLY está ausente o
vale `0`; conserva `1` en la sesión de revisión. No cambies este modo durante una
venta de resultado incierto. Su UUID debe preservarse hasta reconciliarla.

Las cuatro pruebas optativas `DATACORE_TEST_SQL=1` esperan los ejemplos DEMO-001
a DEMO-020. No las actives en una base real ni cargues datos para hacerlas pasar.
La suite aislada fuerza `0`; una integración autorizada se ejecuta por separado.

## Problemas frecuentes

| Síntoma | Comprobación |
| --- | --- |
| `py -3.13` no existe | Instala Python 3.13 x64 con su lanzador y abre otra PowerShell |
| Falta ODBC 18 | Instala el controlador x64; pip no lo instala |
| Servicio ausente/detenido | Revisa que la instancia de pruebas se llame SQLEXPRESS con el administrador |
| No abre DataCoreAI | Confirma base, instancia y permisos de la misma cuenta Windows; no cambies autenticación para ocultar el fallo |
| Faltan tablas/columnas | Revisa scripts y compatibilidad en la instancia de pruebas; no ejecutes borrados |
| Sin categorías o ventas | Es válido con base vacía; datos ficticios son opcionales y solo para pruebas |
| Excel/PDF supera límites | Reduce el periodo o usa CSV; véase EXPORTACIONES.md |
| Groq falla | Revisa clave, modelo, cuota y conectividad sin imprimir valores; conserva modo guiado |
| Una venta queda incierta | Conserva UUID y contenido; no confirmes otra venta hasta reconciliarla |
