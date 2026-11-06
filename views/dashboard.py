"""Dashboard comercial basado exclusivamente en datos consultados en SQL Server."""
from datetime import date, timedelta
from decimal import Decimal

import pandas as pd
import plotly.express as px
import streamlit as st

from database.dashboard import resumen_comercial


def _soles(valor):
    return f"S/ {Decimal(str(valor)):,.2f}"


def mostrar_dashboard():
    st.write("Indicadores comerciales e inventario con información real de DataCore AI.")
    hoy = date.today()
    izquierda, derecha = st.columns(2)
    with izquierda:
        inicio = st.date_input("Desde", value=hoy - timedelta(days=29), key="dashboard_desde")
    with derecha:
        fin = st.date_input("Hasta (inclusive)", value=hoy, max_value=date(9999, 12, 30), key="dashboard_hasta")

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
        st.error("No fue posible consultar el panel. Comprueba la conexión con SQL Server y la base DataCoreAI.")
        st.info("El entorno en la nube no tiene acceso directo a tu SQL Server de Windows.")
        return

    ventas = datos["ventas"]
    inventario = datos["inventario"]
    stock_bajo = [p for p in inventario if p["Existencias"] <= p["StockMinimo"]]
    unidades = sum(int(p["Existencias"]) for p in inventario)
    a, b, c, d = st.columns(4)
    a.metric("Ingresos del periodo", _soles(ventas["TotalVentas"]))
    b.metric("Ventas registradas", f'{ventas["NumeroVentas"]:,}')
    c.metric("Unidades en inventario", f"{unidades:,}")
    d.metric("Productos con alerta", str(len(stock_bajo)))
    st.caption("Fechas locales de SQL Server, sin conversión de zona horaria. Ranking limitado a 8 productos; nombres actuales.")
    st.caption(f"Ventas entre {inicio:%d/%m/%Y} y {fin:%d/%m/%Y}. Inventario: existencias actuales, no históricas.")

    st.subheader("Evolución de ingresos")
    if datos["tendencia"]:
        tabla = pd.DataFrame(datos["tendencia"])
        tabla["Dia"] = pd.to_datetime(tabla["Dia"])
        tabla["TotalVentas"] = tabla["TotalVentas"].map(float)
        figura = px.line(tabla, x="Dia", y="TotalVentas", markers=True,
                         labels={"Dia": "Fecha", "TotalVentas": "Ingresos (S/)"},
                         template="plotly_dark")
        figura.update_layout(margin=dict(l=10, r=10, t=15, b=10))
        st.plotly_chart(figura, use_container_width=True)
        with st.expander("Ver datos de ingresos"):
            st.dataframe(tabla, hide_index=True, use_container_width=True)
    else:
        st.info("No se registraron ventas en el periodo seleccionado.")

    st.subheader("Productos más vendidos")
    if datos["productos_vendidos"]:
        tabla = pd.DataFrame(datos["productos_vendidos"])
        figura = px.bar(tabla, x="Unidades", y="Nombre", orientation="h",
                        labels={"Unidades": "Unidades vendidas", "Nombre": "Producto"},
                        template="plotly_dark")
        figura.update_layout(yaxis={"categoryorder": "total ascending"},
                             margin=dict(l=10, r=10, t=15, b=10))
        st.plotly_chart(figura, use_container_width=True)
        with st.expander("Ver detalle de productos vendidos"):
            st.dataframe(tabla, hide_index=True, use_container_width=True)
    else:
        st.caption("Todavía no hay productos vendidos en el periodo.")

    st.subheader("Alertas de inventario")
    if stock_bajo:
        st.warning(f"{len(stock_bajo)} producto(s) requieren revisión de existencias.")
        st.dataframe(pd.DataFrame(stock_bajo), hide_index=True, use_container_width=True)
    else:
        st.success("No hay productos activos con stock bajo o agotado.")
    st.caption("Las cifras se consultan en SQL Server; no se generan ventas ni se modifica el inventario.")
