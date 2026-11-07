import Charts
import DataCoreDomain
import SwiftUI

struct DashboardView: View {
  @Environment(AppStore.self) private var store
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.dynamicTypeSize) private var typeSize
  @State private var selectedDate: Date?
  @State private var series = "Ingresos"
  @State private var presentation = "Área"
  var body: some View {
    Workspace {
      PeriodButton()
      if let summary = store.summary, let snapshot = store.snapshot {
        Panel(accent: true) {
          Label("EL PULSO DE TU NEGOCIO", systemImage: "waveform.path.ecg").font(
            .caption.weight(.bold))
          Text(Money.formatted(summary.revenueMinor)).font(.largeTitle.bold()).monospacedDigit()
            .minimumScaleFactor(0.7)
            .accessibilityIdentifier("dashboard-income")
            .accessibilityLabel("Ingresos del periodo: \(Money.formatted(summary.revenueMinor))")
          Text("\(summary.salesCount) ventas · sin comparaciones estimadas").font(.subheadline)
        }
        if typeSize.isAccessibilitySize {
          VStack(spacing: 12) { metrics(summary) }
        } else {
          HStack(alignment: .top, spacing: 12) { metrics(summary) }
        }
        Panel {
          SectionTitle(
            title: "Actividad comercial", subtitle: "Toca el gráfico para explorar cada día")
          AdaptiveChoice(
            title: "Serie del gráfico", options: ["Ingresos", "Ventas"], selection: $series)
          Picker("Representación", selection: $presentation) {
            Text("Área y puntos").tag("Área")
            Text("Barras").tag("Barras")
          }.pickerStyle(.menu)
          Chart {
            ForEach(summary.daily) { row in
              if presentation == "Barras" {
                BarMark(x: .value("Fecha", row.date), y: .value(series, chartValue(row)))
                  .foregroundStyle(series == "Ingresos" ? Color.violet : Color.turquoise)
                  .cornerRadius(4).accessibilityLabel(row.day)
                  .accessibilityValue(
                    series == "Ingresos"
                      ? Money.formatted(row.revenueMinor) : "\(row.salesCount) ventas")
              } else {
                AreaMark(x: .value("Fecha", row.date), y: .value(series, chartValue(row)))
                  .foregroundStyle(
                    LinearGradient(
                      colors: [
                        (series == "Ingresos" ? Color.violet : .turquoise).opacity(0.3), .clear,
                      ], startPoint: .top, endPoint: .bottom)
                  )
                  .accessibilityHidden(true)
                LineMark(x: .value("Fecha", row.date), y: .value(series, chartValue(row)))
                  .foregroundStyle(series == "Ingresos" ? Color.violet : Color.turquoise)
                  .lineStyle(StrokeStyle(lineWidth: 3)).symbol(.circle)
                  .accessibilityLabel(row.day)
                  .accessibilityValue(
                    series == "Ingresos"
                      ? Money.formatted(row.revenueMinor) : "\(row.salesCount) ventas")
              }
            }
            if let selectedDate {
              RuleMark(x: .value("Selección", selectedDate)).foregroundStyle(Color.turquoise)
                .accessibilityHidden(true)
            }
          }
          .chartXSelection(value: $selectedDate)
          .environment(\.timeZone, DemoDate.calendar.timeZone)
          .environment(\.calendar, DemoDate.calendar)
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
        let ranked = Array(snapshot.topProducts(for: store.period).prefix(3))
        if !ranked.isEmpty {
          Panel {
            SectionTitle(
              title: "Productos que impulsan tus ventas",
              subtitle: "Unidades vendidas del periodo, no existencias")
            Chart(ranked) { product in
              BarMark(x: .value("Unidades", product.units), y: .value("Producto", product.name))
                .foregroundStyle(Color.turquoise).cornerRadius(4)
                .accessibilityLabel(product.name).accessibilityValue("\(product.units) unidades")
            }.frame(height: 150)
            DisclosureGroup("Detalle de productos") {
              ForEach(ranked) { product in
                LabeledContent(
                  product.name,
                  value: "\(product.units) uds · \(Money.formatted(product.revenueMinor))"
                ).font(.footnote)
              }
            }
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
