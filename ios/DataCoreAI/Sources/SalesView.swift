import DataCoreDomain
import SwiftUI

struct SalesView: View {
  @EnvironmentObject private var store: AppStore
  @State private var section = "Preparar"
  @State private var confirming = false
  @State private var query = ""
  var body: some View {
    Workspace {
      Picker("Vista de ventas", selection: $section) {
        Text("Preparar").tag("Preparar")
        Text("Historial").tag("Historial")
      }.pickerStyle(.segmented)
      if section == "Preparar" {
        if let notice = store.notice {
          Label(notice, systemImage: "checkmark.circle.fill").font(.subheadline)
            .accessibilityIdentifier("sale-result")
        }
        Panel {
          SectionTitle(
            title: "1 · Selecciona productos",
            subtitle: "El precio y stock se vuelven a validar al simular")
          TextField("Buscar para agregar", text: $query).textFieldStyle(.roundedBorder)
          ForEach(
            (store.snapshot?.products ?? []).filter {
              query.isEmpty || $0.name.localizedStandardContains(query)
                || $0.code.localizedStandardContains(query)
            }
          ) { product in
            HStack(alignment: .top) {
              ProductRow(product: product)
              Button {
                store.add(product)
              } label: {
                Image(systemName: "plus.circle.fill").font(.title).padding(6).frame(
                  minWidth: 44, minHeight: 44)
              }
              .disabled(product.stock == 0 || store.isWorking)
              .accessibilityLabel("Agregar \(product.name)")
            }
          }
        }
        Panel {
          SectionTitle(
            title: "2 · Tu carrito", subtitle: "Las existencias no se reservan al agregar productos"
          )
          if store.cart.isEmpty {
            EmptyPanel(
              title: "Aún no hay productos",
              message: "Agrega productos para preparar una venta ficticia.", symbol: "cart")
          }
          ForEach(store.cart) { line in
            if let product = store.snapshot?.products.first(where: { $0.id == line.productId }) {
              VStack(alignment: .leading, spacing: 10) {
                Text(product.name).font(.headline)
                Stepper(
                  "Cantidad: \(line.quantity)",
                  value: Binding(
                    get: { line.quantity }, set: { store.setQuantity(line.productId, quantity: $0) }
                  ), in: 1...max(1, min(product.stock, 999))
                )
                .disabled(store.isWorking).accessibilityLabel("Cantidad de \(product.name)")
                HStack {
                  Text(Money.formatted(product.priceMinor * Int64(line.quantity))).monospacedDigit()
                  Spacer()
                  Button("Eliminar", role: .destructive) {
                    store.setQuantity(line.productId, quantity: 0)
                  }.disabled(store.isWorking)
                    .accessibilityLabel("Eliminar \(product.name)")
                }
                Divider()
              }
            }
          }
        }
        Panel(accent: true) {
          Text("TOTAL DEL CARRITO").font(.caption.weight(.semibold))
          Text(Money.formatted(store.totalMinor)).font(.largeTitle.bold()).monospacedDigit()
          Button {
            confirming = true
          } label: {
            Label("Simular venta", systemImage: "checkmark.shield").frame(maxWidth: .infinity)
          }.buttonStyle(.borderedProminent).tint(.turquoise).foregroundStyle(Color.petroleum)
            .disabled(!store.canCheckout).accessibilityIdentifier("simulate-sale")
          Text(
            store.mode == .offlineDemo
              ? "Solo cambia la memoria local. Cierra o reinicia la demo para restaurar el catálogo."
              : "La API demo no permite confirmar ventas. Puedes preparar el carrito sin enviarlo."
          )
          .font(.footnote)
        }
      } else {
        SectionTitle(
          title: "Historial de demostración",
          subtitle: "\(store.period.start) a \(store.period.end)")
        PeriodButton()
        let sales = (store.snapshot?.sales ?? []).filter { store.period.contains($0.day) }.sorted {
          $0.day > $1.day
        }
        if sales.isEmpty {
          EmptyPanel(
            title: "Sin ventas", message: "Selecciona otro periodo para revisar el historial.",
            symbol: "receipt")
        }
        ForEach(sales) { sale in
          Panel {
            DisclosureGroup {
              ForEach(Array(sale.lines.enumerated()), id: \.offset) { _, line in
                let name =
                  store.snapshot?.products.first { $0.id == line.productId }?.name ?? "Producto"
                LabeledContent(
                  "\(name) × \(line.quantity)", value: Money.formatted(line.subtotalMinor)
                ).font(.subheadline)
              }
            } label: {
              VStack(alignment: .leading, spacing: 4) {
                Text(Money.formatted(sale.totalMinor)).font(.headline)
                Text("\(sale.day) · \(sale.id.prefix(18))").font(.caption).foregroundStyle(
                  .secondary)
              }
            }
          }
        }
      }
    }.navigationTitle("Ventas")
      .confirmationDialog(
        "¿Simular esta venta?", isPresented: $confirming, titleVisibility: .visible
      ) {
        Button("Confirmar simulación") { Task { await store.confirmDemoSale() } }
        Button("Cancelar", role: .cancel) {}
      } message: {
        Text(
          "Se descontará stock ficticio y se añadirá una venta en memoria. No se enviará nada a SQL Server."
        )
      }
  }
}
