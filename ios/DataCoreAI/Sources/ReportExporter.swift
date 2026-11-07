import DataCoreDomain
import Foundation
import UIKit

@MainActor
enum ReportExporter {
  private static var sessionFiles: [URL] = []
  private static var directory: URL {
    FileManager.default.temporaryDirectory.appendingPathComponent(
      "DataCoreDemoReports", isDirectory: true)
  }
  static func cleanPreviousSession() {
    // Only this app-owned temporary directory; never user documents or shared providers.
    try? FileManager.default.removeItem(at: directory)
    sessionFiles = []
  }
  static func make(snapshot: Snapshot, period: Period, pdf: Bool) throws -> URL {
    let valid = try snapshot.validated()
    let data: Data
    if pdf {
      let summary = valid.summary(for: period)
      let lines =
        [
          "DataCore AI · DEMO · DATOS FICTICIOS", "Ingresos por día · Moneda PEN (S/)",
          "Periodo inclusivo: \(period.start) a \(period.end)",
          "Días sin ventas incluidos. Sin información de clientes.", "",
        ]
        + summary.daily.map {
          "\($0.day)   ·   \($0.salesCount) ventas   ·   \(Money.formatted($0.revenueMinor))"
        } + [
          "", "TOTAL: \(Money.formatted(summary.revenueMinor)) · \(summary.salesCount) ventas",
          "Fuente: demostración DataCore AI. Sin datos comerciales reales.",
        ]
      let bounds = CGRect(x: 0, y: 0, width: 595, height: 842)
      let renderer = UIGraphicsPDFRenderer(bounds: bounds)
      data = renderer.pdfData { context in
        var y: CGFloat = 0
        for line in lines {
          let text = NSAttributedString(
            string: line,
            attributes: [.font: UIFont.systemFont(ofSize: 12), .foregroundColor: UIColor.black])
          let measured = text.boundingRect(
            with: CGSize(width: 523, height: CGFloat.greatestFiniteMagnitude),
            options: [.usesLineFragmentOrigin, .usesFontLeading], context: nil)
          let height = max(20, measured.height.rounded(.up))
          if y == 0 || y + height > 760 {
            context.beginPage()
            y = 40
          }
          text.draw(in: CGRect(x: 36, y: y, width: 523, height: height))
          y += height + 10
        }
      }
    } else {
      data = Data(try CSVReport.make(snapshot: valid, period: period).utf8)
    }
    guard data.count <= 10 * 1024 * 1024 else { throw BusinessError.limit }
    try FileManager.default.createDirectory(
      at: directory, withIntermediateDirectories: true,
      attributes: [.protectionKey: FileProtectionType.complete])
    let url = directory.appendingPathComponent(
      "DataCore-DEMO-\(UUID().uuidString).\(pdf ? "pdf" : "csv")")
    try data.write(to: url, options: [.atomic, .completeFileProtection])
    sessionFiles.append(url)
    if sessionFiles.count > 8 {
      try? FileManager.default.removeItem(at: sessionFiles.removeFirst())
    }
    return url
  }
}
