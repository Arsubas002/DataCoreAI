"""Carrito en sesión: solo el botón Confirmar venta realiza escrituras."""

from copy import deepcopy
from services.configuracion import solo_lectura
from uuid import uuid4

import streamlit as st

from database.productos import listar_productos
from views.componentes import paso, estado_vacio
from database.ventas import (
    listar_clientes,
    listar_historial,
    preparar_carrito,
    registrar_venta,
)


def mostrar_ventas():
    st.session_state.setdefault("carrito_ventas", {})
    st.session_state.setdefault("venta_pendiente", None)
    st.session_state.setdefault("venta_completada", None)
    nueva, historial = st.tabs(["Nueva venta", "Historial"])
    with nueva:
        if st.session_state.venta_completada is not None:
            st.success(
                f"Venta N.º {st.session_state.venta_completada} registrada correctamente."
            )
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
        st.warning(
            "Hay una confirmación pendiente. Reintenta con la misma clave para comprobar si se registró; no crees otra venta."
        )
        st.code(pendiente["SolicitudID"])
        confirmar_pendiente()
        return
    try:
        clientes = listar_clientes()
        productos = listar_productos()
    except Exception:
        st.error(
            "No se pudieron cargar clientes y productos. Revisa la conexión a DataCoreAI."
        )
        return
    if not clientes:
        st.info("No hay clientes activos disponibles para registrar una venta.")
        return
    productos_por_id = {p["ProductoID"]: p for p in productos}
    preparar, revisar = st.columns([1, 1.25], gap="medium")
    with preparar, st.container(key="sale_selector"):
        clientes_por_id = {c["ClienteID"]: c for c in clientes}
        paso(1, "Cliente y productos")
        cliente_id = st.selectbox(
            "Cliente",
            list(clientes_por_id),
            key="cliente_venta",
            format_func=lambda i: (
                f"{clientes_por_id[i]['Nombre']} · {clientes_por_id[i]['Documento']}"
            ),
        )
        if productos:
            if st.session_state.get("producto_activo_venta") not in productos_por_id:
                st.session_state.pop("producto_activo_venta", None)
            with st.form("agregar_al_carrito", border=False):
                producto_id = st.selectbox(
                    "Producto activo",
                    list(productos_por_id),
                    key="producto_activo_venta",
                    format_func=lambda i: (
                        f"{productos_por_id[i]['Codigo']} · {productos_por_id[i]['Nombre']} · S/ {productos_por_id[i]['Precio']:.2f} · Stock: {productos_por_id[i]['Existencias']}"
                    ),
                )
                cantidad = st.number_input(
                    "Cantidad para agregar",
                    min_value=1,
                    max_value=2147483647,
                    value=1,
                    step=1,
                )
                agregar = st.form_submit_button(
                    "Agregar al carrito", icon=":material/add_shopping_cart:"
                )
            if agregar:
                producto = productos_por_id[producto_id]
                acumulado = carrito.get(producto_id, {}).get("Cantidad", 0) + cantidad
                if acumulado > producto["Existencias"]:
                    st.error(
                        "La cantidad total del producto supera el stock disponible."
                    )
                else:
                    carrito[producto_id] = {
                        "ProductoID": producto_id,
                        "Nombre": producto["Nombre"],
                        "Codigo": producto["Codigo"],
                        "Precio": producto["Precio"],
                        "Cantidad": acumulado,
                    }
                    st.rerun()
        else:
            st.info("No hay productos activos disponibles.")

    with revisar, st.container(key="sale_basket"):
        paso(2, "Carrito de compras")
        if not carrito:
            st.info("Agrega productos para preparar una venta.")
            estado_vacio(
                "Tu venta empieza con un producto",
                "Elige producto y cantidad en el panel de preparación. El carrito no reserva existencias.",
            )
            return
        for identificador, linea in list(carrito.items()):
            with st.expander(
                f"{linea['Nombre']} · {linea['Cantidad']} unidad(es)", expanded=True
            ):
                with st.form(f"linea_venta_{identificador}", border=False):
                    st.write(
                        f"{linea['Codigo']} · {linea['Nombre']} · S/ {linea['Precio']:.2f}"
                    )
                    cantidad = st.number_input(
                        "Cantidad",
                        min_value=1,
                        max_value=2147483647,
                        value=linea["Cantidad"],
                        step=1,
                        key=f"cantidad_venta_{identificador}",
                    )
                    editar_col, eliminar_col = st.columns(2)
                    with editar_col:
                        actualizar = st.form_submit_button("Actualizar cantidad")
                    with eliminar_col:
                        eliminar = st.form_submit_button("Eliminar producto")
            if eliminar:
                del carrito[identificador]
                st.rerun()
            if actualizar:
                producto = productos_por_id.get(identificador)
                if not producto or cantidad > producto["Existencias"]:
                    st.error(
                        "El producto ya no está disponible o no tiene stock suficiente."
                    )
                else:
                    linea["Cantidad"] = cantidad
                    st.rerun()
        try:
            lineas, total = preparar_carrito(list(carrito.values()))
        except ValueError as error:
            st.error(str(error))
            return
        st.dataframe(
            [
                {
                    "Producto": carrito[l["ProductoID"]]["Nombre"],
                    "Cantidad": l["Cantidad"],
                    "Precio": f"S/ {l['Precio']:.2f}",
                    "Subtotal": f"S/ {l['Subtotal']:.2f}",
                }
                for l in lineas
            ],
            width="stretch",
            hide_index=True,
        )
        with st.container(key="checkout_total"):
            st.metric("Total", f"S/ {total:.2f}")
            st.caption(
                "Para cambiar un producto, elimínalo y agrega su reemplazo. El stock y los precios se validan nuevamente al confirmar."
            )
            if st.button("Confirmar venta", type="primary", disabled=solo_lectura()):
                # La clave y la copia no cambian durante reintentos de resultado incierto.
                st.session_state.venta_pendiente = {
                    "SolicitudID": str(uuid4()),
                    "ClienteID": cliente_id,
                    "Lineas": deepcopy(lineas),
                }
                confirmar_pendiente(ejecutar=True)


def confirmar_pendiente(ejecutar=False):
    pendiente = st.session_state.venta_pendiente
    if solo_lectura():
        st.warning(
            "Modo de solo lectura: la confirmación pendiente se conserva sin reintentar. No pierdas su clave ni crees otra venta."
        )
        return
    if ejecutar or st.button("Reintentar confirmación"):
        try:
            with st.spinner("Validando y registrando venta..."):
                venta_id = registrar_venta(
                    pendiente["ClienteID"],
                    pendiente["Lineas"],
                    pendiente["SolicitudID"],
                )
        except ValueError as error:
            # Estas validaciones ocurren antes del COMMIT y hacen ROLLBACK.
            st.session_state.venta_pendiente = None
            st.error(str(error))
            st.info("Revisa el carrito. No se confirmó esta venta.")
        except Exception:
            st.error(
                "No se pudo confirmar el resultado. Conserva la clave y reintenta. Comprueba la conexión y que el script 03 haya sido revisado y ejecutado."
            )
            st.code(pendiente["SolicitudID"])
        else:
            st.session_state.venta_completada = venta_id
            st.session_state.venta_pendiente = None
            st.session_state.carrito_ventas = {}
            st.rerun()


def mostrar_historial():
    st.subheader("Historial de ventas")
    pagina = st.number_input(
        "Página del historial",
        min_value=1,
        max_value=21474836,
        value=1,
        step=1,
        key="pagina_historial",
    )
    st.caption(
        "Hasta 100 ventas por página, de más recientes a antiguas. Cada venta conserva todos sus detalles."
    )
    st.button("Actualizar historial", icon=":material/refresh:")
    try:
        filas = listar_historial(limite=100, desplazamiento=(pagina - 1) * 100)
    except Exception:
        st.error("No se pudo cargar el historial. Revisa la conexión.")
        return
    if not filas:
        st.info(
            "No hay ventas en esta página del historial. Vuelve a una página anterior si corresponde."
        )
        return
    resumen = {}
    for fila in filas:
        venta = resumen.setdefault(
            fila["VentaID"],
            {
                "Venta": fila["VentaID"],
                "Fecha": fila["Fecha"],
                "Cliente": fila["Cliente"],
                "Productos": [],
                "Total": f"S/ {fila['Total']:.2f}",
            },
        )
        venta["Productos"].append(
            f"{fila['Cantidad']} × {fila['Producto']} (S/ {fila['Subtotal']:.2f})"
        )
    st.dataframe(
        [
            {**venta, "Productos": "; ".join(venta["Productos"])}
            for venta in resumen.values()
        ],
        width="stretch",
        hide_index=True,
    )
