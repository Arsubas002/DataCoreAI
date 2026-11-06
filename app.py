"""Interfaz inicial de DataCore AI. Ejecutar con streamlit run app.py."""

import streamlit as st

from views.productos import mostrar_productos
from views.inventario import mostrar_inventario
from views.ventas import mostrar_ventas
from views.dashboard import mostrar_dashboard
from views.reportes import mostrar_reportes
from views.asistente import mostrar_asistente
from views.componentes import cabecera


st.set_page_config(page_title="DataCore AI", page_icon="📊", layout="wide")

with st.sidebar:
    st.title("📊 DataCore AI")
    st.caption("GESTIÓN COMERCIAL")
    st.divider()
    pantalla = st.radio(
        "Menú principal",
        ["Dashboard", "Productos", "Ventas", "Inventario", "Asistente IA", "Reportes"],
    )
    st.divider()
    st.caption("ESPACIO DE TRABAJO")
    st.caption("Dashboard · Reportes · Asistente")
    st.caption("SQL Server · Autenticación de Windows")

cabecera(pantalla)

if pantalla == "Dashboard":
    mostrar_dashboard()

elif pantalla == "Productos":
    mostrar_productos()

elif pantalla == "Ventas":
    mostrar_ventas()

elif pantalla == "Inventario":
    mostrar_inventario()

elif pantalla == "Asistente IA":
    mostrar_asistente()

elif pantalla == "Reportes":
    mostrar_reportes()

st.divider()
st.caption("DataCore AI · Gestión comercial con información verificable")
