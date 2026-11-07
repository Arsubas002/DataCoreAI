"""Inventario de consulta: nunca cambia las existencias."""

import streamlit as st

from database.productos import listar_productos
from views.componentes import tarjeta_metrica, estilo_grafico, titulo_panel
import plotly.express as px


def mostrar_inventario():
    st.write("Existencias de productos activos. Stock bajo: cantidad menor o igual al mínimo.")
    busqueda = st.text_input("Buscar en inventario")
    solo_bajo = st.checkbox("Mostrar solo alertas de stock")
    st.button("Actualizar inventario", icon=":material/refresh:")
    try:
        productos = listar_productos(busqueda)
    except Exception:
        st.error("No se pudo consultar el inventario. Verifica la conexión y la ejecución autorizada de los scripts SQL.")
        return
    bajos = [p for p in productos if p["Existencias"] <= p["StockMinimo"]]
    izquierda, derecha = st.columns(2)
    tarjeta_metrica(izquierda,"Unidades en la búsqueda",sum(p["Existencias"] for p in productos),"units","▦","Existencias actuales · Búsqueda aplicada")
    tarjeta_metrica(derecha,"Productos con alerta",len(bajos),"alerts","!","Stock menor o igual al mínimo")
    if bajos:
        st.warning(f"Hay {len(bajos)} productos con stock bajo o agotado en esta búsqueda.")
    filas = []
    for p in bajos if solo_bajo else productos:
        estado = "Agotado" if p["Existencias"] == 0 else (
            "Stock bajo" if p["Existencias"] <= p["StockMinimo"] else "Disponible"
        )
        filas.append({"Código": p["Codigo"], "Producto": p["Nombre"],
                      "Categoría": p["Categoria"], "Disponibles": p["Existencias"],
                      "Stock mínimo": p["StockMinimo"], "Estado": estado})
    if filas:
        with st.expander("Distribución de existencias", expanded=True):
            titulo_panel("Existencias por producto", "HASTA 12 PRODUCTOS DEL FILTRO")
            grafico = px.bar(filas[:12], x="Código", y="Disponibles", color_discrete_sequence=["#DDB566"])
            st.plotly_chart(estilo_grafico(grafico,230),width="stretch")
        st.dataframe(filas, width="stretch", hide_index=True)
    else:
        st.info("No hay productos que coincidan con los filtros.")
