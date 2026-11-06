"""Inventario de consulta: nunca cambia las existencias."""

import streamlit as st

from database.productos import listar_productos


def mostrar_inventario():
    st.write("Existencias de productos activos. Stock bajo: cantidad menor o igual al mínimo.")
    busqueda = st.text_input("Buscar en inventario")
    solo_bajo = st.checkbox("Mostrar solo alertas de stock")
    st.button("Actualizar inventario")
    try:
        productos = listar_productos(busqueda)
    except Exception:
        st.error("No se pudo consultar el inventario. Verifica la conexión y la ejecución autorizada de los scripts SQL.")
        return
    bajos = [p for p in productos if p["Existencias"] <= p["StockMinimo"]]
    izquierda, derecha = st.columns(2)
    izquierda.metric("Unidades en la búsqueda", sum(p["Existencias"] for p in productos))
    derecha.metric("Productos con alerta", len(bajos))
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
        st.dataframe(filas, width="stretch", hide_index=True)
    else:
        st.info("No hay productos que coincidan con los filtros.")
