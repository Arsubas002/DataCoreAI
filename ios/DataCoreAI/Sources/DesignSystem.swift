import DataCoreDomain
import Foundation
import SwiftUI

extension Color {
  static let petroleum = Color(red: 13 / 255, green: 23 / 255, blue: 38 / 255)
  static let violet = Color(red: 118 / 255, green: 89 / 255, blue: 232 / 255)
  static let turquoise = Color(red: 36 / 255, green: 201 / 255, blue: 192 / 255)
  static let coldWhite = Color(red: 242 / 255, green: 245 / 255, blue: 250 / 255)
}

struct Panel<Content: View>: View {
  @Environment(\.colorScheme) private var scheme
  var accent = false
  @ViewBuilder var content: Content
  var body: some View {
    VStack(alignment: .leading, spacing: 16) { content }
      .padding(20).frame(maxWidth: .infinity, alignment: .leading)
      .foregroundStyle(accent ? Color.white : Color.primary)
      .background(
        accent
          ? AnyShapeStyle(
            LinearGradient(
              colors: [.violet, Color(red: 0.29, green: 0.20, blue: 0.67)], startPoint: .topLeading,
              endPoint: .bottomTrailing))
          : AnyShapeStyle(scheme == .dark ? Color(red: 0.09, green: 0.14, blue: 0.22) : .white),
        in: RoundedRectangle(cornerRadius: 24)
      )
      .overlay(
        RoundedRectangle(cornerRadius: 24).strokeBorder(
          accent ? .white.opacity(0.15) : .secondary.opacity(0.12))
      )
      .shadow(color: .petroleum.opacity(scheme == .dark ? 0.15 : 0.05), radius: 15, y: 6)
  }
}

struct Workspace<Content: View>: View {
  @Environment(\.colorScheme) private var scheme
  @Environment(AppStore.self) private var store
  @ViewBuilder var content: Content
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 20) {
        Label(
          store.mode == .offlineDemo ? "DEMO LOCAL · DATOS FICTICIOS" : "API DEMO · SOLO LECTURA",
          systemImage: store.mode == .offlineDemo ? "iphone" : "lock.shield"
        )
        .font(.caption.weight(.semibold)).foregroundStyle(.secondary)
        .accessibilityIdentifier("demo-banner")
        if let error = store.error {
          VStack(alignment: .leading, spacing: 8) {
            Label(error, systemImage: "exclamationmark.triangle").font(.subheadline)
            Button("Cerrar aviso") { store.error = nil }
          }.padding(14).frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.violet.opacity(0.12), in: RoundedRectangle(cornerRadius: 16))
            .accessibilityElement(children: .contain)
        }
        if store.snapshot == nil && !store.isLoading {
          EmptyPanel(
            title: "No se han cargado los datos",
            message: "Reintenta para abrir tu espacio de demostración.",
            symbol: "wifi.exclamationmark")
          Button("Reintentar carga") { Task { await store.load() } }.buttonStyle(.borderedProminent)
        } else {
          content
        }
      }.padding(20)
    }
    .background(scheme == .dark ? Color.petroleum : .coldWhite)
    .refreshable { await store.load() }
  }
}

struct SectionTitle: View {
  let title: String
  let subtitle: String
  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(title).font(.title3.bold()).accessibilityAddTraits(.isHeader)
      Text(subtitle).font(.subheadline).foregroundStyle(.secondary)
    }
  }
}

struct StockBadge: View {
  @Environment(\.colorScheme) private var scheme
  let product: Product
  var body: some View {
    Label(
      product.stockLabel,
      systemImage: product.stock == 0
        ? "xmark.circle" : product.isLow ? "exclamationmark.triangle" : "checkmark.circle"
    )
    .font(.caption.weight(.semibold)).padding(.horizontal, 10).padding(.vertical, 6)
    .foregroundStyle(
      product.isLow
        ? Color.primary
        : (scheme == .dark ? Color.turquoise : Color(red: 0.0, green: 0.42, blue: 0.40))
    )
    .background(
      product.isLow ? Color.violet.opacity(0.16) : Color.turquoise.opacity(0.22), in: Capsule())
  }
}

struct ProductRow: View {
  let product: Product
  var body: some View {
    HStack(alignment: .top, spacing: 12) {
      Image(systemName: "shippingbox").font(.title2).foregroundStyle(Color.violet)
        .frame(width: 44, height: 44).background(
          Color.violet.opacity(0.1), in: RoundedRectangle(cornerRadius: 13)
        ).accessibilityHidden(true)
      VStack(alignment: .leading, spacing: 4) {
        Text(product.name).font(.headline)
        Text("\(product.code) · \(product.category)").font(.caption).foregroundStyle(.secondary)
        Text(Money.formatted(product.priceMinor)).font(.subheadline.weight(.semibold))
          .monospacedDigit()
      }
      Spacer(minLength: 0)
    }.accessibilityElement(children: .combine)
  }
}

struct EmptyPanel: View {
  let title: String
  let message: String
  var symbol = "tray"
  var body: some View {
    ContentUnavailableView(title, systemImage: symbol, description: Text(message))
  }
}

struct PeriodPicker: View {
  @Environment(AppStore.self) private var store
  @Environment(\.dismiss) private var dismiss
  @State private var start = DemoDate.parse(Period.demoWeek.start)!
  @State private var end = DemoDate.parse(Period.demoWeek.end)!
  @State private var message: String?
  var body: some View {
    NavigationStack {
      Form {
        Section("Ventas del periodo") {
          DatePicker("Desde", selection: $start, displayedComponents: .date)
          DatePicker("Hasta inclusive", selection: $end, displayedComponents: .date)
          Text("Hasta 366 días. Las existencias representan el estado actual, no el histórico.")
            .font(.footnote)
        }
        if let message {
          Text(message).foregroundStyle(.red).accessibilityLabel("Error: \(message)")
        }
        Button("Aplicar periodo") {
          do {
            _ = try Period(start: DemoDate.string(start), end: DemoDate.string(end))
            store.setPeriod(start: start, end: end)
            dismiss()
          } catch { message = error.localizedDescription }
        }.disabled(store.isWorking)
      }
      .navigationTitle("Periodo").navigationBarTitleDisplayMode(.inline)
      .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cerrar") { dismiss() } } }
      .onAppear {
        start = DemoDate.parse(store.period.start)!
        end = DemoDate.parse(store.period.end)!
      }
      .environment(\.timeZone, DemoDate.calendar.timeZone)
      .environment(\.calendar, DemoDate.calendar)
    }
  }
}

struct PeriodButton: View {
  @Environment(AppStore.self) private var store
  @State private var presenting = false
  var body: some View {
    Button {
      presenting = true
    } label: {
      Label("\(store.period.start) → \(store.period.end)", systemImage: "calendar")
        .font(.subheadline).frame(maxWidth: .infinity, alignment: .leading)
    }.buttonStyle(.bordered).disabled(store.isWorking)
      .sheet(isPresented: $presenting) { PeriodPicker() }
  }
}

/// Segmented controls become native menus at accessibility sizes rather than truncating text.
struct AdaptiveChoice: View {
  let title: String
  let options: [String]
  @Binding var selection: String
  @Environment(\.dynamicTypeSize) private var typeSize
  var body: some View {
    if typeSize.isAccessibilitySize {
      picker.pickerStyle(.menu)
    } else {
      picker.pickerStyle(.segmented)
    }
  }
  private var picker: some View {
    Picker(title, selection: $selection) { ForEach(options, id: \.self) { Text($0).tag($0) } }
  }
}
