import Charts
import DataCoreDomain
import SwiftUI

struct ProductsView: View {
  @Environment(AppStore.self) private var store
  @State private var query = ""
  @State private var category = "Todas"
  @State private var selected: Product?
  @State private var inStockOnly = false
  private var categories: [String] {
    ["Todas"] + Set(store.snapshot?.products.map(\.category) ?? []).sorted()
  }
  private var filtered: [Product] {
    (store.snapshot?.products ?? []).filter {
      (category == "Todas" || $0.category == category) && (!inStockOnly || $0.stock > 0)
        && (query.isEmpty || $0.name.localizedStandardContains(query)
          || $0.code.localizedStandardContains(query))
    }
  }
  var body: some View {
    Workspace {
      HStack {
        SectionTitle(title: "Catálogo", subtitle: "\(filtered.count) productos en la vista")
        Spacer()
        Menu {
          Picker("Categoría", selection: $category) { ForEach(categories, id: \.self) { Text($0) } }
        } label: {
          Label("Filtrar", systemImage: "line.3.horizontal.decrease.circle")
        }
      }
      Toggle("Solo productos disponibles", isOn: $inStockOnly).tint(.violet)
      HStack {
        Text("Categoría: \(category)").font(.caption).foregroundStyle(.secondary)
        Spacer()
        if category != "Todas" || inStockOnly || !query.isEmpty {
          Button("Limpiar filtros") {
            category = "Todas"
            inStockOnly = false
            query = ""
          }.font(.caption)
        }
      }
      if filtered.isEmpty {
        EmptyPanel(
          title: "Sin coincidencias", message: "Prueba otro nombre, código o categoría.",
          symbol: "magnifyingglass")
      }
      LazyVStack(spacing: 12) {
        ForEach(filtered) { product in
          Button {
            selected = product
          } label: {
            Panel {
              ProductRow(product: product)
              HStack {
                StockBadge(product: product)
                Spacer()
                Image(systemName: "arrow.up.right").accessibilityHidden(true)
              }
            }
          }.buttonStyle(.plain).accessibilityHint("Abre la ficha del producto")
        }
      }
    }
    .navigationTitle("Productos").searchable(text: $query, prompt: "Nombre o código")
    .onChange(of: store.snapshotRevision) { _, _ in
      if !categories.contains(category) { category = "Todas" }
    }
    .sheet(item: $selected) { product in ProductDetailView(product: product) }
  }
}

struct ProductDetailView: View {
  @Environment(AppStore.self) private var store
  @Environment(\.dismiss) private var dismiss
  let product: Product
  private var current: Product { store.snapshot?.products.first { $0.id == product.id } ?? product }
  var body: some View {
    NavigationStack {
      Workspace {
        Panel(accent: true) {
          Image(systemName: "shippingbox.fill").font(.largeTitle).accessibilityHidden(true)
          Text(current.name).font(.title.bold())
          Text(Money.formatted(current.priceMinor)).font(.title2.weight(.semibold))
        }
        Panel {
          LabeledContent("Código", value: current.code)
          LabeledContent("Categoría", value: current.category)
          LabeledContent("Disponibles", value: String(current.stock))
          LabeledContent("Mínimo", value: String(current.minimumStock))
          StockBadge(product: current)
        }
        Button {
          store.add(current)
          if store.error == nil { dismiss() }
        } label: {
          Label("Agregar al carrito", systemImage: "cart.badge.plus").frame(maxWidth: .infinity)
        }.buttonStyle(.borderedProminent).disabled(current.stock == 0 || !store.canEditCart)
        Text(
          "No se edita el catálogo ni se conecta a SQL. La venta se simula solo en la demo local."
        ).font(.footnote).foregroundStyle(.secondary)
      }.navigationTitle("Ficha de producto").navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Cerrar") { dismiss() } } }
    }
  }
}

struct InventoryView: View {
  @Environment(AppStore.self) private var store
  @State private var state = "Todos"
  @State private var query = ""
  private var products: [Product] {
    (store.snapshot?.products ?? []).filter { product in
      (query.isEmpty || product.name.localizedStandardContains(query)
        || product.code.localizedStandardContains(query))
        && (state == "Todos" || (state == "Alertas" && product.isLow)
          || (state == "Agotados" && product.stock == 0))
    }.sorted { $0.stock == $1.stock ? $0.name < $1.name : $0.stock < $1.stock }
  }
  var body: some View {
    let visible = products
    let maximumStock = max(1, visible.map(\.stock).max() ?? 1)
    Workspace {
      SectionTitle(title: "Centro de existencias", subtitle: "Primero lo que requiere tu atención")
      AdaptiveChoice(title: "Estado", options: ["Todos", "Alertas", "Agotados"], selection: $state)
      Panel(accent: true) {
        Text("\(visible.reduce(0) { $0 + $1.stock })").font(.largeTitle.bold()).monospacedDigit()
        Text("Unidades en la vista · \(visible.count) productos")
      }
      if visible.isEmpty {
        EmptyPanel(
          title: "Nada que revisar", message: "Cambia la búsqueda o el estado del inventario.")
      }
      ForEach(visible) { product in
        Panel {
          HStack(alignment: .top) {
            Text(product.name).font(.headline)
            Spacer()
            StockBadge(product: product)
          }
          Text("\(product.code) · \(product.category)").font(.caption).foregroundStyle(.secondary)
          ProgressView(
            value: Double(product.stock), total: Double(maximumStock)
          )
          .tint(product.isLow ? .violet : .turquoise)
          .accessibilityLabel("Existencias de \(product.name)")
          .accessibilityValue("\(product.stock) unidades, mínimo \(product.minimumStock)")
          LabeledContent(
            "Disponibles / mínimo", value: "\(product.stock) / \(product.minimumStock)"
          ).font(.subheadline)
        }
      }
      Text(
        "Stock bajo: cantidad menor o igual al mínimo. Barras relativas al mayor stock de esta vista, no a una capacidad estimada. Los estados usan texto e iconos."
      ).font(.footnote).foregroundStyle(.secondary)
    }.navigationTitle("Inventario").searchable(text: $query, prompt: "Código o producto")
  }
}
