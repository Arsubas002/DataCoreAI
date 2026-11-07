"""Panel comercial con información SQL consultada, sin indicadores ficticios."""
from decimal import Decimal
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from database.dashboard import resumen_comercial
from views.componentes import periodo, tarjeta_metrica, tabla_comercial, titulo_panel, estilo_grafico


def _soles(valor):
    return f"S/ {Decimal(str(valor)):,.2f}"


def mostrar_dashboard():
    with st.container(key="panel_filtros"):
        inicio, fin = periodo("dashboard", actualizar=True)
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

    ventas, inventario = datos["ventas"], datos["inventario"]
    stock_bajo = [p for p in inventario if p["Existencias"] <= p["StockMinimo"]]
    unidades = sum(int(p["Existencias"]) for p in inventario)
    with st.container(horizontal=True, key="kpi_grid", gap="small"):
        tarjeta_metrica(None,"Ingresos del periodo",_soles(ventas["TotalVentas"]),"income","S/",
                        "Ingresos diarios · Periodo seleccionado", [float(f["TotalVentas"]) for f in datos["tendencia"]] or None)
        tarjeta_metrica(None,"Ventas registradas",f'{ventas["NumeroVentas"]:,}',"sales","#",
                        "Ventas diarias · Periodo seleccionado", [f["NumeroVentas"] for f in datos["tendencia"]] or None)
        tarjeta_metrica(None,"Unidades en inventario",f"{unidades:,}","units","▦","Existencias actuales · Productos activos")
        tarjeta_metrica(None,"Productos con alerta",str(len(stock_bajo)),"alerts","!","Stock menor o igual al mínimo")
    st.caption(f"Periodo: {inicio:%d/%m/%Y} — {fin:%d/%m/%Y} · S/ · Fechas locales de SQL Server. Inventario actual, no histórico.")

    izquierda,derecha = st.columns([2,1], gap="medium")
    with izquierda, st.container(key="panel_ingresos"):
        titulo_panel("Evolución de ingresos", "VENTAS DEL PERIODO")
        if datos["tendencia"]:
            tabla = pd.DataFrame(datos["tendencia"])
            grafico = tabla.assign(Dia=tabla["Dia"].map(str), TotalVentas=tabla["TotalVentas"].map(float))
            figura = px.area(grafico,x="Dia",y="TotalVentas",markers=True,
                             labels={"Dia":"Fecha","TotalVentas":"Ingresos (S/)"},color_discrete_sequence=["#DDB566"])
            figura.update_traces(line=dict(width=2.5),fillcolor="rgba(221,181,102,.12)",marker=dict(size=5))
            figura.update_layout(hovermode="x unified")
            st.plotly_chart(estilo_grafico(figura),width="stretch")
            with st.expander("Ver datos de ingresos"):
                tabla_comercial(tabla)
        else:
            st.info("No se registraron ventas en el periodo seleccionado.")

    with derecha, st.container(key="panel_stock"):
        titulo_panel("Estado del inventario", "PRODUCTOS ACTIVOS")
        if inventario:
            agotados = sum(p["Existencias"] == 0 for p in inventario)
            bajos = len(stock_bajo)-agotados
            normales = len(inventario)-len(stock_bajo)
            figura = go.Figure(go.Pie(labels=["Disponible","Stock bajo","Agotado"],values=[normales,bajos,agotados],
                                     hole=.78,sort=False,textinfo="none",marker=dict(colors=["#B6985D","#6F6249","#C07C61"],line=dict(color="#191918",width=4))))
            figura.update_layout(showlegend=False,annotations=[dict(text=f"<b>{len(inventario)}</b><br>productos",x=.5,y=.5,
                                      font=dict(size=20,color="#E9DDC4"),showarrow=False)])
            st.plotly_chart(estilo_grafico(figura,250),width="stretch")
            st.caption(f"Disponible: {normales} · Stock bajo: {bajos} · Agotado: {agotados}")
        else:
            st.info("No hay productos activos en el inventario.")

    izquierda,derecha = st.columns([1,1],gap="medium")
    with izquierda, st.container(key="panel_productos"):
        titulo_panel("Productos más vendidos", "TOP 8 · UNIDADES")
        if datos["productos_vendidos"]:
            tabla = pd.DataFrame(datos["productos_vendidos"])
            figura = px.bar(tabla,x="Unidades",y="Codigo",hover_name="Nombre",orientation="h",
                            labels={"Unidades":"Unidades vendidas","Codigo":"Código de producto"},color_discrete_sequence=["#DDB566"])
            figura.update_layout(yaxis={"categoryorder":"total ascending"},bargap=.48)
            st.plotly_chart(estilo_grafico(figura,250),width="stretch")
            with st.expander("Ver detalle de productos vendidos"):
                tabla_comercial(tabla)
        else:
            st.caption("Todavía no hay productos vendidos en el periodo.")
    with derecha, st.container(key="panel_alertas"):
        titulo_panel("Atención al inventario", "REPOSICIÓN")
        if stock_bajo:
            st.caption(f"{len(stock_bajo)} producto(s) con stock bajo o agotado.")
            tabla_comercial(pd.DataFrame(stock_bajo))
        else:
            st.success("No hay productos activos con stock bajo o agotado.")
    st.caption("Fuentes: DataCoreAI · Ranking limitado a 8 productos, nombres actuales. Las consultas no forman una instantánea transaccional. Sin comparación de periodos no se muestran porcentajes de crecimiento.")
