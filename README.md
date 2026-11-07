# DataCore AI

## Versión candidata para pruebas locales

Aplicación de gestión comercial con seis pantallas integradas, reportes CSV/Excel/PDF
y asistente comercial con explicación Groq opcional. La rama final parte de la PR #7
y conserva sus commits y los desarrollos anteriores.
El desarrollo se publica mediante PR en `Arsubas002/DataCoreAI`; no se fusiona
a main ni se despliega automáticamente.

Consulta la [guía completa de Windows y SQL Server Express](docs/INSTALACION_WINDOWS.md)
y el [informe final de integración](docs/INFORME_FINAL.md).

### Instalar y ejecutar

Requisitos: Python 3.13, SQL Server Express con la instancia local
`localhost\SQLEXPRESS`, Microsoft ODBC Driver 18 for SQL Server y permisos de
acceso para el usuario de Windows que ejecuta la aplicación.

Desde PowerShell, en la carpeta del proyecto:

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -c constraints-tested.txt -r requirements.txt
$env:DATACORE_READ_ONLY = "1"
$env:DATACORE_GROQ_ENABLED = "0"
.\.venv\Scripts\python.exe -m streamlit run app.py
```

Abre `http://localhost:8501`. No se necesita activar el entorno virtual.
El inicio recomendado usa solo lectura: permite consultar/exportar y bloquea
escrituras en productos y ventas antes de conectar. La interfaz se enlaza solo a
127.0.0.1 y no recopila estadísticas de uso. No es un despliegue multiusuario.
La conexión SQL usa autenticación integrada de Windows, sin claves API.
Groq es opcional y requiere una clave segura separada. El dashboard comercial, Reportes, Productos, Inventario y Ventas utilizan
`DataCoreAI` explícitamente. `DATACORE_DATABASE` solo afecta a llamadas de
conexión sin base explícita.
Los archivos `.env` no se cargan automáticamente: usa variables del proceso.
La instancia está definida en `database/connection.py`; si tu instalación usa
otra instancia, adapta ese valor sin incorporar credenciales al código.

### Dashboard y reportes

Dashboard presenta ventas del periodo y existencias actuales. Reportes permite
seleccionar un intervalo inclusivo y generar CSV, Excel o PDF de: ingresos diarios,
los ocho productos más vendidos e inventario actual. Las fechas de ventas son
locales de SQL Server (DATETIME2 sin zona). Los nombres son los actuales.
Los importes permanecen en Decimal; solo la representación gráfica usa float.
Las descargas conservan el periodo y la hora de generación visibles hasta
solicitar otro reporte. No hay caché compartida ni archivos persistentes.
Los CSV incluyen metadatos antes de la tabla y neutralizan fórmulas en texto.
Para conservar ceros iniciales al abrir un CSV, importa códigos como texto.
Consulta [formatos, límites y pruebas de exportación](docs/EXPORTACIONES.md).
Excel/PDF se generan en memoria con openpyxl y ReportLab, sin fuentes remotas.
Las consultas separadas del resumen
no garantizan una instantánea consistente ante ventas concurrentes.

Consulta [la revisión de PR #1 y #2](docs/REVISION_PR_1_2.md) para hallazgos,
validación y límites. La [consolidación](docs/CONSOLIDACION.md) integra las PR #1–#4 en una rama
revisable, sin fusionar main.

### Asistente de consultas

Asistente IA ofrece un modo guiado con cuatro preguntas: ingresos, ticket
promedio, productos más vendidos y alertas de stock. Consulta únicamente al
pulsar su botón, muestra periodo, fuente y hora, y conserva la respuesta hasta
otra consulta. El ticket usa Decimal con redondeo monetario HALF_UP; sin ventas
se presenta como no definido. El stock siempre es actual.
El modo guiado no envía datos externos. La [integración opcional con Groq](docs/GROQ.md)
está desactivada por defecto; con configuración segura permite explicar únicamente
agregados de preguntas permitidas, tras autorización y envío explícitos. El modelo
no tiene acceso a SQL ni a herramientas de escritura. Su texto se muestra separado
de los resultados verificados. No se han realizado llamadas reales en las pruebas.

Consulta las [capturas de validación visual con datos sintéticos](docs/VALIDACION_VISUAL.md).

### Preparar SQL Server

Revisa los scripts antes de ejecutarlos manualmente en SSMS con autenticación
de Windows. La aplicación no ejecuta estos scripts automáticamente:

1. `sql/01_crear_base_y_tablas.sql`: crea la base y las tablas que falten.
2. `sql/02_datos_prueba.sql`: opcional; agrega registros ficticios faltantes.
3. `sql/03_solicitudes_ventas.sql`: crea la tabla auxiliar necesaria para confirmar ventas.

En una base existente, revisa la compatibilidad del esquema y autoriza cualquier
cambio antes de ejecutar SQL. Los scripts contienen `GO` y se ejecutan desde
SSMS. Esta preparación para GitHub no ejecuta SQL ni modifica datos.
Consulta [ETAPA_3.md](ETAPA_3.md) para el comportamiento de ventas y reintentos.

### Pruebas y archivos privados

```powershell
.\.venv\Scripts\python.exe -m pip install -c constraints-tested.txt -r requirements-dev.txt
.\.venv\Scripts\python.exe scripts/pruebas_aisladas.py
```

Instala `requirements-dev.txt` para incluir el lector PDF usado en las pruebas.
El ejecutor desactiva SQL real/Groq y falla ante cualquier intento SQL/HTTP real
o cero tests. Guarda un resumen en test-results/resultado.json (excluido de Git).
GitHub Actions lo ejecuta en Linux y Windows con Python 3.13; ninguna de esas
pruebas demuestra conexión a SQL Server Express o Groq reales.

Conserva en Git los archivos Python, SQL, tests, `requirements.txt`, la
documentación y `.streamlit/config.toml` (solo tema y configuración pública).
`.gitignore` excluye entornos, cachés, `.env`, secretos de Streamlit, claves,
bases locales, copias, exportaciones y logs. Mantén toda configuración privada
fuera del código; revisa también cualquier archivo nuevo antes de subirlo.
Los nombres y contactos de `sql/02_datos_prueba.sql` son ejemplos ficticios.

Las secciones históricas siguientes describen etapas anteriores; para instalar
y ejecutar la versión actual utiliza esta guía de inicio rápido.

La etapa 3 agrega ventas, carrito e historial. Consulta [ETAPA_3.md](ETAPA_3.md)
para revisar el nuevo script auxiliar, las transacciones, las pruebas y el uso.
Las secciones siguientes conservan la documentación de etapas anteriores.

## Segunda etapa: productos e inventario

La sección original de la primera etapa se conserva abajo como referencia.
Ahora Productos permite registrar, buscar por código o nombre, consultar activos
e inactivos, editar productos activos y desactivarlos con confirmación.
Inventario consulta productos activos y marca como stock bajo las existencias
menores o iguales al mínimo configurable de cada producto; cero es «Agotado».
Ventas, Reportes y Asistente IA continúan como pantallas iniciales.

### Archivos agregados

- `sql/01_crear_base_y_tablas.sql`: creación condicional de DataCoreAI y sus cinco tablas.
- `sql/02_datos_prueba.sql`: cuatro categorías, 20 productos y 10 clientes ficticios.
- `database/productos.py`: validaciones y consultas parametrizadas.
- `views/productos.py` y `views/inventario.py`: pantallas nuevas.
- `views/__init__.py` y `tests/test_productos.py`: organización y pruebas aisladas.

Se conserva `database/connection.py` y sus funciones. La prueba del Dashboard
mantiene su comportamiento original; Productos e Inventario solicitan
explícitamente `DataCoreAI`, independientemente de `DATACORE_DATABASE`.

### Revisión de SQL antes de cualquier ejecución

**Los scripts se entregan para revisión. La aplicación no los ejecuta. No ejecutes
cambios de esquema ni datos de prueba hasta revisar y autorizar su contenido.**

Después de esa autorización, abre SQL Server Management Studio (SSMS), conecta a
`localhost\SQLEXPRESS` con autenticación de Windows y ejecuta primero
`sql/01_crear_base_y_tablas.sql`. Después, si deseas los registros ficticios,
ejecuta `sql/02_datos_prueba.sql`. Usa SSMS porque los archivos contienen `GO`.

El primer script no borra, trunca ni altera tablas existentes: omite cada tabla
que ya existe. Si ya tienes tablas con otros campos, revisa su compatibilidad;
no se migran automáticamente. Las tablas nuevas tienen claves primarias y
foráneas sin borrado en cascada, códigos/documentos únicos y restricciones de
valores no negativos. Los importes son `DECIMAL(12,2)`. `ROWVERSION` permite
detectar ediciones concurrentes; no es una fecha.

El segundo script omite categorías por nombre, productos por código y clientes
por documento. Nunca reemplaza nombres, precios, cantidades ni estados previos.
En una base vacía añade 20 productos y 10 clientes; si alguna clave ya existe,
añadirá únicamente los registros faltantes. Cada script agrupa sus operaciones
de tablas/datos en una transacción con `XACT_ABORT`; la creación de la base
está separada. No se crean ventas de prueba. La conciliación del total de una
venta con sus detalles se implementará en la etapa de ventas.

### Ejecución y pruebas sin modificar la base

Con tu entorno de Python y las dependencias de la primera etapa disponibles:

```powershell
Set-Location E:\DataCoreAI
python -m compileall -q app.py database views tests
python -m unittest discover -s tests -v
python -m streamlit run app.py
```

Si usas `.venv`, sustituye `python` por `.\.venv\Scripts\python.exe`.
No hay dependencias nuevas que instalar. Las pruebas usan `unittest` y conexiones
simuladas: no abren SQL Server ni crean, editan o insertan registros reales.
Comprueban validaciones, duplicados, consultas parametrizadas, confirmación y
reversión de transacciones, cierre de conexiones y conflictos de edición.
No sustituyen una validación del SQL en el servidor tras tu autorización.

Antes de ejecutar los scripts, Productos e Inventario mostrarán un aviso si no
existe el esquema. Eso no dispara ninguna creación automática.

### Prueba manual después de autorizar y ejecutar SQL

1. Abre Productos: busca `DEMO-002`, comprueba su precio y existencias.
2. Abre Inventario: filtra alertas; `DEMO-010` debe figurar como agotado y
   `DEMO-008`, con cinco unidades y mínimo cinco, como stock bajo.
3. Cuando autorices cambios de productos, registra un código propio y edítalo.
   Prueba un nombre vacío, precio negativo, más de dos decimales y un código
   ya existente: deben rechazarse sin guardar.
4. Confirma la desactivación y consulta «Mostrar también productos inactivos»:
   el registro permanece y deja de aparecer en el inventario activo.
5. Si otra sesión modifica el producto, guardar debe rechazar la versión antigua.
   Usa «Recargar versión del producto» para revisar el estado actual antes de editar.

Las acciones de guardar y desactivar sí modifican datos, solo cuando el usuario
pulsa sus botones. No se han realizado como parte de las pruebas automáticas.
Los precios usan punto decimal, sin separador de miles ni símbolo de moneda.
Las existencias se ajustan en Productos; aún no hay historial de movimientos.

Referencias: [formularios de Streamlit](https://docs.streamlit.io/develop/concepts/architecture/forms)
y [CREATE TABLE de SQL Server](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-table-transact-sql?view=sql-server-ver17).

---

## Referencia conservada: primera etapa

Aplicación web de gestión comercial construida con Python 3.13 y Streamlit.
Esta primera etapa prepara la interfaz y la conexión a SQL Server Express 2025.
No crea bases de datos ni tablas, no guarda ventas y no integra un chatbot.

## Estructura

```text
DataCoreAI/
├── app.py                    # Interfaz y seis pantallas iniciales
├── database/
│   ├── __init__.py
│   └── connection.py         # Conexión y prueba de SQL Server
├── .streamlit/
│   └── config.toml           # Tema oscuro
├── requirements.txt
├── .gitignore
└── README.md
```

## Requisitos previos

- Python 3.13 con pip disponible en PowerShell como `python`.
  Comprueba la versión con `python --version`.
- SQL Server Express 2025, instancia `localhost\SQLEXPRESS` iniciada.
- Microsoft ODBC Driver 18 for SQL Server para Windows, con arquitectura
  compatible con Python. Es un componente externo; pip no lo instala.
  [Descarga oficial de Microsoft](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server).
- Permisos de acceso a SQL Server para el usuario de Windows que ejecuta Streamlit.

## Instalación y ejecución en PowerShell

Los siguientes comandos se proporcionan para que los ejecutes tú.
No se instalan dependencias automáticamente.

```powershell
Set-Location E:\DataCoreAI
python --version
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -c constraints-tested.txt -r requirements.txt
.\.venv\Scripts\python.exe -m streamlit run app.py
```

No necesitas activar el entorno virtual ni cambiar la política de PowerShell.
Si tienes varias versiones de Python, utiliza la ruta de Python 3.13 para crear
el entorno. Si tu instalación ofrece el lanzador `py`, puedes usar
`py -3.13 -m venv .venv` en lugar de `python -m venv .venv`.

Abre `http://localhost:8501` en el navegador. Detén el servidor con `Ctrl+C`.
Ejecuta los comandos desde la raíz del proyecto para cargar el tema oscuro.

## Pantallas

- **Dashboard:** indicadores sin datos, accesos informativos y prueba de conexión.
- **Productos:** presentación del futuro catálogo.
- **Ventas:** presentación del futuro historial de ventas.
- **Inventario:** presentación del futuro control de existencias.
- **Asistente IA:** aviso de funcionalidad futura, sin llamadas a Groq.
- **Reportes:** espacio reservado para futuros análisis con Pandas y Plotly.

Los indicadores muestran `—` porque todavía no existen datos del negocio.
Pandas y Plotly quedan como dependencias preparadas; aún no se generan gráficos.

## Conexión a SQL Server

En Dashboard, pulsa **Probar conexión**. La aplicación solo abre y cierra una
conexión mediante pyodbc. No ejecuta consultas ni realiza cambios en el servidor.
La interfaz también se puede abrir con SQL Server apagado.

El módulo utiliza autenticación integrada de Windows (`Trusted_Connection=yes`),
sin guardar nombres de usuario, contraseñas o claves API. Por defecto conecta
a `master`, que ya existe, porque la base del proyecto aún no se ha creado.
Cuando exista una base del proyecto puedes elegirla mediante la variable:

```powershell
$env:DATACORE_DATABASE = "DataCoreAI"
.\.venv\Scripts\python.exe -m streamlit run app.py
```

Este comando no crea la base: debe existir previamente en una etapa posterior.
También puedes pasar su nombre a `obtener_conexion(base_datos="DataCoreAI")`.
Al usar la conexión desde otro módulo, ciérrala con `try/finally` y `close()`.

La conexión local usa cifrado con `Encrypt=yes` y acepta el certificado del
servidor con `TrustServerCertificate=yes`, para facilitar el desarrollo con
certificados autofirmados. Para un despliegue real se debe configurar un
certificado válido y usar `TrustServerCertificate=no`.
[Referencia oficial de Microsoft](https://learn.microsoft.com/en-us/sql/connect/odbc/connection-troubleshooting?view=sql-server-ver17).

Si la prueba falla, verifica el servicio SQL Server (SQLEXPRESS), el controlador
ODBC 18, la existencia de la base seleccionada y los permisos de Windows.

## Comprobación de sintaxis

Desde la raíz del proyecto, sin conectarse a SQL Server:

```powershell
.\.venv\Scripts\python.exe -m compileall -q app.py database
```

El comando revisa la sintaxis; no verifica el funcionamiento de Streamlit ni
la disponibilidad de SQL Server. Las versiones de requirements.txt están
acotadas por versión principal; no constituyen un archivo de bloqueo exacto.

El tema está configurado según la
[documentación de Streamlit](https://docs.streamlit.io/develop/concepts/configuration/theming).
