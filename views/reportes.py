"""Reportes de lectura con descargas explícitas en memoria."""
from datetime import datetime

import streamlit as st

from database.dashboard import resumen_comercial
from views.componentes import periodo
from services.reportes import csv_reporte
from services.exportaciones import excel_reporte, pdf_reporte


def mostrar_reportes():
    st.write("Consulta y descarga ventas del periodo o inventario actual en CSV, Excel y PDF.")
    with st.form("filtros_reportes"):
        inicio, fin = periodo("reportes")
        consultar = st.form_submit_button("Generar reporte", type="primary")
    if consultar:
        # Una consulta fallida nunca conserva una descarga anterior como actual.
        st.session_state.pop("reporte_generado", None)
        st.session_state.pop("archivos_reporte", None)
        try:
            datos = resumen_comercial(inicio, fin)
        except ValueError as error:
            st.warning(str(error))
        except Exception:
            st.error("No fue posible generar el reporte. Comprueba la conexión con DataCoreAI.")
        else:
            st.session_state.reporte_generado = (inicio, fin, datetime.now().astimezone(), datos)
    if "reporte_generado" not in st.session_state:
        st.info("Selecciona el periodo y pulsa Generar reporte.")
        return
    inicio, fin, generado, datos = st.session_state.reporte_generado
    st.caption(f"Reporte generado: {generado:%d/%m/%Y %H:%M %z}. Periodo: {inicio} a {fin}, inclusive. Moneda: S/.")
    st.caption("Las fechas de ventas corresponden al reloj local de SQL Server. El inventario es actual, no histórico. Los nombres de productos son los actuales.")
    formato = st.selectbox("Formato de descarga", ("CSV", "Excel", "PDF"))
    st.caption("Excel: hasta 5.000 filas · PDF: hasta 2.000 filas · Máximo por archivo: 10 MiB. CSV para conjuntos mayores.")
    generador, extension, mime = {
        "CSV": (csv_reporte, "csv", "text/csv"),
        "Excel": (excel_reporte, "xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        "PDF": (pdf_reporte, "pdf", "application/pdf"),
    }[formato]
    archivos = st.session_state.setdefault("archivos_reporte", {})
    for tipo, titulo in (("tendencia", "Ingresos por día"),
                         ("productos_vendidos", "Los 8 productos más vendidos"),
                         ("inventario", "Inventario actual")):
        st.subheader(titulo)
        filas = datos[tipo]
        if filas:
            st.dataframe(filas, hide_index=True, width="stretch")
        else:
            st.info("Sin resultados para este reporte.")
        clave = (tipo, formato)
        try:
            if clave not in archivos:
                archivos[clave] = generador(filas, tipo, inicio, fin, generado)
            st.download_button(f"Descargar {titulo} ({formato})", archivos[clave],
                               file_name=f"datacore_{tipo}.{extension}", mime=mime,
                               key=f"descarga_{tipo}_{formato}", on_click="ignore")
        except ValueError as error:
            st.warning(str(error))
        except Exception:
            st.error("No fue posible preparar este archivo. Prueba otro formato o reduce el periodo.")

    st.caption("Las descargas reflejan el periodo generado. Pulsa Generar reporte para actualizarlo.")
