import Foundation

public enum RepositoryMode: String, Sendable { case offlineDemo, remoteDemo }

public protocol BusinessRepository: Sendable {
  var mode: RepositoryMode { get }
  func snapshot() async throws -> Snapshot
  func checkout(_ cart: [CartLine], requestId: UUID) async throws -> Sale
  func answer(_ question: Question, period: Period) async throws -> AssistantAnswer
}

public enum DemoFixture {
  public static func load() throws -> Snapshot {
    guard let url = Bundle.module.url(forResource: "demo-v1", withExtension: "json") else {
      throw BusinessError.invalidData
    }
    return try decode(Data(contentsOf: url))
  }
  public static func decode(_ data: Data) throws -> Snapshot {
    let decoder = JSONDecoder()
    decoder.keyDecodingStrategy = .convertFromSnakeCase
    return try decoder.decode(Snapshot.self, from: data).validated()
  }
}

public actor DemoRepository: BusinessRepository {
  public nonisolated let mode = RepositoryMode.offlineDemo
  private var data: Snapshot?
  private var receipts: [UUID: (cart: [CartLine], sale: Sale)] = [:]
  public init() {}

  public func snapshot() async throws -> Snapshot {
    if let data { return data }
    let fixture = try DemoFixture.load()
    data = fixture
    return fixture
  }

  public func checkout(_ cart: [CartLine], requestId: UUID) async throws -> Sale {
    let normalized = cart.sorted { $0.productId < $1.productId }
    if let receipt = receipts[requestId] {
      guard receipt.cart == normalized else { throw BusinessError.duplicateRequest }
      return receipt.sale
    }
    var current = try await snapshot()
    guard receipts.count < 1000, current.sales.count < 5000 else { throw BusinessError.limit }
    let lines = try current.quote(cart)
    // Validate everything before mutating. There are no suspension points during commit.
    let sale = Sale(id: "demo-\(requestId.uuidString)", day: current.asOf, lines: lines)
    for line in lines {
      let index = current.products.firstIndex { $0.id == line.productId }!
      current.products[index].stock -= line.quantity
    }
    current.sales.append(sale)
    data = current
    receipts[requestId] = (normalized, sale)
    return sale
  }

  public func answer(_ question: Question, period: Period) async throws -> AssistantAnswer {
    let current = try await snapshot()
    let summary = current.summary(for: period)
    let text: String
    switch question {
    case .revenue:
      text =
        "Ingresos: \(Money.formatted(summary.revenueMinor)) en \(summary.salesCount) ventas ficticias."
    case .average:
      if summary.salesCount == 0 {
        text = "El ticket promedio no está definido sin ventas."
      } else {
        // Explicit half-up rounding for presentation; never used to charge a sale.
        let count = Int64(summary.salesCount)
        let rounded = (summary.revenueMinor + count / 2) / count
        text = "Ticket promedio: \(Money.formatted(rounded))."
      }
    case .stockAlerts:
      text = "\(summary.alertCount) productos tienen stock menor o igual al mínimo actual."
    case .topProducts:
      var counts: [String: Int] = [:]
      for sale in current.sales where period.contains(sale.day) {
        for line in sale.lines { counts[line.productId, default: 0] += line.quantity }
      }
      let ranked = counts.sorted { $0.value == $1.value ? $0.key < $1.key : $0.value > $1.value }
        .prefix(3)
      text =
        ranked.isEmpty
        ? "No hay productos vendidos en este periodo."
        : ranked.map { pair in
          "\(current.products.first { $0.id == pair.key }!.name): \(pair.value) unidades"
        }.joined(separator: "; ")
    }
    return AssistantAnswer(
      question: question, text: text,
      sources: [
        "Demostración local · datos ficticios; sin IA generativa.",
        "Ventas inclusivas: \(period.start) a \(period.end).",
        "Existencias actuales de la demo: \(current.asOf), no históricas.",
      ])
  }
}

public enum CSVReport {
  public static func make(snapshot: Snapshot, period: Period) throws -> String {
    let data = try snapshot.validated()
    let summary = data.summary(for: period)
    guard summary.daily.count <= 366 else { throw BusinessError.limit }
    func cell(_ value: String) -> String {
      let dangerous =
        value.trimmingCharacters(in: .whitespacesAndNewlines).first.map { "=+-@".contains($0) }
        ?? false
      let safe = (dangerous ? "'" : "") + value
      return "\"" + safe.replacingOccurrences(of: "\"", with: "\"\"") + "\""
    }
    var rows = [
      ["DataCore AI", "DEMO · DATOS FICTICIOS"], ["Moneda", "PEN"],
      ["Desde inclusive", period.start], ["Hasta inclusive", period.end],
      ["Alcance", "Ingresos diarios; días sin ventas incluidos"],
      ["Fecha", "Ventas", "Ingresos (S/)"],
    ]
    rows += summary.daily.map {
      [
        $0.day, String($0.salesCount),
        String(format: "%lld.%02lld", $0.revenueMinor / 100, $0.revenueMinor % 100),
      ]
    }
    rows.append([
      "TOTAL", String(summary.salesCount),
      String(format: "%lld.%02lld", summary.revenueMinor / 100, summary.revenueMinor % 100),
    ])
    return "\u{feff}" + rows.map { $0.map(cell).joined(separator: ",") }.joined(separator: "\r\n")
      + "\r\n"
  }
}
