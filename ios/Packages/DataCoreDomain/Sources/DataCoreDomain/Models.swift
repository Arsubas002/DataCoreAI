import Foundation

public enum BusinessError: Error, LocalizedError, Equatable {
  case invalidData, invalidPeriod, invalidQuantity, unavailable, emptyCart, limit, readOnly,
    duplicateRequest
  public var errorDescription: String? {
    switch self {
    case .invalidData: return "Los datos no cumplen el contrato comercial."
    case .invalidPeriod: return "Elige un periodo válido de hasta 366 días."
    case .invalidQuantity: return "Usa cantidades enteras entre 1 y 999, sin repetir productos."
    case .unavailable: return "El producto no está disponible o no tiene stock suficiente."
    case .emptyCart: return "Agrega al menos un producto al carrito."
    case .limit: return "Se alcanzó el límite de la demostración. Reiníciala para continuar."
    case .readOnly: return "La API es de solo lectura; las ventas solo se simulan sin conexión."
    case .duplicateRequest: return "Esta clave ya se usó con otro carrito."
    }
  }
}

public enum Money {
  public static let maximum: Int64 = 999_999_999_999
  public static func formatted(_ minor: Int64) -> String {
    (Decimal(minor) / 100).formatted(.currency(code: "PEN").locale(Locale(identifier: "es_PE")))
  }
  public static func validate(_ minor: Int64) throws {
    guard (0...maximum).contains(minor) else { throw BusinessError.invalidData }
  }
}

public enum DemoDate {
  public static var calendar: Calendar {
    var value = Calendar(identifier: .gregorian)
    value.timeZone = TimeZone(secondsFromGMT: 0)!
    return value
  }
  public static func parse(_ text: String) -> Date? {
    let parts = text.split(separator: "-").compactMap { Int($0) }
    guard parts.count == 3, text.count == 10,
      let result = calendar.date(
        from: DateComponents(year: parts[0], month: parts[1], day: parts[2])),
      string(result) == text
    else { return nil }
    return result
  }
  public static func string(_ date: Date) -> String {
    let parts = calendar.dateComponents([.year, .month, .day], from: date)
    return String(format: "%04d-%02d-%02d", parts.year!, parts.month!, parts.day!)
  }
}

public struct Period: Equatable, Sendable {
  public let start: String
  public let end: String
  public init(start: String, end: String) throws {
    guard let first = DemoDate.parse(start), let last = DemoDate.parse(end), first <= last,
      DemoDate.calendar.dateComponents([.day], from: first, to: last).day! < 366
    else {
      throw BusinessError.invalidPeriod
    }
    self.start = start
    self.end = end
  }
  public static let demoWeek = try! Period(start: "2026-11-01", end: "2026-11-07")
  public func contains(_ day: String) -> Bool { day >= start && day <= end }
  public var days: [String] {
    let first = DemoDate.parse(start)!
    let last = DemoDate.parse(end)!
    let count = DemoDate.calendar.dateComponents([.day], from: first, to: last).day!
    return (0...count).map {
      DemoDate.string(DemoDate.calendar.date(byAdding: .day, value: $0, to: first)!)
    }
  }
}

public struct Product: Codable, Identifiable, Hashable, Sendable {
  public let id: String
  public let code: String
  public let name: String
  public let category: String
  public let priceMinor: Int64
  public var stock: Int
  public let minimumStock: Int
  public var isLow: Bool { stock <= minimumStock }
  public var stockLabel: String { stock == 0 ? "Agotado" : isLow ? "Stock bajo" : "Disponible" }
}

public struct SaleLine: Codable, Hashable, Sendable {
  public let productId: String
  public let quantity: Int
  public let unitPriceMinor: Int64
  public var subtotalMinor: Int64 { unitPriceMinor * Int64(quantity) }
  public init(productId: String, quantity: Int, unitPriceMinor: Int64) {
    self.productId = productId
    self.quantity = quantity
    self.unitPriceMinor = unitPriceMinor
  }
}

public struct Sale: Codable, Identifiable, Hashable, Sendable {
  public let id: String
  public let day: String
  public let lines: [SaleLine]
  public var totalMinor: Int64 { lines.reduce(0) { $0 + $1.subtotalMinor } }
  public init(id: String, day: String, lines: [SaleLine]) {
    self.id = id
    self.day = day
    self.lines = lines
  }
}

public struct CartLine: Codable, Hashable, Identifiable, Sendable {
  public let productId: String
  public var quantity: Int
  public var id: String { productId }
  public init(productId: String, quantity: Int) {
    self.productId = productId
    self.quantity = quantity
  }
}

public struct DailyRevenue: Identifiable, Sendable {
  public let day: String
  public let revenueMinor: Int64
  public let salesCount: Int
  public var id: String { day }
  public var date: Date { DemoDate.parse(day)! }
}

public struct CommercialSummary: Sendable {
  public let period: Period
  public let revenueMinor: Int64
  public let salesCount: Int
  public let stockUnits: Int
  public let alertCount: Int
  public let daily: [DailyRevenue]
}

public struct Snapshot: Codable, Sendable {
  public let version: Int
  public let mode: String
  public let currency: String
  public let asOf: String
  public var products: [Product]
  public var sales: [Sale]

  public func validated() throws -> Snapshot {
    guard version == 1, mode == "demo", currency == "PEN", DemoDate.parse(asOf) != nil,
      products.count <= 5000, sales.count <= 5000,
      Set(products.map(\.id)).count == products.count,
      Set(sales.map(\.id)).count == sales.count
    else { throw BusinessError.invalidData }
    for product in products {
      guard !product.id.isEmpty, product.id.count <= 64, !product.name.isEmpty,
        product.name.count <= 120,
        !product.code.isEmpty, product.code.count <= 32, !product.category.isEmpty,
        product.category.count <= 80, (0...1_000_000).contains(product.stock),
        (0...1_000_000).contains(product.minimumStock)
      else { throw BusinessError.invalidData }
      try Money.validate(product.priceMinor)
    }
    let ids = Set(products.map(\.id))
    for sale in sales {
      guard !sale.id.isEmpty, sale.id.count <= 64, DemoDate.parse(sale.day) != nil,
        sale.day <= asOf,
        !sale.lines.isEmpty, sale.lines.count <= 50
      else { throw BusinessError.invalidData }
      for line in sale.lines {
        guard ids.contains(line.productId), (1...999).contains(line.quantity) else {
          throw BusinessError.invalidData
        }
        try Money.validate(line.unitPriceMinor)
      }
      try Money.validate(sale.totalMinor)
    }
    // Bounds above make all subsequent multiplication/summation safe for Int64.
    return self
  }

  public func summary(for period: Period) -> CommercialSummary {
    var dailyTotals: [String: (revenue: Int64, count: Int)] = [:]
    var revenue: Int64 = 0
    var count = 0
    for sale in sales where period.contains(sale.day) {
      let amount = sale.totalMinor
      revenue += amount
      count += 1
      let previous = dailyTotals[sale.day, default: (0, 0)]
      dailyTotals[sale.day] = (previous.revenue + amount, previous.count + 1)
    }
    let daily = period.days.map { day in
      let value = dailyTotals[day, default: (0, 0)]
      return DailyRevenue(day: day, revenueMinor: value.revenue, salesCount: value.count)
    }
    return CommercialSummary(
      period: period, revenueMinor: revenue, salesCount: count,
      stockUnits: products.reduce(0) { $0 + $1.stock }, alertCount: products.filter(\.isLow).count,
      daily: daily)
  }

  public func topProducts(for period: Period) -> [ProductPerformance] {
    var totals: [String: (units: Int, revenue: Int64)] = [:]
    for sale in sales where period.contains(sale.day) {
      for line in sale.lines {
        let previous = totals[line.productId, default: (0, 0)]
        totals[line.productId] = (
          previous.units + line.quantity, previous.revenue + line.subtotalMinor
        )
      }
    }
    return products.compactMap { product -> ProductPerformance? in
      guard let value = totals[product.id] else { return nil }
      return ProductPerformance(
        id: product.id, name: product.name, units: value.units, revenueMinor: value.revenue)
    }.sorted { $0.units == $1.units ? $0.id < $1.id : $0.units > $1.units }
  }

  public func quote(_ cart: [CartLine]) throws -> [SaleLine] {
    _ = try validated()
    guard !cart.isEmpty else { throw BusinessError.emptyCart }
    guard cart.count <= 50 else { throw BusinessError.limit }
    guard Set(cart.map(\.productId)).count == cart.count else {
      throw BusinessError.invalidQuantity
    }
    let lines = try cart.map { item -> SaleLine in
      guard (1...999).contains(item.quantity) else { throw BusinessError.invalidQuantity }
      guard let product = products.first(where: { $0.id == item.productId }),
        item.quantity <= product.stock
      else {
        throw BusinessError.unavailable
      }
      return SaleLine(
        productId: product.id, quantity: item.quantity, unitPriceMinor: product.priceMinor)
    }
    try Money.validate(lines.reduce(0) { $0 + $1.subtotalMinor })
    return lines
  }
}

public enum Question: String, CaseIterable, Codable, Identifiable, Sendable {
  case revenue, average
  case topProducts = "top_products"
  case stockAlerts = "stock_alerts"
  public var id: String { rawValue }
  public var title: String {
    switch self {
    case .revenue: return "¿Cuánto vendimos?"
    case .average: return "¿Cuál es el ticket promedio?"
    case .topProducts: return "¿Qué productos destacan?"
    case .stockAlerts: return "¿Qué necesita reposición?"
    }
  }
}

public struct AssistantAnswer: Codable, Identifiable, Sendable {
  public var id: String { question.rawValue }
  public let mode: String
  public let question: Question
  public let text: String
  public let sources: [String]
  public let generative: Bool
  public init(question: Question, text: String, sources: [String]) {
    mode = "demo"
    self.question = question
    self.text = text
    self.sources = sources
    generative = false
  }
}

public struct ProductPerformance: Identifiable, Sendable {
  public let id: String
  public let name: String
  public let units: Int
  public let revenueMinor: Int64
}
