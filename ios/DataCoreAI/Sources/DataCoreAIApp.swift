import DataCoreDomain
import Foundation
import SwiftUI

@main
@MainActor
struct DataCoreAIApp: App {
  @State private var store = AppStore()
  init() { ReportExporter.cleanPreviousSession() }
  var body: some Scene {
    WindowGroup {
      RootView().environment(store).tint(.violet).controlSize(.large)
        .modifier(UITestAppearance())
        .task { await store.load() }
    }
  }
}

struct RootView: View {
  @Environment(AppStore.self) private var store
  @State private var settings = false
  var body: some View {
    TabView {
      NavigationStack { DashboardView().toolbar { settingsButton } }.tabItem {
        Label("Inicio", systemImage: "square.grid.2x2")
      }
      NavigationStack { ProductsView() }.tabItem { Label("Productos", systemImage: "shippingbox") }
      NavigationStack { SalesView() }.tabItem { Label("Ventas", systemImage: "cart") }
      NavigationStack {
        List {
          Section("Operación comercial") {
            NavigationLink {
              InventoryView()
            } label: {
              Label("Inventario", systemImage: "shippingbox.and.arrow.backward")
            }
            NavigationLink {
              ReportsView()
            } label: {
              Label("Reportes", systemImage: "chart.bar.doc.horizontal")
            }
          }
          Section("Inteligencia") {
            NavigationLink {
              AssistantView()
            } label: {
              Label("Asistente IA", systemImage: "sparkles")
            }
          }
          Section("Tu espacio") {
            Button {
              settings = true
            } label: {
              Label("Modo y privacidad", systemImage: "gearshape")
            }
          }
          Section {
            Text("DEMO · No contiene datos reales. No necesita cuenta ni permisos del dispositivo.")
              .font(.footnote)
          }
        }.navigationTitle("Más")
      }.tabItem { Label("Más", systemImage: "ellipsis.circle") }
    }
    .overlay {
      if store.isLoading && store.snapshot == nil {
        ZStack {
          Color.petroleum.opacity(0.35).ignoresSafeArea()
          ProgressView("Cargando demostración…").padding(24).background(
            .regularMaterial, in: RoundedRectangle(cornerRadius: 20))
        }.allowsHitTesting(false)
      }
    }
    .sheet(isPresented: $settings) { SettingsView() }

  }
  @ToolbarContentBuilder private var settingsButton: some ToolbarContent {
    ToolbarItem(placement: .topBarTrailing) {
      Button {
        settings = true
      } label: {
        Image(systemName: "gearshape")
      }.accessibilityLabel("Modo y privacidad")
    }
  }
}

struct SettingsView: View {
  @Environment(AppStore.self) private var store
  @Environment(\.dismiss) private var dismiss
  @State private var address = ""
  @State private var resetting = false
  var body: some View {
    NavigationStack {
      Form {
        if let error = store.error {
          Section("No se pudo completar") { Text(error).foregroundStyle(.red) }
        }
        Section("Modo actual") {
          LabeledContent(
            "Origen", value: store.mode == .offlineDemo ? "Demo sin conexión" : "API demo HTTPS")
          Text(
            "No se conecta a SQL Server ni a Groq. No hay autenticación de usuarios ni datos comerciales reales."
          ).font(.footnote)
          Button("Restaurar demo local", role: .destructive) { resetting = true }.disabled(
            store.isWorking)
        }
        Section("Conexión opcional de desarrollo") {
          TextField("https://servidor-demo", text: $address).keyboardType(.URL)
            .textInputAutocapitalization(.never).autocorrectionDisabled()
          Text(
            "Requiere un servidor HTTPS de pruebas autorizado con certificado válido. No se despliega ninguno desde esta app. HTTP y redirecciones están bloqueados."
          ).font(.footnote)
          Button("Conectar a API demo") {
            Task {
              await store.connectDemoAPI(address)
              if store.snapshot != nil && store.error == nil { dismiss() }
            }
          }
          .disabled(address.isEmpty || store.isWorking || store.isLoading)
        }
        Section("Privacidad de esta versión") {
          Text(
            "La demo local funciona sin red. Ventas, carrito y respuestas viven en memoria y se pierden al cerrar el proceso. No hay analítica ni permisos de cámara, fotos, ubicación, contactos o seguimiento."
          )
          Text(
            "CSV/PDF solo se crean al solicitarlos; iOS permite compartirlos con otras aplicaciones. Se eliminan al siguiente inicio. Al usar API demo se envían la pregunta permitida y fechas, y el servidor ve la dirección de red."
          )
          Text(
            "La política pública y la ficha de privacidad App Store deben verificarse antes de distribuir: este texto describe el comportamiento implementado, no una certificación normativa."
          )
        }.font(.footnote)
      }.navigationTitle("Modo y privacidad").navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Cerrar") { dismiss() } } }
        .confirmationDialog(
          "¿Restaurar datos ficticios?", isPresented: $resetting, titleVisibility: .visible
        ) {
          Button("Restaurar demo", role: .destructive) {
            Task {
              await store.useOfflineDemo()
              dismiss()
            }
          }
        } message: {
          Text("Se descartarán el carrito y las ventas simuladas de esta sesión.")
        }
    }
  }
}

private struct DemoPreview: View {
  @State private var store = AppStore()
  var body: some View {
    RootView().environment(store).tint(.violet).controlSize(.large).task {
      await store.load()
    }
  }
}

#Preview("Demo nativa") { DemoPreview() }

/// Debug-only appearance fixtures; normal launches preserve the user's system settings.
private struct UITestAppearance: ViewModifier {
  @ViewBuilder func body(content: Content) -> some View {
    #if DEBUG
      if ProcessInfo.processInfo.arguments.contains("--ui-dark-large") {
        content.preferredColorScheme(.dark).dynamicTypeSize(.accessibility3)
      } else {
        content
      }
    #else
      content
    #endif
  }
}
