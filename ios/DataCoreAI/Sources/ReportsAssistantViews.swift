import Charts
import DataCoreDomain
import SwiftUI

struct ReportsView: View {
  @EnvironmentObject private var store: AppStore
  @State private var format = "CSV"
  @State private var sharedFile: URL?
  @State private var error: String?
  var body: some View {
    Workspace {
      SectionTitle(
        title: "Del análisis a la acción",
        subtitle: "Ingresos diarios verificables, listos para compartir")
      PeriodButton()
      if let summary = store.summary, let snapshot = store.snapshot {
        Panel {
          LabeledContent("Ingresos", value: Money.formatted(summary.revenueMinor)).font(.headline)
          LabeledContent("Ventas", value: String(summary.salesCount))
          Chart(summary.daily) { row in
            BarMark(
              x: .value("Día", row.day), y: .value("Ingresos (S/)", Double(row.revenueMinor) / 100)
            )
            .foregroundStyle(Color.turquoise).cornerRadius(4)
            .accessibilityLabel(row.day).accessibilityValue(Money.formatted(row.revenueMinor))
          }.frame(height: 180).chartXAxis(.hidden).chartYAxisLabel("S/")
          DisclosureGroup("Revisar datos") {
            ForEach(summary.daily) { row in
              LabeledContent(row.day, value: Money.formatted(row.revenueMinor)).font(.footnote)
            }
          }
        }
        Panel {
          SectionTitle(
            title: "Preparar archivo",
            subtitle: "Solo el reporte elegido se entrega a la hoja de compartir de iOS")
          Picker("Formato", selection: $format) {
            Text("CSV").tag("CSV")
            Text("PDF").tag("PDF")
          }.pickerStyle(.segmented)
          Text(
            "PEN · \(summary.daily.count) días · datos ficticios. Los archivos se guardan temporalmente con protección de datos."
          ).font(.footnote).foregroundStyle(.secondary)
          Button {
            do {
              sharedFile = try ReportExporter.make(
                snapshot: snapshot, period: store.period, pdf: format == "PDF")
              error = nil
            } catch {
              self.error = "No se pudo preparar el archivo. Reduce el periodo e inténtalo de nuevo."
            }
          } label: {
            Label("Preparar \(format)", systemImage: "doc.badge.plus").frame(maxWidth: .infinity)
          }
          .buttonStyle(.borderedProminent)
          if let sharedFile {
            ShareLink(item: sharedFile) {
              Label("Compartir reporte", systemImage: "square.and.arrow.up").frame(
                maxWidth: .infinity)
            }
            .buttonStyle(.bordered).accessibilityIdentifier("share-report")
            Text(
              "Elige destinatarios con cuidado: al compartir, otra aplicación recibe el archivo."
            ).font(.caption)
          }
          if let error { Text(error).foregroundStyle(.red).accessibilityLabel("Error: \(error)") }
        }
        Text(
          "Incluye fechas, moneda, total y etiqueta demo. Excel nativo no está implementado en iOS; las exportaciones de Streamlit siguen intactas."
        ).font(.footnote).foregroundStyle(.secondary)
      }
    }.navigationTitle("Reportes")
      .onChange(of: store.period) { _, _ in sharedFile = nil }
      .onChange(of: format) { _, _ in sharedFile = nil }
      .onChange(of: store.summary?.revenueMinor) { _, _ in sharedFile = nil }
  }
}

struct AssistantView: View {
  @EnvironmentObject private var store: AppStore
  var body: some View {
    Workspace {
      Panel(accent: true) {
        Label("INTELIGENCIA CON EVIDENCIA", systemImage: "sparkles").font(
          .caption.weight(.semibold))
        Text("Pregúntale a tus datos").font(.title2.bold())
        Text(
          "Cuatro consultas verificables. Esta demo no utiliza un modelo generativo ni envía información a Groq."
        ).font(.subheadline)
      }
      PeriodButton()
      SectionTitle(title: "Inicia una consulta", subtitle: "No se acepta SQL ni texto libre")
      ForEach(Question.allCases) { question in
        Button {
          Task { await store.ask(question) }
        } label: {
          HStack {
            Text(question.title).multilineTextAlignment(.leading)
            Spacer()
            Image(systemName: "arrow.up.circle.fill")
          }.padding(.vertical, 6)
        }.buttonStyle(.bordered).disabled(store.isWorking).accessibilityIdentifier(
          "ask-\(question.rawValue)")
      }
      if store.isWorking { ProgressView("Preparando respuesta…").frame(maxWidth: .infinity) }
      if store.answers.isEmpty && !store.isWorking {
        EmptyPanel(
          title: "Una respuesta con contexto",
          message: "Elige una pregunta. Verás la fuente y el periodo junto a la respuesta.",
          symbol: "bubble.left.and.text.bubble.right")
      }
      ForEach(store.answers.reversed()) { answer in
        VStack(alignment: .leading, spacing: 10) {
          Text(answer.question.title).font(.subheadline.weight(.semibold)).padding(12)
            .background(Color.violet.opacity(0.12), in: RoundedRectangle(cornerRadius: 18)).frame(
              maxWidth: .infinity, alignment: .trailing)
          Panel {
            Label("DataCore · modo guiado", systemImage: "checkmark.shield").font(.caption)
              .foregroundStyle(Color.violet)
            // Plain Text, never Markdown/HTML, links or executable model output.
            Text(verbatim: answer.text).textSelection(.enabled)
            DisclosureGroup("Fuentes y alcance") {
              ForEach(Array(answer.sources.enumerated()), id: \.offset) { _, source in
                Text(verbatim: source).font(.footnote).foregroundStyle(.secondary)
              }
            }
          }
        }
      }
    }.navigationTitle("Asistente IA")
  }
}
