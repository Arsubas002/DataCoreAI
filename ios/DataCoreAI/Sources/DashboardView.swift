import Charts
import DataCoreDomain
import SwiftUI

struct DashboardView: View {
  @EnvironmentObject private var store: AppStore
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var selectedDate: Date?
  @State private var series = "Ingresos"
  var body: some View {
    Workspace {
      PeriodButton()
      if let summary = store.summary, let snapshot = store.snapshot {
        Panel(accent: true) {
          Label("EL PULSO DE TU NEGOCIO", systemImage: "waveform.path.ecg").font(
            .caption.weight(.bold))
          Text(Money.formatted(summary.revenueMinor)).font(.largeTitle.bold()).monospacedDigit()
            .minimumScaleFactor(0.7)
            .accessibilityLabel("Ingresos del periodo: \(Money.formatted(summary.revenueMinor))")
          Text("\(summary.salesCount) ventas · sin comparaciones estimadas").font(.subheadline)
        }
        ViewThatFits(in: .horizontal) {
          HStack(alignment: .top, spacing: 12) { metrics(summary) }
          VStack(spacing: 12) { metrics(summary) }
        }
        Panel {
          SectionTitle(
            title: "Actividad comercial", subtitle: "Toca el gráfico para explorar cada día")
          Picker("Serie del gráfico", selection: $series) {
            Text("Ingresos").tag("Ingresos")
            Text("Ventas").tag("Ventas")
          }.pickerStyle(.segmented)
          Chart {
            ForEach(summary.daily) { row in
              AreaMark(x: .value("Fecha", row.date), y: .value(series, chartValue(row)))
                .foregroundStyle(
                  LinearGradient(
                    colors: [.violet.opacity(0.3), .violet.opacity(0.02)], startPoint: .top,
                    endPoint: .bottom))
              LineMark(x: .value("Fecha", row.date), y: .value(series, chartValue(row)))
                .foregroundStyle(Color.violet).lineStyle(StrokeStyle(lineWidth: 3))
                .symbol(.circle).accessibilityLabel(row.day)
                .accessibilityValue(
                  series == "Ingresos"
                    ? Money.formatted(row.revenueMinor) : "\(row.salesCount) ventas")
            }
            if let selectedDate {
              RuleMark(x: .value("Selección", selectedDate)).foregroundStyle(Color.turquoise)
                .accessibilityHidden(true)
            }
          }
          .chartXSelection(value: $selectedDate)
          .chartXAxis {
            AxisMarks(values: .stride(by: .day, count: max(1, summary.daily.count / 5))) { _ in
              AxisValueLabel(format: .dateTime.day().month(.abbreviated))
            }
          }
          .chartYAxisLabel(series == "Ingresos" ? "Ingresos (S/)" : "Ventas")
          .frame(height: 230)
          .animation(reduceMotion ? nil : .easeInOut(duration: 0.2), value: series)
          if let selectedDate,
            let selected = summary.daily.min(by: {
              abs($0.date.timeIntervalSince(selectedDate))
                < abs($1.date.timeIntervalSince(selectedDate))
            })
          {
            Text(
              "\(selected.day) · \(Money.formatted(selected.revenueMinor)) · \(selected.salesCount) ventas"
            )
            .font(.footnote.weight(.semibold)).accessibilityIdentifier("chart-selection")
          }
          DisclosureGroup("Ver datos del gráfico") {
            ForEach(summary.daily) { day in
              LabeledContent(
                day.day, value: "\(Money.formatted(day.revenueMinor)) · \(day.salesCount) ventas"
              ).font(.footnote)
            }
          }
          if summary.salesCount == 0 {
            Text("No hay ventas en este periodo; el gráfico muestra ceros.").font(.footnote)
              .foregroundStyle(.secondary)
          }
        }
        Panel {
          SectionTitle(title: "Tu siguiente acción", subtitle: "Productos que necesitan reposición")
          let alerts = snapshot.products.filter(\.isLow).sorted { $0.stock < $1.stock }
          if alerts.isEmpty {
            Label("No hay alertas de existencias", systemImage: "checkmark.seal")
          }
          ForEach(alerts) { product in
            VStack(alignment: .leading, spacing: 8) {
              HStack {
                Text(product.name).font(.headline)
                Spacer()
                StockBadge(product: product)
              }
              Text("\(product.stock) disponibles · mínimo \(product.minimumStock)").font(
                .subheadline
              ).foregroundStyle(.secondary)
            }.accessibilityElement(children: .combine)
          }
        }
        Text("Fuente: demo v1 · estado actual \(snapshot.asOf). No son datos comerciales reales.")
          .font(.caption).foregroundStyle(.secondary)
      }
    }.navigationTitle("Dashboard").onChange(of: store.period) { _, _ in selectedDate = nil }
  }
  private func chartValue(_ row: DailyRevenue) -> Double {
    series == "Ingresos" ? Double(row.revenueMinor) / 100 : Double(row.salesCount)
  }
  @ViewBuilder private func metrics(_ summary: CommercialSummary) -> some View {
    Panel {
      Image(systemName: "shippingbox").foregroundStyle(Color.violet).accessibilityHidden(true)
      Text("\(summary.stockUnits)").font(.title.bold()).monospacedDigit()
      Text("Unidades actuales").font(.subheadline)
    }
    Panel {
      Image(systemName: "exclamationmark.circle").foregroundStyle(Color.violet).accessibilityHidden(
        true)
      Text("\(summary.alertCount)").font(.title.bold()).monospacedDigit()
      Text("Productos con alerta").font(.subheadline)
    }
  }
}
