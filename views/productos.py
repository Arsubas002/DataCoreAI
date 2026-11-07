"""Catálogo maestro y editor de producto, con versión concurrente preservada."""

import streamlit as st
from st_keyup import st_keyup
from services.configuracion import solo_lectura
from views.componentes import titulo_panel, estado_vacio
from database.productos import (
    desactivar_producto,
    guardar_producto,
    listar_categorias,
    listar_productos,
)


def mostrar_productos():
    if "aviso_productos" in st.session_state:
        st.success(st.session_state.pop("aviso_productos"))
    buscar, filtros, actualizar = st.columns([2.5, 1, 0.8], vertical_alignment="bottom")
    with buscar:
        busqueda = (
            st_keyup(
                "Buscar por código o nombre",
                key="buscar_productos",
                debounce=300,
                placeholder="Encuentra un producto…",
            )
            or ""
        )
    with filtros, st.popover("Visibilidad", icon=":material/tune:", width="stretch"):
        incluir_inactivos = st.checkbox("Mostrar también productos inactivos")
    with actualizar:
        st.button("Actualizar listado", icon=":material/refresh:", width="stretch")
    try:
        productos = listar_productos(busqueda, incluir_inactivos)
        categorias = listar_categorias()
    except Exception:
        st.error(
            "No se pudo cargar el catálogo. Verifica la conexión y que los scripts SQL hayan sido revisados, autorizados y ejecutados."
        )
        return
    catalogo, editor = st.columns([1.65, 1], gap="medium")
    with catalogo, st.container(key="product_catalog"):
        titulo_panel(
            "Catálogo de productos",
            "Busca, filtra y elige un registro para trabajar en el editor.",
        )
        categorias_elegidas = st.multiselect(
            "Categorías",
            [c["Nombre"] for c in categorias],
            placeholder="Todas las categorías",
            key="categorias_catalogo",
        )
        visibles = [
            p
            for p in productos
            if not categorias_elegidas or p["Categoria"] in categorias_elegidas
        ]
        st.caption(f"Productos mostrados: {len(visibles)}")
        if visibles:
            st.dataframe(
                [
                    {
                        "Código": p["Codigo"],
                        "Producto": p["Nombre"],
                        "Categoría": p["Categoria"],
                        "Precio (S/)": p["Precio"],
                        "Stock": p["Existencias"],
                        "Estado": "Activo" if p["Activo"] else "Inactivo",
                    }
                    for p in visibles
                ],
                width="stretch",
                hide_index=True,
                column_config={
                    "Precio (S/)": st.column_config.NumberColumn(format="%.2f")
                },
            )
        else:
            st.info("No hay productos que coincidan con la búsqueda.")
            estado_vacio(
                "Ajusta tu búsqueda", "Prueba otro código, nombre o categoría."
            )
    with editor, st.container(key="product_editor"):
        titulo_panel(
            "Espacio de edición",
            "Un producto a la vez. Los cambios solo se guardan al confirmarlos.",
        )
        if not categorias:
            st.warning(
                "Necesitas categorías. El script de datos de prueba incluye cuatro; no se ejecuta automáticamente."
            )
            return
        mostrar_editor(visibles, categorias)


def mostrar_editor(productos, categorias):
    opciones = {p["ProductoID"]: p for p in productos}
    if st.session_state.get("seleccionar_producto") not in [None, *opciones]:
        st.session_state["seleccionar_producto"] = None
    seleccionado = st.selectbox(
        "Registrar o seleccionar un producto",
        [None, *opciones],
        key="seleccionar_producto",
        format_func=lambda identificador: (
            "Nuevo producto"
            if identificador is None
            else f"{opciones[identificador]['Codigo']} · {opciones[identificador]['Nombre']}"
        ),
    )
    producto = opciones.get(seleccionado)
    if producto and not producto["Activo"]:
        st.info("Este producto está inactivo. Sus datos se conservan para consulta.")
        return

    # Se conservan juntos campos y versión, incluso si cambia el catálogo.
    # Una consulta posterior no debe sustituirla antes de guardar sus cambios.
    clave_version = f"version_producto_{seleccionado}"
    clave_edicion = f"edicion_producto_{seleccionado}"
    if producto:
        if clave_edicion not in st.session_state:
            st.session_state[clave_edicion] = dict(producto)
            st.session_state.setdefault(clave_version, bytes(producto["VersionFila"]))
        producto = st.session_state[clave_edicion]
    ids = [c["CategoriaID"] for c in categorias]
    nombres = {c["CategoriaID"]: c["Nombre"] for c in categorias}
    st.subheader("Editar producto" if producto else "Registrar producto")
    revision = st.session_state.get(f"revision_editor_{seleccionado}", 0)
    with st.form(
        f"form_producto_{seleccionado}_{revision}", clear_on_submit=False, border=False
    ):
        codigo_col, nombre_col = st.columns([1, 2])
        with codigo_col:
            codigo = st.text_input(
                "Código", value=producto["Codigo"] if producto else "", max_chars=30
            )
        with nombre_col:
            nombre = st.text_input(
                "Nombre", value=producto["Nombre"] if producto else "", max_chars=150
            )
        categoria_col, precio_col = st.columns(2)
        with categoria_col:
            categoria = st.selectbox(
                "Categoría",
                ids,
                format_func=nombres.get,
                index=ids.index(producto["CategoriaID"]) if producto else 0,
            )
        with precio_col:
            # Texto y Decimal evitan redondeos binarios en importes monetarios.
            precio = st.text_input(
                "Precio (S/)",
                value=str(producto["Precio"]) if producto else "0.00",
                max_chars=32,
            )
        stock_col, minimo_col = st.columns(2)
        with stock_col:
            existencias = st.number_input(
                "Existencias",
                min_value=0,
                max_value=2147483647,
                value=int(producto["Existencias"]) if producto else 0,
                step=1,
            )
        with minimo_col:
            minimo = st.number_input(
                "Stock mínimo",
                min_value=0,
                max_value=2147483647,
                value=int(producto["StockMinimo"]) if producto else 5,
                step=1,
            )
        with st.container(key="primary_action"):
            guardar = st.form_submit_button(
                "Guardar producto",
                type="primary",
                icon=":material/save:",
                disabled=solo_lectura(),
            )
    if guardar:
        try:
            guardar_producto(
                codigo,
                nombre,
                categoria,
                precio,
                existencias,
                minimo,
                seleccionado,
                st.session_state.get(clave_version),
            )
        except ValueError as error:
            st.error(str(error))
        except Exception:
            st.error(
                "No se pudo guardar. Revisa la conexión, la categoría y el esquema de la base."
            )
        else:
            descartar_edicion(seleccionado)
            st.session_state["aviso_productos"] = "Producto guardado correctamente."
            st.rerun()

    if producto:
        st.caption(
            "La edición conserva los datos y la versión cargados. Recargar descarta cambios sin guardar."
        )
        with st.expander("Desactivar producto"):
            confirmar = st.checkbox(
                "Confirmo que deseo desactivar este producto",
                key=f"confirmar_{seleccionado}",
            )
            if st.button(
                "Desactivar",
                disabled=solo_lectura() or not confirmar,
                key=f"desactivar_{seleccionado}",
            ):
                try:
                    desactivar_producto(seleccionado, st.session_state[clave_version])
                except ValueError as error:
                    st.error(str(error))
                except Exception:
                    st.error("No se pudo desactivar el producto. Revisa la conexión.")
                else:
                    descartar_edicion(seleccionado)
                    st.session_state["aviso_productos"] = (
                        "Producto desactivado. Sus datos se conservan."
                    )
                    st.rerun()
        if st.button("Recargar versión del producto", icon=":material/sync:"):
            descartar_edicion(seleccionado)
            st.rerun()


def descartar_edicion(producto_id):
    """Nueva identidad del formulario para descartar también valores de widgets."""
    st.session_state.pop(f"version_producto_{producto_id}", None)
    st.session_state.pop(f"edicion_producto_{producto_id}", None)
    clave_revision = f"revision_editor_{producto_id}"
    st.session_state[clave_revision] = st.session_state.get(clave_revision, 0) + 1
