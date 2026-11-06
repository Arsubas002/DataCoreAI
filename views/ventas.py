"""Carrito en sesión: solo el botón Confirmar venta realiza escrituras."""

from copy import deepcopy
from uuid import uuid4

import streamlit as st

from database.productos import listar_productos
from database.ventas import listar_clientes, listar_historial, preparar_carrito, registrar_venta


def mostrar_ventas():
    st.session_state.setdefault("carrito_ventas", {})
    st.session_state.setdefault("venta_pendiente", None)
    st.session_state.setdefault("venta_completada", None)
    nueva, historial = st.tabs(["Nueva venta", "Historial"])
    with nueva:
        if st.session_state.venta_completada is not None:
            st.success(f"Venta N.º {st.session_state.venta_completada} registrada correctamente.")
            if st.button("Iniciar otra venta"):
                st.session_state.venta_completada = None
                st.session_state.carrito_ventas = {}
                st.rerun()
        else:
            mostrar_carrito()
    with historial:
        mostrar_historial()


def mostrar_carrito():
    carrito = st.session_state.carrito_ventas
    pendiente = st.session_state.venta_pendiente
    if pendiente:
        st.warning("Hay una confirmación pendiente. Reintenta con la misma clave para comprobar si se registró; no crees otra venta.")
        st.code(pendiente["SolicitudID"])
        confirmar_pendiente()
        return
    try:
        clientes = listar_clientes()
        productos = listar_productos()
    except Exception:
        st.error("No se pudieron cargar clientes y productos. Revisa la conexión a DataCoreAI.")
        return
    if not clientes:
        st.info("No hay clientes activos disponibles para registrar una venta.")
        return
    clientes_por_id = {c["ClienteID"]: c for c in clientes}
    cliente_id = st.selectbox("Cliente", list(clientes_por_id), key="cliente_venta",
                              format_func=lambda i: f"{clientes_por_id[i]['Nombre']} · {clientes_por_id[i]['Documento']}")
    productos_por_id = {p["ProductoID"]: p for p in productos}
    if productos:
        with st.form("agregar_al_carrito"):
            producto_id = st.selectbox("Producto activo", list(productos_por_id),
                                      format_func=lambda i: f"{productos_por_id[i]['Codigo']} · {productos_por_id[i]['Nombre']} · S/ {productos_por_id[i]['Precio']:.2f} · Stock: {productos_por_id[i]['Existencias']}")
            cantidad = st.number_input("Cantidad para agregar", min_value=1, max_value=2147483647, value=1, step=1)
            agregar = st.form_submit_button("Agregar al carrito")
        if agregar:
            producto = productos_por_id[producto_id]
            acumulado = carrito.get(producto_id, {}).get("Cantidad", 0) + cantidad
            if acumulado > producto["Existencias"]:
                st.error("La cantidad total del producto supera el stock disponible.")
            else:
                carrito[producto_id] = {"ProductoID": producto_id, "Nombre": producto["Nombre"],
                                        "Codigo": producto["Codigo"], "Precio": producto["Precio"],
                                        "Cantidad": acumulado}
                st.rerun()
    else:
        st.info("No hay productos activos disponibles.")

    st.subheader("Carrito de compras")
    if not carrito:
        st.info("Agrega productos para preparar una venta.")
        return
    for identificador, linea in list(carrito.items()):
        with st.form(f"linea_venta_{identificador}"):
            st.write(f"{linea['Codigo']} · {linea['Nombre']} · S/ {linea['Precio']:.2f}")
            cantidad = st.number_input("Cantidad", min_value=1, max_value=2147483647,
                                       value=linea["Cantidad"], step=1, key=f"cantidad_venta_{identificador}")
            actualizar = st.form_submit_button("Actualizar cantidad")
            eliminar = st.form_submit_button("Eliminar producto")
        if eliminar:
            del carrito[identificador]
            st.rerun()
        if actualizar:
            producto = productos_por_id.get(identificador)
            if not producto or cantidad > producto["Existencias"]:
                st.error("El producto ya no está disponible o no tiene stock suficiente.")
            else:
                linea["Cantidad"] = cantidad
                st.rerun()
    try:
        lineas, total = preparar_carrito(list(carrito.values()))
    except ValueError as error:
        st.error(str(error))
        return
    st.dataframe([{"Producto": carrito[l["ProductoID"]]["Nombre"], "Cantidad": l["Cantidad"],
                   "Precio": f"S/ {l['Precio']:.2f}", "Subtotal": f"S/ {l['Subtotal']:.2f}"}
                  for l in lineas], width="stretch", hide_index=True)
    st.metric("Total", f"S/ {total:.2f}")
    st.caption("Para cambiar un producto, elimínalo y agrega su reemplazo. El stock y los precios se validan nuevamente al confirmar.")
    if st.button("Confirmar venta", type="primary"):
        # La clave y la copia no cambian durante reintentos de resultado incierto.
        st.session_state.venta_pendiente = {"SolicitudID": str(uuid4()), "ClienteID": cliente_id,
                                           "Lineas": deepcopy(lineas)}
        confirmar_pendiente(ejecutar=True)


def confirmar_pendiente(ejecutar=False):
    pendiente = st.session_state.venta_pendiente
    if ejecutar or st.button("Reintentar confirmación"):
        try:
            with st.spinner("Validando y registrando venta..."):
                venta_id = registrar_venta(pendiente["ClienteID"], pendiente["Lineas"], pendiente["SolicitudID"])
        except ValueError as error:
            # Estas validaciones ocurren antes del COMMIT y hacen ROLLBACK.
            st.session_state.venta_pendiente = None
            st.error(str(error))
            st.info("Revisa el carrito. No se confirmó esta venta.")
        except Exception:
            st.error("No se pudo confirmar el resultado. Conserva la clave y reintenta. Comprueba la conexión y que el script 03 haya sido revisado y ejecutado.")
            st.code(pendiente["SolicitudID"])
        else:
            st.session_state.venta_completada = venta_id
            st.session_state.venta_pendiente = None
            st.session_state.carrito_ventas = {}
            st.rerun()


def mostrar_historial():
    st.subheader("Historial de ventas")
    st.button("Actualizar historial")
    try:
        filas = listar_historial()
    except Exception:
        st.error("No se pudo cargar el historial. Revisa la conexión.")
        return
    if not filas:
        st.info("Todavía no hay ventas registradas.")
        return
    resumen = {}
    for fila in filas:
        venta = resumen.setdefault(fila["VentaID"], {"Venta": fila["VentaID"], "Fecha": fila["Fecha"],
                    "Cliente": fila["Cliente"], "Productos": [], "Total": f"S/ {fila['Total']:.2f}"})
        venta["Productos"].append(f"{fila['Cantidad']} × {fila['Producto']} (S/ {fila['Subtotal']:.2f})")
    st.dataframe([{**venta, "Productos": "; ".join(venta["Productos"])} for venta in resumen.values()],
                 width="stretch", hide_index=True)
