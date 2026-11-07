"""Entrada de la interfaz comercial. Ejecutar con streamlit run app.py."""
import streamlit as st
from services.configuracion import solo_lectura
from views.productos import mostrar_productos
from views.inventario import mostrar_inventario
from views.ventas import mostrar_ventas
from views.dashboard import mostrar_dashboard
from views.reportes import mostrar_reportes
from views.asistente import mostrar_asistente
from views.componentes import cabecera, sistema_visual, menu_lateral

st.set_page_config(page_title="DataCore AI", page_icon="◈", layout="wide")
sistema_visual()
pantalla = menu_lateral()
with st.container(key="workspace"):
    cabecera(pantalla)
    if solo_lectura():
        st.caption(":material/lock: Solo lectura · Consulta y exportación disponibles. Guardar, desactivar y confirmar ventas están bloqueados.")
    rutas = {"Dashboard": mostrar_dashboard, "Productos": mostrar_productos,
             "Ventas": mostrar_ventas, "Inventario": mostrar_inventario,
             "Reportes": mostrar_reportes, "Asistente IA": mostrar_asistente}
    paneles = {"Productos":"panel_catalogo", "Inventario":"panel_inventario",
               "Asistente IA":"panel_asistente", "Reportes":"panel_reportes", "Ventas":"panel_ventas"}
    if pantalla in paneles:
        with st.container(key=paneles[pantalla]):
            rutas[pantalla]()
    else:
        rutas[pantalla]()
    st.html('<div class="dc-footer"><span>DATACORE AI · GESTIÓN COMERCIAL</span><span>Datos verificables. Decisiones informadas.</span></div>')
