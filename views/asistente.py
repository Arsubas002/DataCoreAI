"""Asistente guiado de lectura; sin proveedor generativo ni envío externo."""
from datetime import datetime

import streamlit as st

from database.dashboard import resumen_comercial
from views.componentes import periodo
from services.asistente import PREGUNTAS, responder


def mostrar_asistente():
    st.write("Consulta indicadores del negocio con respuestas basadas en datos.")
    st.info("Modo guiado: selecciona una pregunta. No hay un modelo de IA generativa conectado; las respuestas usan reglas y cálculos verificables.")
    with st.form("consulta_asistente"):
        pregunta = st.selectbox("Pregunta", PREGUNTAS)
        inicio, fin = periodo("asistente")
        enviar = st.form_submit_button("Consultar asistente", type="primary")
    if enviar:
        st.session_state.pop("respuesta_asistente", None)
        try:
            datos = resumen_comercial(inicio, fin)
            texto, filas = responder(pregunta, datos)
        except ValueError as error:
            st.warning(str(error))
        except Exception:
            st.error("No fue posible consultar la información. Comprueba la conexión con DataCoreAI.")
        else:
            st.session_state.respuesta_asistente = (pregunta, inicio, fin, datetime.now().astimezone(), texto, filas)
    if "respuesta_asistente" in st.session_state:
        pregunta, inicio, fin, generado, texto, filas = st.session_state.respuesta_asistente
        st.subheader(pregunta)
        st.write(texto)
        if filas:
            st.dataframe(filas, hide_index=True, width="stretch")
        st.caption(f"Fuente: DataCoreAI · Periodo consultado: {inicio} a {fin}, inclusive · Consulta: {generado:%d/%m/%Y %H:%M %z}")
        st.caption("Fechas locales de SQL Server. Inventario actual. Vuelve a consultar para actualizar la respuesta; las consultas no forman una instantánea transaccional.")
    st.caption("Solo lectura: no registra ventas, no cambia existencias y no envía datos a proveedores externos.")
