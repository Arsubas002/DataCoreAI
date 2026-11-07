"""Dashboard comercial basado exclusivamente en datos consultados en SQL Server."""
from decimal import Decimal

import pandas as pd
import plotly.express as px
import streamlit as st

from database.dashboard import resumen_comercial
from views.componentes import periodo, tarjeta_metrica, tabla_comercial


def _soles(valor):
    return f"S/ {Decimal(str(valor)):,.2f}"


def mostrar_dashboard():
    st.write("Indicadores comerciales e inventario con información real de DataCore AI.")
    with st.container(border=True):
        st.markdown("#### Periodo de análisis")
        inicio, fin = periodo("dashboard")
        st.button("Actualizar panel", type="primary")

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
        st.info("Comprueba el servicio SQL Server, el controlador ODBC y los permisos de Windows.")
        return

    ventas = datos["ventas"]
    inventario = datos["inventario"]
    stock_bajo = [p for p in inventario if p["Existencias"] <= p["StockMinimo"]]
    unidades = sum(int(p["Existencias"]) for p in inventario)
    a, b, c, d = st.columns(4)
    tarjeta_metrica(a, "Ingresos del periodo", _soles(ventas["TotalVentas"]))
    tarjeta_metrica(b, "Ventas registradas", f'{ventas["NumeroVentas"]:,}')
    tarjeta_metrica(c, "Unidades en inventario", f"{unidades:,}")
    tarjeta_metrica(d, "Productos con alerta", str(len(stock_bajo)))
    st.caption("Fechas locales de SQL Server, sin conversión de zona horaria. Ranking limitado a 8 productos; nombres actuales.")
    st.caption(f"Ventas entre {inicio:%d/%m/%Y} y {fin:%d/%m/%Y}. Inventario: existencias actuales, no históricas.")

    st.subheader("Evolución de ingresos")
    if datos["tendencia"]:
        tabla = pd.DataFrame(datos["tendencia"])
        grafico = tabla.assign(Dia=tabla["Dia"].map(str), TotalVentas=tabla["TotalVentas"].map(float))
        figura = px.line(grafico, x="Dia", y="TotalVentas", markers=True,
                         labels={"Dia": "Fecha", "TotalVentas": "Ingresos (S/)"},
                         template="plotly_dark", color_discrete_sequence=["#38BDF8"])
        figura.update_layout(margin=dict(l=10, r=10, t=15, b=10), hovermode="x unified",
                             paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)")
        st.plotly_chart(figura, width="stretch")
        with st.expander("Ver datos de ingresos"):
            tabla_comercial(tabla)
    else:
        st.info("No se registraron ventas en el periodo seleccionado.")

    st.subheader("Productos más vendidos")
    if datos["productos_vendidos"]:
        tabla = pd.DataFrame(datos["productos_vendidos"])
        figura = px.bar(tabla, x="Unidades", y="Codigo", hover_name="Nombre", orientation="h",
                        labels={"Unidades": "Unidades vendidas", "Codigo": "Código de producto"},
                        template="plotly_dark", color_discrete_sequence=["#38BDF8"])
        figura.update_layout(yaxis={"categoryorder": "total ascending"},
                             margin=dict(l=10, r=10, t=15, b=10),
                             paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)")
        st.plotly_chart(figura, width="stretch")
        with st.expander("Ver detalle de productos vendidos"):
            tabla_comercial(tabla)
    else:
        st.caption("Todavía no hay productos vendidos en el periodo.")

    st.subheader("Alertas de inventario")
    if stock_bajo:
        st.warning(f"{len(stock_bajo)} producto(s) requieren revisión de existencias.")
        tabla_comercial(pd.DataFrame(stock_bajo))
    else:
        st.success("No hay productos activos con stock bajo o agotado.")
    st.caption("Las cifras se consultan en SQL Server; no se generan ventas ni se modifica el inventario.")
