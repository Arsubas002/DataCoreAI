"""Reportes de lectura con descargas explícitas en memoria."""
from datetime import date, datetime, timedelta

import streamlit as st

from database.dashboard import resumen_comercial
from services.reportes import csv_reporte


def mostrar_reportes():
    st.write("Consulta y descarga ventas del periodo o inventario actual en CSV.")
    with st.form("filtros_reportes"):
        inicio = st.date_input("Desde", date.today() - timedelta(days=29))
        fin = st.date_input("Hasta (inclusive)", date.today(), max_value=date(9999, 12, 30))
        consultar = st.form_submit_button("Generar reporte")
    if consultar:
        # Una consulta fallida nunca conserva una descarga anterior como actual.
        st.session_state.pop("reporte_generado", None)
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
    for tipo, titulo in (("tendencia", "Ingresos por día"),
                         ("productos_vendidos", "Los 8 productos más vendidos"),
                         ("inventario", "Inventario actual")):
        st.subheader(titulo)
        filas = datos[tipo]
        if filas:
            st.dataframe(filas, hide_index=True, use_container_width=True)
        else:
            st.info("Sin resultados para este reporte.")
        st.download_button(f"Descargar {titulo} (CSV)",
                           csv_reporte(filas, tipo, inicio, fin, generado),
                           file_name=f"datacore_{tipo}.csv", mime="text/csv", key=f"csv_{tipo}")
    st.caption("Las descargas reflejan el periodo generado. Pulsa Generar reporte para actualizarlo.")
