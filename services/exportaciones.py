"""Excel y PDF de solo lectura, generados en memoria con límites explícitos."""
from datetime import date, datetime
from decimal import Decimal
from io import BytesIO
from pathlib import Path
from threading import Lock
from xml.sax.saxutils import escape

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
import reportlab
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import LongTable, Paragraph, SimpleDocTemplate, Spacer, TableStyle

from services.reportes import COLUMNAS, validar_numero

MAX_FILAS = 5000
MAX_FILAS_PDF = 2000
MAX_BYTES = 10 * 1024 * 1024
_FUENTES = Lock()
TITULOS = {"tendencia": "Ingresos por día", "productos_vendidos": "Los 8 productos más vendidos",
           "inventario": "Inventario actual"}
MONETARIAS = {"TotalVentas", "Ingresos"}


def _validar(filas, tipo, limite):
    if tipo not in COLUMNAS:
        raise ValueError("Tipo de reporte no permitido.")
    if len(filas) > limite:
        raise ValueError(f"La exportación admite hasta {limite} filas. Reduce el periodo o utiliza CSV.")
    for fila in filas:
        for columna in COLUMNAS[tipo]:
            valor = fila[columna]
            validar_numero(valor)
            if isinstance(valor, str) and (len(valor) > 2000 or any(
                    ord(c) < 32 and c not in "\t\n\r" for c in valor)):
                raise ValueError("El reporte contiene texto demasiado largo o caracteres de control no admitidos.")


def _metadatos(tipo, filas, inicio, fin, generado):
    return [
        ("Fuente", "DataCoreAI"), ("Reporte", TITULOS[tipo]),
        ("Generado", generado.isoformat(timespec="seconds")),
        ("Desde inclusive", inicio.isoformat()), ("Hasta inclusive", fin.isoformat()),
        ("Moneda", "PEN (S/)"), ("Filas", len(filas)),
        ("Fechas", "Reloj local de SQL Server; sin conversión de zona horaria"),
        ("Alcance", "Existencias actuales, no históricas" if tipo == "inventario" else
         "Ventas del periodo; nombres actuales; hasta 8 productos" if tipo == "productos_vendidos" else
         "Una fila por día con ventas; días sin ventas no incluidos"),
        ("Consistencia", "Consultas independientes; no es una instantánea transaccional"),
    ]


def _bytes(salida):
    contenido = salida.getvalue()
    if len(contenido) > MAX_BYTES:
        raise ValueError("El archivo supera 10 MiB. Reduce el periodo o utiliza CSV.")
    return contenido


def excel_reporte(filas, tipo, inicio, fin, generado):
    """Celdas de texto explícitas sin fórmulas ni enlaces; importes numéricos."""
    _validar(filas, tipo, MAX_FILAS)
    libro = Workbook()
    meta = libro.active
    meta.title = "Información"
    for etiqueta, valor in _metadatos(tipo, filas, inicio, fin, generado):
        meta.append([etiqueta, valor])
    meta.column_dimensions["A"].width = 22
    meta.column_dimensions["B"].width = 90
    hoja = libro.create_sheet("Datos")
    columnas = COLUMNAS[tipo]
    hoja.append(columnas)
    for fila in filas:
        valores = []
        for columna in columnas:
            valor = fila[columna]
            if isinstance(valor, (int, Decimal)) and not isinstance(valor, bool):
                # Excel solo conserva 15 cifras significativas. No ocultar pérdida de céntimos.
                if abs(Decimal(valor)) >= Decimal("1000000000000"):
                    raise ValueError("Un valor supera la precisión numérica de esta exportación Excel. Utiliza CSV o PDF.")
            if isinstance(valor, (date, datetime)) and valor.year < 1900:
                valor = valor.isoformat()
            valores.append(valor)
        hoja.append(valores)
        for celda, columna in zip(hoja[hoja.max_row], columnas):
            if isinstance(celda.value, str):
                # Incluso =, +, -, @ y URLs permanecen texto sin ejecución/enlace.
                celda.data_type = "s"
                celda.number_format = "@"
            elif columna in MONETARIAS:
                celda.number_format = '#,##0.00'
            elif isinstance(celda.value, (date, datetime)):
                celda.number_format = "yyyy-mm-dd"
    for indice, columna in enumerate(columnas, 1):
        hoja.column_dimensions[get_column_letter(indice)].width = 42 if columna == "Nombre" else 22
    hoja.freeze_panes = "A2"
    hoja.auto_filter.ref = hoja.dimensions
    for hoja_actual in (hoja, meta):
        for celda in hoja_actual[1]:
            celda.fill = PatternFill("solid", fgColor="131E30")
            celda.font = Font(color="FFFFFF", bold=True)
        for fila in hoja_actual:
            for celda in fila:
                celda.alignment = Alignment(vertical="top", wrap_text=True)
    salida = BytesIO()
    libro.save(salida)
    libro.close()
    return _bytes(salida)


def _registrar_fuentes():
    with _FUENTES:
        if "DataCore" not in pdfmetrics.getRegisteredFontNames():
            carpeta = Path(reportlab.__file__).parent / "fonts"
            pdfmetrics.registerFont(TTFont("DataCore", str(carpeta / "Vera.ttf")))
            pdfmetrics.registerFont(TTFont("DataCoreBold", str(carpeta / "VeraBd.ttf")))


def pdf_reporte(filas, tipo, inicio, fin, generado):
    """Tabla paginada con encabezados repetidos y fuente local incluida en ReportLab."""
    _validar(filas, tipo, MAX_FILAS_PDF)
    _registrar_fuentes()
    salida = BytesIO()
    documento = SimpleDocTemplate(salida, pagesize=landscape(A4), rightMargin=30,
                                 leftMargin=30, topMargin=48, bottomMargin=36,
                                 title=TITULOS[tipo], author="DataCore AI")
    estilo = ParagraphStyle("dato", fontName="DataCore", fontSize=8, leading=11)
    numero = ParagraphStyle("numero", parent=estilo, alignment=TA_RIGHT)

    def parrafo(valor, formato=estilo):
        if isinstance(valor, Decimal):
            valor = f"{valor:,.2f}"
        return Paragraph(escape(str(valor)).replace("\n", "<br/>"), formato)

    elementos = [Paragraph(TITULOS[tipo], ParagraphStyle(
        "titulo", fontName="DataCoreBold", fontSize=17, leading=22))]
    for etiqueta, valor in _metadatos(tipo, filas, inicio, fin, generado):
        elementos.append(parrafo(f"{etiqueta}: {valor}"))
    elementos.append(Spacer(1, 14))
    columnas = COLUMNAS[tipo]
    tabla = [[parrafo(c) for c in columnas]]
    tabla.extend([[parrafo(fila[c], numero if c in MONETARIAS else estilo) for c in columnas]
                  for fila in filas])
    if not filas:
        elementos.append(parrafo("Sin resultados para este reporte."))
    anchos = [2 if c == "Nombre" else 1 for c in columnas]
    ancho = documento.width / sum(anchos)
    tabla_pdf = LongTable(tabla, colWidths=[ancho * peso for peso in anchos], repeatRows=1, splitInRow=1, hAlign="LEFT")
    tabla_pdf.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#DCECF5")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F1F5F9")]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, 0), 0.6, colors.HexColor("#64748B")),
        ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elementos.append(tabla_pdf)

    def pagina(canvas, doc):
        canvas.saveState()
        canvas.setFont("DataCore", 9)
        canvas.drawString(30, landscape(A4)[1] - 28, "DATACORE AI / REPORTE COMERCIAL")
        canvas.drawRightString(landscape(A4)[0] - 30, 20, f"Página {doc.page}")
        canvas.restoreState()

    documento.build(elementos, onFirstPage=pagina, onLaterPages=pagina)
    return _bytes(salida)
