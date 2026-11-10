"""Cockpit comercial: gráfico principal, actividad y decisiones operativas."""

from decimal import Decimal
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from database.dashboard import resumen_comercial
from views.componentes import (
    periodo,
    titulo_panel,
    tabla_comercial,
    estilo_grafico,
    estado_vacio,
    cambiar_pantalla,
)


def _soles(valor):
    return f"S/ {Decimal(str(valor)):,.2f}"


def mostrar_dashboard():
    control, contexto = st.columns([1, 2], vertical_alignment="center")
    with (
        control,
        st.popover(
            "Periodo de análisis", icon=":material/calendar_month:", width="stretch"
        ),
    ):
        with st.form("periodo_dashboard", border=False):
            inicio, fin = periodo("dashboard")
            st.form_submit_button(
                "Actualizar panel",
                type="primary",
                icon=":material/refresh:",
                width="stretch",
            )
    with contexto:
        st.caption(
            f"{inicio:%d/%m/%Y} — {fin:%d/%m/%Y} · Fechas locales de SQL Server · S/"
        )
    if inicio > fin:
        st.warning("La fecha inicial debe ser anterior o igual a la fecha final.")
        return
    try:
        with st.spinner("Consultando información comercial..."):
            datos = resumen_comercial(inicio, fin)
    except ValueError as error:
        st.warning(str(error))
        return
    except Exception:
        st.error(
            "No fue posible consultar el panel. Comprueba la conexión con SQL Server y la base DataCoreAI."
        )
        st.info(
            "Comprueba el servicio SQL Server, el controlador ODBC y los permisos de Windows."
        )
        return
    ventas, inventario = datos["ventas"], datos["inventario"]
    alertas = [p for p in inventario if p["Existencias"] <= p["StockMinimo"]]
    principal, lateral = st.columns([2.25, 1], gap="medium")
    with principal, st.container(key="hero_chart"):
        titulo_panel(
            "El pulso de tu negocio", "Una lectura diaria del periodo seleccionado"
        )
        st.metric("Ingresos del periodo", _soles(ventas["TotalVentas"]))
        serie = st.segmented_control(
            "Visualización",
            ["Ingresos", "Ventas"],
            default="Ingresos",
            key="dashboard_serie",
            required=True,
        )
        if datos["tendencia"]:
            tabla = pd.DataFrame(datos["tendencia"])
            grafico = tabla.sort_values("Dia").assign(
                Dia=lambda filas: filas["Dia"].map(str),
                TotalVentas=lambda filas: filas["TotalVentas"].map(float),
            )
            columna = "TotalVentas" if serie == "Ingresos" else "NumeroVentas"
            # Curva de actividad con área suave: usa exclusivamente datos reales.
            color = "#7659E8" if serie == "Ingresos" else "#099DAD"
            figura = px.area(
                grafico,
                x="Dia",
                y=columna,
                markers=True,
                labels={
                    "Dia": "Fecha",
                    "TotalVentas": "Ingresos (S/)",
                    "NumeroVentas": "Ventas",
                },
                color_discrete_sequence=[color],
            )
            figura.update_traces(
                # No suavizar: la curva spline puede crear picos que no existen
                # en las ventas diarias observadas.
                line=dict(width=3, shape="linear"),
                marker=dict(size=7, line=dict(color="#FFFFFF", width=2)),
                fillcolor="rgba(118,89,232,0.12)" if serie == "Ingresos"
                else "rgba(9,157,173,0.12)",
            )
            figura.update_layout(
                hovermode="x unified",
                showlegend=False,
                xaxis=dict(showgrid=False, showline=False),
                yaxis=dict(gridcolor="#E7EAF5", zeroline=False, rangemode="tozero"),
            )
            st.plotly_chart(estilo_grafico(figura, 330), width="stretch")
            with st.expander(f"Ver datos de {serie.lower()}"):
                tabla_comercial(tabla)
        else:
            st.info("No se registraron ventas en el periodo seleccionado.")
    with lateral:
        with st.container(key="stat_sales"):
            st.metric("Ventas registradas", f"{ventas['NumeroVentas']:,}")
            st.html(
                '<div class="dc-micro-label">Actividad del periodo · Sin comparaciones estimadas</div>'
            )
        with st.container(key="stock_summary"):
            titulo_panel(
                "Inventario vivo",
                f"{len(inventario)} productos activos · Existencias actuales",
            )
            unidades_col, alertas_col = st.columns(2)
            unidades_col.metric(
                "Unidades", f"{sum(int(p['Existencias']) for p in inventario):,}"
            )
            alertas_col.metric("Con alerta", str(len(alertas)))
            if inventario:
                agotados = sum(p["Existencias"] == 0 for p in inventario)
                figura = go.Figure(
                    go.Pie(
                        labels=["Disponible", "Stock bajo", "Agotado"],
                        values=[
                            len(inventario) - len(alertas),
                            len(alertas) - agotados,
                            agotados,
                        ],
                        hole=0.72,
                        sort=False,
                        textinfo="none",
                        marker=dict(
                            colors=["#24C9C0", "#7659E8", "#B74F6E"],
                            line=dict(color="#fff", width=3),
                        ),
                    )
                )
                figura.update_layout(showlegend=False)
                st.plotly_chart(estilo_grafico(figura, 160), width="stretch")
                st.caption(
                    f"Disponibles: {len(inventario) - len(alertas)} · Bajos: {len(alertas) - agotados} · Agotados: {agotados}"
                )
            else:
                st.info("No hay productos activos en el inventario.")
            st.button(
                "Revisar inventario",
                icon=":material/warehouse:",
                width="stretch",
                key="ir_inventario_dashboard",
                on_click=cambiar_pantalla,
                args=("Inventario",),
            )
    catalogo, accion = st.columns([1.65, 1], gap="medium")
    with catalogo, st.container(key="top_products"):
        titulo_panel(
            "Lo que impulsa tus ventas",
            "Hasta 8 productos · Precios vendidos y nombres actuales",
        )
        if datos["productos_vendidos"]:
            detalle, grafico = st.tabs(["Detalle comercial", "Comparar unidades"])
            with detalle:
                tabla_comercial(datos["productos_vendidos"])
            with grafico:
                figura = px.bar(
                    pd.DataFrame(datos["productos_vendidos"]),
                    x="Unidades",
                    y="Codigo",
                    hover_name="Nombre",
                    orientation="h",
                    color_discrete_sequence=["#24C9C0"],
                )
                figura.update_layout(yaxis={"categoryorder": "total ascending"})
                st.plotly_chart(estilo_grafico(figura, 220), width="stretch")
        else:
            estado_vacio(
                "El ranking empieza con tu primera venta",
                "No hay productos vendidos en el periodo.",
            )
    with accion, st.container(key="action_queue"):
        titulo_panel(
            "Tu siguiente acción", "Productos que necesitan una revisión de existencias"
        )
        if alertas:
            tabla_comercial(alertas)
        else:
            st.success("No hay productos activos con stock bajo o agotado.")
    with st.expander("Fuentes y alcance del panel"):
        st.caption(
            "DataCoreAI · Inventario actual, no histórico. Ranking limitado a 8 productos. Las consultas no forman una instantánea transaccional. Sin periodo comparable no se muestran porcentajes de crecimiento."
        )
