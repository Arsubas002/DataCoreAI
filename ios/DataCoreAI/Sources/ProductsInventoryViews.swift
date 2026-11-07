import Charts
import DataCoreDomain
import SwiftUI

struct ProductsView: View {
  @EnvironmentObject private var store: AppStore
  @State private var query = ""
  @State private var category = "Todas"
  @State private var selected: Product?
  private var categories: [String] {
    ["Todas"] + Set(store.snapshot?.products.map(\.category) ?? []).sorted()
  }
  private var filtered: [Product] {
    (store.snapshot?.products ?? []).filter {
      (category == "Todas" || $0.category == category)
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
      Text("Categoría: \(category)").font(.caption).foregroundStyle(.secondary)
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
    .sheet(item: $selected) { product in ProductDetailView(product: product) }
  }
}

struct ProductDetailView: View {
  @EnvironmentObject private var store: AppStore
  @Environment(\.dismiss) private var dismiss
  let product: Product
  var body: some View {
    NavigationStack {
      Workspace {
        Panel(accent: true) {
          Image(systemName: "shippingbox.fill").font(.largeTitle).accessibilityHidden(true)
          Text(product.name).font(.title.bold())
          Text(Money.formatted(product.priceMinor)).font(.title2.weight(.semibold))
        }
        Panel {
          LabeledContent("Código", value: product.code)
          LabeledContent("Categoría", value: product.category)
          LabeledContent("Disponibles", value: String(product.stock))
          LabeledContent("Mínimo", value: String(product.minimumStock))
          StockBadge(product: product)
        }
        Button {
          store.add(product)
          if store.error == nil { dismiss() }
        } label: {
          Label("Agregar al carrito", systemImage: "cart.badge.plus").frame(maxWidth: .infinity)
        }.buttonStyle(.borderedProminent).disabled(product.stock == 0 || store.isWorking)
        if let error = store.error { Text(error).foregroundStyle(.red) }
        Text(
          "No se edita el catálogo ni se conecta a SQL. La venta se simula solo en la demo local."
        ).font(.footnote).foregroundStyle(.secondary)
      }.navigationTitle("Ficha de producto").navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Cerrar") { dismiss() } } }
    }
  }
}

struct InventoryView: View {
  @EnvironmentObject private var store: AppStore
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
    Workspace {
      SectionTitle(title: "Centro de existencias", subtitle: "Primero lo que requiere tu atención")
      Picker("Estado", selection: $state) {
        ForEach(["Todos", "Alertas", "Agotados"], id: \.self) { Text($0) }
      }.pickerStyle(.segmented)
      Panel(accent: true) {
        Text("\(products.reduce(0) { $0 + $1.stock })").font(.largeTitle.bold()).monospacedDigit()
        Text("Unidades en la vista · \(products.count) productos")
      }
      if products.isEmpty {
        EmptyPanel(
          title: "Nada que revisar", message: "Cambia la búsqueda o el estado del inventario.")
      }
      ForEach(products) { product in
        Panel {
          HStack(alignment: .top) {
            Text(product.name).font(.headline)
            Spacer()
            StockBadge(product: product)
          }
          Text("\(product.code) · \(product.category)").font(.caption).foregroundStyle(.secondary)
          ProgressView(
            value: Double(product.stock), total: Double(max(1, products.map(\.stock).max() ?? 1))
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
