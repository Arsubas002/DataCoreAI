"""Monitor de existencias: vista prioritaria, estados y análisis por categoría."""

import streamlit as st
import pandas as pd
import plotly.express as px
from database.productos import listar_productos
from views.componentes import titulo_panel, estilo_grafico, estado_vacio


def mostrar_inventario():
    buscar, actualizar = st.columns([3, 1], vertical_alignment="bottom")
    with buscar:
        busqueda = st.text_input(
            "Buscar en inventario", placeholder="Código o producto…"
        )
    with actualizar:
        st.button("Actualizar inventario", icon=":material/refresh:", width="stretch")
    estado = st.segmented_control(
        "Estado del inventario",
        ["Todos", "Con alerta", "Agotados"],
        default="Todos",
        required=True,
        key="estado_inventario",
    )
    try:
        productos = listar_productos(busqueda)
    except Exception:
        st.error(
            "No se pudo consultar el inventario. Verifica la conexión y la ejecución autorizada de los scripts SQL."
        )
        return
    bajos = [p for p in productos if p["Existencias"] <= p["StockMinimo"]]
    agotados = [p for p in productos if p["Existencias"] == 0]
    with st.container(key="stock_strip"):
        a, b, c = st.columns(3)
        a.metric("Unidades en la búsqueda", sum(p["Existencias"] for p in productos))
        b.metric("Productos con alerta", len(bajos))
        c.metric("Agotados", len(agotados))
    st.caption(
        "Existencias actuales de productos activos · Stock bajo: cantidad menor o igual al mínimo."
    )
    seleccion = (
        agotados
        if estado == "Agotados"
        else bajos
        if estado == "Con alerta"
        else productos
    )
    seleccion = sorted(
        seleccion,
        key=lambda p: (
            p["Existencias"] > p["StockMinimo"],
            p["Existencias"] != 0,
            p["Nombre"],
        ),
    )
    filas = [
        {
            "Código": p["Codigo"],
            "Producto": p["Nombre"],
            "Categoría": p["Categoria"],
            "Disponibles": p["Existencias"],
            "Stock mínimo": p["StockMinimo"],
            "Estado": "Agotado"
            if p["Existencias"] == 0
            else "Stock bajo"
            if p["Existencias"] <= p["StockMinimo"]
            else "Disponible",
        }
        for p in seleccion
    ]
    tabla, analisis = st.tabs(["Control de stock", "Distribución por categoría"])
    with tabla, st.container(key="stock_table"):
        titulo_panel(
            "Prioridad de reposición",
            f"{len(filas)} productos en la vista · Agotados y alertas primero",
        )
        if filas:
            st.dataframe(
                filas,
                width="stretch",
                hide_index=True,
                column_config={
                    "Disponibles": st.column_config.ProgressColumn(
                        "Disponibles",
                        format="%d",
                        min_value=0,
                        max_value=max(1, max(f["Disponibles"] for f in filas)),
                    )
                },
            )
        else:
            st.info("No hay productos que coincidan con los filtros.")
            estado_vacio(
                "Nada que revisar en esta vista",
                "Cambia el estado o la búsqueda para consultar otras existencias.",
            )
    with analisis, st.container(key="stock_analytics"):
        titulo_panel(
            "Dónde está tu inventario",
            "Unidades actuales por categoría dentro de los filtros aplicados",
        )
        if filas:
            grupos = (
                pd.DataFrame(filas)
                .groupby("Categoría", as_index=False)["Disponibles"]
                .sum()
            )
            figura = px.bar(
                grupos,
                x="Disponibles",
                y="Categoría",
                orientation="h",
                color_discrete_sequence=["#24C9C0"],
            )
            st.plotly_chart(estilo_grafico(figura, 260), width="stretch")
        else:
            st.caption("Sin existencias que representar con estos filtros.")
