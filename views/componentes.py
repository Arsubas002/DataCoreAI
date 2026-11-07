"""Componentes visuales compartidos; no consultan ni modifican datos."""
from datetime import date, timedelta

import streamlit as st
from pathlib import Path
from html import escape
from contextlib import nullcontext
from services.configuracion import solo_lectura

DESCRIPCIONES = {
    "Dashboard": "Una visión clara de tus ventas y existencias.",
    "Productos": "Catálogo, precios y disponibilidad de tu negocio.",
    "Ventas": "Prepara ventas y consulta su historial en un solo lugar.",
    "Inventario": "Detecta productos agotados y anticipa reposiciones.",
    "Asistente IA": "Respuestas comerciales con fuentes y cálculos verificables.",
    "Reportes": "Información lista para analizar y compartir.",
}


ICONOS = {"Dashboard": "dashboard", "Productos": "inventory_2", "Ventas": "point_of_sale",
          "Inventario": "warehouse", "Asistente IA": "auto_awesome", "Reportes": "bar_chart"}


def sistema_visual():
    css = (Path(__file__).resolve().parents[1] / "assets" / "premium.css").read_text(encoding="utf-8")
    st.html(f"<style>{css}</style>")


def cambiar_pantalla(pantalla):
    st.session_state.pantalla_actual = pantalla


def menu_lateral():
    actual = st.session_state.setdefault("pantalla_actual", "Dashboard")
    if actual not in ICONOS:
        actual = st.session_state.pantalla_actual = "Dashboard"
    with st.sidebar, st.container(key="sidebar_shell"):
        st.html('<div class="dc-brand"><div class="dc-brand-mark">D</div><div class="dc-brand-name">DataCore <span>AI</span><small>BUSINESS INTELLIGENCE</small></div></div>')
        st.html('<div class="dc-nav-label">ESPACIO DE TRABAJO</div>')
        with st.container(key="navigation", gap=None):
            for pantalla, icono in ICONOS.items():
                with st.container(key="nav_active" if pantalla == actual else f"nav_{icono}"):
                    st.button(pantalla, icon=f":material/{icono}:", width="stretch",
                              key=f"navegar_{icono}", help="Sección actual" if pantalla == actual else f"Abrir {pantalla}", on_click=cambiar_pantalla, args=(pantalla,))
        st.html('<div class="dc-nav-label">ENTORNO</div>')
        modo = "Solo lectura" if solo_lectura() else "Operación comercial"
        st.html(f'<div class="dc-sidebar-note"><strong>{modo}</strong>SQL Server · Windows<br>Información de tu negocio en un solo lugar.</div>')
        st.html('<div class="dc-sidebar-footer">DATACORE / WORKSPACE<br>Gestión comercial & análisis</div>')
    return actual


def periodo(clave, actualizar=False):
    columnas = st.columns([2, 2, 1] if actualizar else [1, 1], vertical_alignment="bottom")
    with columnas[0]:
        inicio = st.date_input("Desde", date.today() - timedelta(days=29), min_value=date(1, 1, 1),
                               max_value=date(9999, 12, 30), key=f"{clave}_desde")
    with columnas[1]:
        fin = st.date_input("Hasta (inclusive)", date.today(), min_value=date(1, 1, 1),
                            max_value=date(9999, 12, 30), key=f"{clave}_hasta")
    if actualizar:
        with columnas[2]:
            with st.container(key="primary_action"):
                st.button("Actualizar panel", type="primary", icon=":material/refresh:", width="stretch")
    return inicio, fin


def cabecera(pantalla):
    modo = "SOLO LECTURA" if solo_lectura() else "OPERACIÓN COMERCIAL"
    st.html(f'<div class="dc-topline"><span>Workspace <b>/ {escape(pantalla)}</b></span><span class="dc-mode">{modo}</span></div><header class="dc-header"><div class="dc-eyebrow">INTELIGENCIA COMERCIAL</div><h1>{escape(pantalla)}</h1><div class="dc-subtitle">{escape(DESCRIPCIONES[pantalla])}</div></header>')


def titulo_panel(titulo, detalle=""):
    st.html(f'<div class="dc-panel-heading"><h3>{escape(titulo)}</h3><span>{escape(detalle)}</span></div>')


def tarjeta_metrica(columna, etiqueta, valor, clave="income", icono="◇", nota="Periodo seleccionado", serie=None):
    with (columna if columna is not None else nullcontext()), st.container(key=f"kpi_{clave}", gap=None):
        st.html(f'<div class="dc-kpi-icon">{escape(icono)}</div>')
        st.metric(etiqueta, valor, chart_data=serie, chart_type="line")
        st.html(f'<div class="dc-kpi-note">{escape(nota)}</div>')


def estilo_grafico(figura, altura=280):
    figura.update_layout(template="plotly_dark", height=altura, margin=dict(l=5,r=8,t=12,b=5),
                          paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                          font=dict(family="Arial, sans-serif",color="#ABA596",size=11),
                          colorway=["#DDB566","#A78346","#7B8075"],
                          xaxis=dict(gridcolor="#302E29",zeroline=False),
                          yaxis=dict(gridcolor="#302E29",zeroline=False),
                          hoverlabel=dict(bgcolor="#292720",font_color="#F4E9D4",bordercolor="#5A4C33"))
    return figura


def tabla_comercial(filas):
    """Encabezados y formatos legibles sin cambiar las claves ni los valores."""
    st.dataframe(filas, hide_index=True, width="stretch", column_config={
        "Codigo": st.column_config.TextColumn("Código"),
        "Nombre": st.column_config.TextColumn("Producto"),
        "Dia": st.column_config.DateColumn("Fecha", format="DD/MM/YYYY"),
        "NumeroVentas": st.column_config.NumberColumn("Ventas", format="%d"),
        "TotalVentas": st.column_config.NumberColumn("Ingresos (S/)", format="%.2f"),
        "Ingresos": st.column_config.NumberColumn("Ingresos (S/)", format="%.2f"),
        "Unidades": st.column_config.NumberColumn("Unidades vendidas", format="%d"),
        "Existencias": st.column_config.NumberColumn("Disponibles", format="%d"),
        "StockMinimo": st.column_config.NumberColumn("Stock mínimo", format="%d"),
        "Estado": st.column_config.TextColumn("Estado"),
    })
