"""Formulario sencillo para registrar, consultar y editar productos."""

import streamlit as st
from st_keyup import st_keyup
from services.configuracion import solo_lectura

from database.productos import (
    desactivar_producto, guardar_producto, listar_categorias, listar_productos,
)


def mostrar_productos():
    st.write("Consulta y administra el catálogo de productos.")
    if "aviso_productos" in st.session_state:
        st.success(st.session_state.pop("aviso_productos"))
    # Actualiza sin Enter; espera 300 ms para no consultar por cada pulsación.
    busqueda = st_keyup("Buscar por código o nombre", key="buscar_productos",
                        debounce=300, placeholder="Escribe un código o nombre…") or ""
    incluir_inactivos = st.checkbox("Mostrar también productos inactivos")
    st.button("Actualizar listado")  # El clic vuelve a ejecutar las consultas.
    try:
        productos = listar_productos(busqueda, incluir_inactivos)
        categorias = listar_categorias()
    except Exception:
        st.error("No se pudo cargar el catálogo. Verifica la conexión y que los scripts SQL hayan sido revisados, autorizados y ejecutados.")
        return

    if productos:
        visibles = [{"Código": p["Codigo"], "Nombre": p["Nombre"],
                     "Categoría": p["Categoria"], "Precio (S/)": f"S/ {p['Precio']:.2f}",
                     "Existencias": p["Existencias"],
                     "Estado": "Activo" if p["Activo"] else "Inactivo"}
                    for p in productos]
        st.caption(f"Productos mostrados: {len(productos)}")
        st.dataframe(visibles, width="stretch", hide_index=True)
    else:
        st.info("No hay productos que coincidan con la búsqueda.")
    if not categorias:
        st.warning("Necesitas categorías. El script de datos de prueba incluye cuatro; no se ejecuta automáticamente.")
        return

    opciones = {p["ProductoID"]: p for p in productos}
    if st.session_state.get("seleccionar_producto") not in [None, *opciones]:
        st.session_state["seleccionar_producto"] = None
    seleccionado = st.selectbox(
        "Registrar o seleccionar un producto",
        [None, *opciones], key="seleccionar_producto",
        format_func=lambda identificador: "Nuevo producto" if identificador is None else
        f"{opciones[identificador]['Codigo']} · {opciones[identificador]['Nombre']}",
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
    with st.form(f"form_producto_{seleccionado}_{revision}", clear_on_submit=False):
        codigo_col, nombre_col = st.columns([1, 2])
        with codigo_col:
            codigo = st.text_input("Código", value=producto["Codigo"] if producto else "", max_chars=30)
        with nombre_col:
            nombre = st.text_input("Nombre", value=producto["Nombre"] if producto else "", max_chars=150)
        categoria_col, precio_col = st.columns(2)
        with categoria_col:
            categoria = st.selectbox("Categoría", ids, format_func=nombres.get,
                                    index=ids.index(producto["CategoriaID"]) if producto else 0)
        with precio_col:
            # Texto y Decimal evitan redondeos binarios en importes monetarios.
            precio = st.text_input("Precio (usa punto decimal)", value=str(producto["Precio"]) if producto else "0.00", max_chars=32)
        stock_col, minimo_col = st.columns(2)
        with stock_col:
            existencias = st.number_input("Existencias", min_value=0, max_value=2147483647,
                                         value=int(producto["Existencias"]) if producto else 0, step=1)
        with minimo_col:
            minimo = st.number_input("Stock mínimo", min_value=0, max_value=2147483647,
                                    value=int(producto["StockMinimo"]) if producto else 5, step=1)
        guardar = st.form_submit_button("Guardar producto", type="primary", disabled=solo_lectura())
    if guardar:
        try:
            guardar_producto(codigo, nombre, categoria, precio, existencias, minimo,
                             seleccionado, st.session_state.get(clave_version))
        except ValueError as error:
            st.error(str(error))
        except Exception:
            st.error("No se pudo guardar. Revisa la conexión, la categoría y el esquema de la base.")
        else:
            descartar_edicion(seleccionado)
            st.session_state["aviso_productos"] = "Producto guardado correctamente."
            st.rerun()

    if producto:
        st.caption("La edición conserva los datos y la versión cargados. Recargar descarta cambios sin guardar.")
        with st.expander("Desactivar producto"):
            confirmar = st.checkbox("Confirmo que deseo desactivar este producto", key=f"confirmar_{seleccionado}")
            if st.button("Desactivar", disabled=solo_lectura() or not confirmar, key=f"desactivar_{seleccionado}"):
                try:
                    desactivar_producto(seleccionado, st.session_state[clave_version])
                except ValueError as error:
                    st.error(str(error))
                except Exception:
                    st.error("No se pudo desactivar el producto. Revisa la conexión.")
                else:
                    descartar_edicion(seleccionado)
                    st.session_state["aviso_productos"] = "Producto desactivado. Sus datos se conservan."
                    st.rerun()
        if st.button("Recargar versión del producto"):
            descartar_edicion(seleccionado)
            st.rerun()


def descartar_edicion(producto_id):
    """Nueva identidad del formulario para descartar también valores de widgets."""
    st.session_state.pop(f"version_producto_{producto_id}", None)
    st.session_state.pop(f"edicion_producto_{producto_id}", None)
    clave_revision = f"revision_editor_{producto_id}"
    st.session_state[clave_revision] = st.session_state.get(clave_revision, 0) + 1
