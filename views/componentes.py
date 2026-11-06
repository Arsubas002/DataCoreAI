"""Componentes visuales compartidos; no consultan ni modifican datos."""
from datetime import date, timedelta

import streamlit as st

DESCRIPCIONES = {
    "Dashboard": "Una visión clara de tus ventas y existencias.",
    "Productos": "Catálogo, precios y disponibilidad de tu negocio.",
    "Ventas": "Prepara ventas y consulta su historial en un solo lugar.",
    "Inventario": "Detecta productos agotados y anticipa reposiciones.",
    "Asistente IA": "Respuestas comerciales con fuentes y cálculos verificables.",
    "Reportes": "Información lista para analizar y compartir.",
}


def periodo(clave):
    izquierda, derecha = st.columns(2)
    with izquierda:
        inicio = st.date_input("Desde", date.today() - timedelta(days=29),
                               min_value=date(1, 1, 1), max_value=date(9999, 12, 30), key=f"{clave}_desde")
    with derecha:
        fin = st.date_input("Hasta (inclusive)", date.today(),
                            min_value=date(1, 1, 1), max_value=date(9999, 12, 30), key=f"{clave}_hasta")
    st.caption("Periodo inclusivo · Fechas locales de SQL Server · Moneda: soles (S/)")
    return inicio, fin


def cabecera(pantalla):
    st.caption("DATACORE AI / GESTIÓN COMERCIAL")
    st.title(pantalla)
    st.write(DESCRIPCIONES[pantalla])


def tarjeta_metrica(columna, etiqueta, valor):
    with columna:
        with st.container(border=True):
            st.metric(etiqueta, valor)
