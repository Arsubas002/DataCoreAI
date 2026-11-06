"""Formulario sencillo para registrar, consultar y editar productos."""

import streamlit as st
from st_keyup import st_keyup

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
        st.dataframe(visibles, use_container_width=True, hide_index=True)
    else:
        st.info("No hay productos que coincidan con la búsqueda.")
    if not categorias:
        st.warning("Necesitas categorías. El script de datos de prueba incluye cuatro; no se ejecuta automáticamente.")
        return

    opciones = {p["ProductoID"]: p for p in productos}
    seleccionado = st.selectbox(
        "Registrar o seleccionar un producto",
        [None, *opciones],
        format_func=lambda identificador: "Nuevo producto" if identificador is None else
        f"{opciones[identificador]['Codigo']} · {opciones[identificador]['Nombre']}",
    )
    producto = opciones.get(seleccionado)
    if producto and not producto["Activo"]:
        st.info("Este producto está inactivo. Sus datos se conservan para consulta.")
        return

    # Se conserva la versión que vio el usuario al abrir el formulario.
    # Una consulta posterior no debe sustituirla antes de guardar sus cambios.
    clave_version = f"version_producto_{seleccionado}"
    if producto and clave_version not in st.session_state:
        st.session_state[clave_version] = bytes(producto["VersionFila"])
    ids = [c["CategoriaID"] for c in categorias]
    nombres = {c["CategoriaID"]: c["Nombre"] for c in categorias}
    st.subheader("Editar producto" if producto else "Registrar producto")
    with st.form(f"form_producto_{seleccionado}", clear_on_submit=False):
        codigo = st.text_input("Código", value=producto["Codigo"] if producto else "", max_chars=30)
        nombre = st.text_input("Nombre", value=producto["Nombre"] if producto else "", max_chars=150)
        categoria = st.selectbox("Categoría", ids, format_func=nombres.get,
                                index=ids.index(producto["CategoriaID"]) if producto else 0)
        # Texto y Decimal evitan redondeos binarios en importes monetarios.
        precio = st.text_input("Precio (usa punto decimal)", value=str(producto["Precio"]) if producto else "0.00")
        existencias = st.number_input("Existencias", min_value=0, max_value=2147483647,
                                     value=int(producto["Existencias"]) if producto else 0, step=1)
        minimo = st.number_input("Stock mínimo", min_value=0, max_value=2147483647,
                                value=int(producto["StockMinimo"]) if producto else 5, step=1)
        guardar = st.form_submit_button("Guardar producto", type="primary")
    if guardar:
        try:
            guardar_producto(codigo, nombre, categoria, precio, existencias, minimo,
                             seleccionado, st.session_state.get(clave_version))
        except ValueError as error:
            st.error(str(error))
        except Exception:
            st.error("No se pudo guardar. Revisa la conexión, la categoría y el esquema de la base.")
        else:
            st.session_state.pop(clave_version, None)
            st.session_state["aviso_productos"] = "Producto guardado correctamente."
            st.rerun()

    if producto:
        with st.expander("Desactivar producto"):
            confirmar = st.checkbox("Confirmo que deseo desactivar este producto", key=f"confirmar_{seleccionado}")
            if st.button("Desactivar", disabled=not confirmar, key=f"desactivar_{seleccionado}"):
                try:
                    desactivar_producto(seleccionado, st.session_state[clave_version])
                except ValueError as error:
                    st.error(str(error))
                except Exception:
                    st.error("No se pudo desactivar el producto. Revisa la conexión.")
                else:
                    st.session_state.pop(clave_version, None)
                    st.session_state["aviso_productos"] = "Producto desactivado. Sus datos se conservan."
                    st.rerun()
        if st.button("Recargar versión del producto"):
            st.session_state.pop(clave_version, None)
            st.rerun()
