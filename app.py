"""Interfaz inicial de DataCore AI. Ejecutar con streamlit run app.py."""

import streamlit as st

from database.connection import probar_conexion
from views.productos import mostrar_productos
from views.inventario import mostrar_inventario
from views.ventas import mostrar_ventas


st.set_page_config(page_title="DataCore AI", page_icon="📊", layout="wide")

# Los colores principales se configuran en .streamlit/config.toml.
st.markdown(
    """
    <style>
    .block-container {padding-top: 2rem; max-width: 1400px;}
    h1 {letter-spacing: -1px;}
    div[data-testid="stMetric"] {
        background: #172235; padding: 20px; border-radius: 14px;
        border: 1px solid #29364a;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

with st.sidebar:
    st.title("📊 DataCore AI")
    st.caption("GESTIÓN COMERCIAL")
    st.divider()
    pantalla = st.radio(
        "Menú principal",
        ["Dashboard", "Productos", "Ventas", "Inventario", "Asistente IA", "Reportes"],
    )
    st.divider()
    st.caption("Etapa 3 · Ventas e inventario")
    st.caption("SQL Server · Autenticación de Windows")

st.caption("DATACORE AI / PANEL DE GESTIÓN")
st.title(pantalla)

if pantalla == "Dashboard":
    st.write("Tu negocio, organizado en un solo lugar.")
    st.info("Bienvenido. Las métricas se habilitarán al implementar los datos del negocio.")
    columnas = st.columns(3)
    for columna, nombre in zip(columnas, ["Ventas totales", "Productos", "Unidades en inventario"]):
        columna.metric(nombre, "—")
    st.caption("Sin datos conectados: los indicadores todavía no representan valores reales.")
    st.subheader("Espacio de trabajo")
    izquierda, derecha = st.columns(2)
    with izquierda:
        with st.container(border=True):
            st.markdown("#### Operación comercial")
            st.write("Accede a Productos, Ventas e Inventario desde el menú lateral.")
    with derecha:
        with st.container(border=True):
            st.markdown("#### Análisis e inteligencia")
            st.write("Reportes y Asistente IA se desarrollarán en próximas etapas.")
    st.subheader("Conexión a SQL Server")
    st.caption(r"Servidor: localhost\SQLEXPRESS · La prueba solo abre y cierra una conexión.")
    if st.button("Probar conexión", type="primary"):
        with st.spinner("Comprobando conexión..."):
            correcta, mensaje = probar_conexion()
        if correcta:
            st.success(mensaje)
        else:
            st.error(mensaje)

elif pantalla == "Productos":
    mostrar_productos()

elif pantalla == "Ventas":
    mostrar_ventas()

elif pantalla == "Inventario":
    mostrar_inventario()

elif pantalla == "Asistente IA":
    st.write("Un futuro asistente para consultar información del negocio.")
    st.info("Disponible en una próxima etapa. Todavía no existe integración con Groq API.")

elif pantalla == "Reportes":
    st.write("Convierte los datos de tu negocio en información útil.")
    st.info("Pantalla inicial. Los reportes con Pandas y Plotly se incorporarán después.")
    st.subheader("Análisis del negocio")
    st.caption("Aquí se mostrarán los gráficos y resúmenes cuando existan datos reales.")

st.divider()
st.caption("DataCore AI · Proyecto final de programación · Tercera etapa")
