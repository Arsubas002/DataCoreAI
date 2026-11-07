"""Asistente de lectura con explicación Groq opcional y envío explícito."""
from datetime import datetime
import hashlib
import json

import streamlit as st

from database.dashboard import resumen_comercial
from views.componentes import periodo, tabla_comercial
from services.asistente import PREGUNTAS, responder
from services.groq import ErrorGroq, configuracion_desde_entorno, evidencia_permitida, explicar_con_groq


def mostrar_asistente():
    st.write("Consulta indicadores del negocio con respuestas basadas en datos.")
    st.info("Modo guiado: selecciona una pregunta. No hay un modelo activo en estas respuestas: usan reglas y cálculos verificables. La explicación con Groq es opcional cuando el servidor la habilita.")
    with st.form("consulta_asistente"):
        pregunta = st.selectbox("Pregunta", PREGUNTAS)
        inicio, fin = periodo("asistente")
        with st.container(key="primary_action"):
            enviar = st.form_submit_button("Consultar asistente", type="primary", icon=":material/auto_awesome:")
    if enviar:
        st.session_state.pop("respuesta_asistente", None)
        st.session_state.pop("evidencia_asistente", None)
        st.session_state.pop("explicacion_groq", None)
        try:
            datos = resumen_comercial(inicio, fin)
            texto, filas = responder(pregunta, datos)
        except ValueError as error:
            st.warning(str(error))
        except Exception:
            st.error("No fue posible consultar la información. Comprueba la conexión con DataCoreAI.")
        else:
            st.session_state.respuesta_asistente = (pregunta, inicio, fin, datetime.now().astimezone(), texto, filas)
            st.session_state.evidencia_asistente = datos
    if "respuesta_asistente" in st.session_state:
        pregunta, inicio, fin, generado, texto, filas = st.session_state.respuesta_asistente
        with st.chat_message("assistant", avatar=":material/auto_awesome:"):
            st.subheader(pregunta)
            st.write(texto)
            if filas:
                tabla_comercial(filas)
            st.caption(f"Fuente: DataCoreAI · Periodo consultado: {inicio} a {fin}, inclusive · Consulta: {generado:%d/%m/%Y %H:%M %z}")
            st.caption("Fechas locales de SQL Server. Inventario actual. Vuelve a consultar para actualizar la respuesta; las consultas no forman una instantánea transaccional.")
            mostrar_opcion_groq(pregunta)
    st.caption("Solo lectura: no registra ventas ni cambia existencias. El modo guiado no envía datos externos; Groq requiere envío explícito.")


def mostrar_opcion_groq(pregunta):
    try:
        configuracion = configuracion_desde_entorno()
    except ErrorGroq as error:
        st.warning(str(error))
        return
    if configuracion is None:
        st.caption("Groq desactivado en el servidor. Puedes seguir usando todas las consultas guiadas.")
        return
    datos = st.session_state.evidencia_asistente
    try:
        evidencia = evidencia_permitida(pregunta, datos)
    except ErrorGroq as error:
        st.warning(str(error))
        return
    # La autorización del checkbox se vincula al contenido exacto de la consulta.
    huella = hashlib.sha256(json.dumps([pregunta, evidencia, st.session_state.respuesta_asistente[3].isoformat()], sort_keys=True).encode()).hexdigest()[:16]
    with st.expander("Explicación con Groq (opcional)"):
        st.caption("Se enviarán a Groq la pregunta permitida y los agregados que aparecen abajo. No se envían nombres, códigos, clientes ni credenciales de SQL. Puede consumir cuota del proveedor.")
        st.json(evidencia)
        permitir = st.checkbox("Autorizo enviar este resumen a Groq", key=f"consentimiento_groq_{huella}")
        if st.button("Generar explicación con Groq", disabled=not permitir, key=f"generar_groq_{huella}"):
            st.session_state.pop("explicacion_groq", None)
            try:
                with st.spinner("Solicitando explicación..."):
                    st.session_state.explicacion_groq = explicar_con_groq(pregunta, datos)
            except ErrorGroq as error:
                st.warning(str(error))
            except Exception:
                st.error("No fue posible obtener la explicación. La respuesta verificada sigue disponible.")
        if "explicacion_groq" in st.session_state:
            st.caption("Texto generado por IA; contrástalo con la respuesta y las tablas verificadas. No se ejecutan instrucciones del modelo.")
            # Texto plano: ni HTML ni enlaces Markdown del proveedor se activan.
            st.text(st.session_state.explicacion_groq)
