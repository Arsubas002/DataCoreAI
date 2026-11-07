import Charts
import DataCoreDomain
import SwiftUI

struct ReportsView: View {
  @Environment(AppStore.self) private var store
  @State private var format = "CSV"
  @State private var sharedFile: URL?
  @State private var error: String?
  @State private var selectedDay: String?
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
            .chartXSelection(value: $selectedDay)
          if let day = summary.daily.first(where: { $0.day == selectedDay }) {
            Text("\(day.day) · \(Money.formatted(day.revenueMinor)) · \(day.salesCount) ventas")
              .font(.footnote.weight(.semibold))
          }
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
          AdaptiveChoice(title: "Formato", options: ["CSV", "PDF"], selection: $format)
          Text(
            "PEN · \(summary.daily.count) días · datos ficticios. Los archivos se guardan temporalmente con protección de datos."
          ).font(.footnote).foregroundStyle(.secondary)
          Button {
            do {
              sharedFile = nil
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
      .onChange(of: store.period) { _, _ in
        sharedFile = nil
        error = nil
        selectedDay = nil
      }
      .onChange(of: format) { _, _ in
        sharedFile = nil
        error = nil
        selectedDay = nil
      }
      .onChange(of: store.snapshotRevision) { _, _ in
        sharedFile = nil
        error = nil
        selectedDay = nil
      }
  }
}

struct AssistantView: View {
  @Environment(AppStore.self) private var store
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @AccessibilityFocusState private var focusedQuestion: Question?
  @State private var questionsExpanded = true
  var body: some View {
    ScrollViewReader { proxy in
      Workspace {
        Panel(accent: true) {
          Label("INTELIGENCIA CON EVIDENCIA", systemImage: "sparkles").font(
            .caption.weight(.semibold))
          Text("Una conversación con tus datos").font(.title2.bold())
          Text("Modo guiado · sin IA generativa. Cada respuesta incluye su fuente y periodo.").font(
            .subheadline)
        }
        PeriodButton()
        Panel {
          DisclosureGroup("Preguntas comerciales", isExpanded: $questionsExpanded) {
            ForEach(Question.allCases) { question in
              Button {
                Task { await store.ask(question) }
              } label: {
                HStack {
                  Text(question.title).multilineTextAlignment(.leading)
                  Spacer()
                  Image(systemName: "arrow.up.circle.fill").accessibilityHidden(true)
                }.padding(.vertical, 8)
              }.buttonStyle(.bordered)
                .disabled(store.isWorking || store.isLoading || store.hasPendingSale)
                .accessibilityIdentifier("ask-\(question.rawValue)")
            }
            Text("No se envía texto libre, SQL ni información privada a proveedores externos.")
              .font(.caption).foregroundStyle(.secondary)
          }
        }
        if store.isAnswering {
          ProgressView("Consultando la evidencia…").frame(maxWidth: .infinity)
        }
        if store.answers.isEmpty && !store.isAnswering {
          EmptyPanel(
            title: "Tu próxima decisión empieza aquí",
            message: "Elige una pregunta para consultar los datos ficticios del periodo.",
            symbol: "bubble.left.and.text.bubble.right")
        }
        ForEach(store.answers) { answer in
          VStack(alignment: .leading, spacing: 12) {
            Text(answer.question.title).font(.subheadline.weight(.semibold)).padding(14)
              .background(Color.violet.opacity(0.14), in: RoundedRectangle(cornerRadius: 18))
              .frame(maxWidth: .infinity, alignment: .trailing)
            Panel {
              Label("DataCore · respuesta verificada por cálculo", systemImage: "checkmark.shield")
                .font(.caption).foregroundStyle(Color.violet)
              Text(verbatim: answer.text).textSelection(.enabled)
                .accessibilityIdentifier("assistant-answer-\(answer.question.rawValue)")
                .accessibilityFocused($focusedQuestion, equals: answer.question)
              DisclosureGroup("Fuentes y alcance") {
                ForEach(Array(answer.sources.enumerated()), id: \.offset) { _, source in
                  Text(verbatim: source).font(.footnote).foregroundStyle(.secondary)
                }
              }
            }
          }
        }
        Color.clear.frame(height: 1).id("last-answer").accessibilityHidden(true)
      }.navigationTitle("Asistente IA")
        .onChange(of: store.conversationRevision) { _, _ in
          if reduceMotion {
            proxy.scrollTo("last-answer", anchor: .bottom)
          } else {
            withAnimation(.easeOut(duration: 0.2)) {
              proxy.scrollTo("last-answer", anchor: .bottom)
            }
          }
          focusedQuestion = store.answers.last?.question
        }
    }
  }
}
