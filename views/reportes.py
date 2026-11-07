"""Constructor de reportes: configuración y previsualización con pestañas."""

from datetime import datetime
import streamlit as st
from database.dashboard import resumen_comercial
from views.componentes import periodo, tabla_comercial, estado_vacio, paso
from services.reportes import csv_reporte
from services.exportaciones import excel_reporte, pdf_reporte


def mostrar_reportes():
    configurar, previsualizar = st.columns([0.85, 1.8], gap="medium")
    with configurar, st.container(key="report_config"):
        paso(1, "Configura la salida")
        formato = st.selectbox(
            "Formato de descarga", ("CSV", "Excel", "PDF"), key="formato_reporte"
        )
        with st.form("filtros_reportes", border=False):
            inicio, fin = periodo("reportes", apilado=True)
            consultar = st.form_submit_button(
                "Generar reporte",
                type="primary",
                icon=":material/description:",
                width="stretch",
            )
        st.caption(
            "CSV: 100.000 filas · Excel: 5.000 · PDF: 2.000 · Hasta 10 MiB por archivo."
        )
        with st.expander("Qué incluye cada archivo"):
            st.write(
                "Ingresos por día, hasta 8 productos más vendidos e inventario actual. Los tres usan el mismo reporte generado."
            )
            st.caption(
                "El inventario es actual, no histórico. Las fechas de ventas corresponden al reloj local de SQL Server."
            )
    if consultar:
        st.session_state.pop("reporte_generado", None)
        st.session_state.pop("archivos_reporte", None)
        try:
            datos = resumen_comercial(inicio, fin)
        except ValueError as error:
            st.warning(str(error))
        except Exception:
            st.error(
                "No fue posible generar el reporte. Comprueba la conexión con DataCoreAI."
            )
        else:
            st.session_state.reporte_generado = (
                inicio,
                fin,
                datetime.now().astimezone(),
                datos,
            )
    with previsualizar, st.container(key="report_preview"):
        paso(2, "Revisa y descarga")
        if "reporte_generado" not in st.session_state:
            st.info("Selecciona el periodo y pulsa Generar reporte.")
            estado_vacio(
                "Tu reporte empieza aquí",
                "Define un periodo a la izquierda. Podrás revisar cada conjunto antes de descargarlo.",
            )
            return
        inicio, fin, generado, datos = st.session_state.reporte_generado
        st.caption(
            f"{inicio:%d/%m/%Y} — {fin:%d/%m/%Y} · Generado: {generado:%d/%m/%Y %H:%M %z} · Moneda: S/"
        )
        generador, extension, mime = {
            "CSV": (csv_reporte, "csv", "text/csv"),
            "Excel": (
                excel_reporte,
                "xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ),
            "PDF": (pdf_reporte, "pdf", "application/pdf"),
        }[formato]
        archivos = st.session_state.setdefault("archivos_reporte", {})
        tipos = (
            ("tendencia", "Ingresos por día"),
            ("productos_vendidos", "Los 8 productos más vendidos"),
            ("inventario", "Inventario actual"),
        )
        pestanas = st.tabs([titulo for _, titulo in tipos])
        for pestana, (tipo, titulo) in zip(pestanas, tipos):
            with pestana:
                filas = datos[tipo]
                if filas:
                    tabla_comercial(filas)
                else:
                    st.info("Sin resultados para este reporte.")
                clave = (tipo, formato)
                try:
                    if clave not in archivos:
                        archivos[clave] = generador(filas, tipo, inicio, fin, generado)
                    st.download_button(
                        f"Descargar {titulo} ({formato})",
                        archivos[clave],
                        file_name=f"datacore_{tipo}.{extension}",
                        mime=mime,
                        key=f"descarga_{tipo}_{formato}",
                        on_click="ignore",
                        icon=":material/download:",
                        width="stretch",
                    )
                except ValueError as error:
                    st.warning(str(error))
                except Exception:
                    st.error(
                        "No fue posible preparar este archivo. Prueba otro formato o reduce el periodo."
                    )
        st.caption(
            "Las descargas reflejan el reporte generado. Para cambiar los datos, vuelve a pulsar Generar reporte. Nombres actuales; consultas sin instantánea transaccional."
        )
