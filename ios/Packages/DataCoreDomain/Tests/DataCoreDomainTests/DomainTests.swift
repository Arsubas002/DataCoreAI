import XCTest

@testable import DataCoreDomain

final class DomainTests: XCTestCase {
  func testFixtureRevenueCountsStockAndAlerts() throws {
    let snapshot = try DemoFixture.load()
    let summary = snapshot.summary(for: .demoWeek)
    XCTAssertEqual(summary.revenueMinor, 134770)
    XCTAssertEqual(summary.daily.reduce(0) { $0 + $1.revenueMinor }, summary.revenueMinor)
    XCTAssertEqual(summary.salesCount, 7)
    XCTAssertEqual(summary.stockUnits, 83)
    XCTAssertEqual(summary.alertCount, 3)
    XCTAssertTrue(snapshot.products.first { $0.id == "p5" }!.isLow)
  }
  func testDatesRejectNormalizationAndBoundPeriods() throws {
    XCTAssertNil(DemoDate.parse("2026-02-30"))
    XCTAssertNil(DemoDate.parse("2026-1-01"))
    XCTAssertThrowsError(try Period(start: "2026-11-08", end: "2026-11-01"))
    XCTAssertThrowsError(try Period(start: "2020-01-01", end: "2026-11-01"))
    XCTAssertEqual(try Period(start: "2026-11-01", end: "2026-11-01").days.count, 1)
  }
  func testNoSalesHasZeroDailyEvidence() throws {
    let snapshot = try DemoFixture.load()
    let summary = snapshot.summary(for: try Period(start: "2026-12-01", end: "2026-12-02"))
    XCTAssertEqual(summary.salesCount, 0)
    XCTAssertEqual(summary.revenueMinor, 0)
    XCTAssertEqual(summary.daily.count, 2)
  }
  func testQuoteUsesMinorUnitsExactly() throws {
    let snapshot = try DemoFixture.load()
    let lines = try snapshot.quote([
      CartLine(productId: "p1", quantity: 2), CartLine(productId: "p6", quantity: 3),
    ])
    XCTAssertEqual(lines.reduce(0) { $0 + $1.subtotalMinor }, 15950)
  }
  func testQuoteRejectsDuplicatesEmptyInvalidAndOversold() throws {
    let snapshot = try DemoFixture.load()
    let carts: [[CartLine]] = [
      [], [.init(productId: "p1", quantity: 25)], [.init(productId: "p3", quantity: 1)],
      [.init(productId: "none", quantity: 1)], [.init(productId: "p1", quantity: 0)],
      [.init(productId: "p1", quantity: 1000)],
      [.init(productId: "p1", quantity: 1), .init(productId: "p1", quantity: 1)],
    ]
    for cart in carts { XCTAssertThrowsError(try snapshot.quote(cart)) }
  }
  func testMoneyRejectsBounds() {
    XCTAssertThrowsError(try Money.validate(-1))
    XCTAssertThrowsError(try Money.validate(1_000_000_000_000))
    XCTAssertNoThrow(try Money.validate(1990))
  }
  func testMalformedSnapshotIsRejected() throws {
    let valid = try DemoFixture.load()
    let encoder = JSONEncoder()
    encoder.keyEncodingStrategy = .convertToSnakeCase
    var json = try JSONSerialization.jsonObject(with: encoder.encode(valid)) as! [String: Any]
    json["mode"] = "production"
    XCTAssertThrowsError(try DemoFixture.decode(JSONSerialization.data(withJSONObject: json)))
    json["mode"] = "demo"
    var products = json["products"] as! [[String: Any]]
    products[0]["price_minor"] = true
    json["products"] = products
    XCTAssertThrowsError(try DemoFixture.decode(JSONSerialization.data(withJSONObject: json)))
    products[0]["price_minor"] = -1
    json["products"] = products
    XCTAssertThrowsError(try DemoFixture.decode(JSONSerialization.data(withJSONObject: json)))
  }
  func testCSVContainsMetadataExactTotalAndCRLF() throws {
    let csv = try CSVReport.make(snapshot: DemoFixture.load(), period: .demoWeek)
    XCTAssertTrue(csv.hasPrefix("\u{feff}"))
    XCTAssertTrue(csv.contains("DEMO · DATOS FICTICIOS"))
    XCTAssertTrue(csv.contains("\"TOTAL\",\"7\",\"1347.70\"\r\n"))
    XCTAssertTrue(csv.contains("\"2026-11-01\",\"1\",\"159.50\""))
  }
  func testRepositorySaleUpdatesStockAndSummary() async throws {
    let repository = DemoRepository()
    let sale = try await repository.checkout(
      [CartLine(productId: "p1", quantity: 2)], requestId: UUID())
    XCTAssertEqual(sale.totalMinor, 9980)
    let snapshot = try await repository.snapshot()
    XCTAssertEqual(snapshot.products.first { $0.id == "p1" }?.stock, 22)
    XCTAssertEqual(snapshot.sales.count, 8)
    XCTAssertEqual(snapshot.summary(for: .demoWeek).revenueMinor, 144750)
  }
  func testRepositoryIdempotencyAndDifferentContentConflict() async throws {
    let repository = DemoRepository()
    let id = UUID()
    let cart = [CartLine(productId: "p2", quantity: 1)]
    let first = try await repository.checkout(cart, requestId: id)
    let second = try await repository.checkout(cart, requestId: id)
    XCTAssertEqual(first, second)
    do {
      _ = try await repository.checkout([CartLine(productId: "p1", quantity: 1)], requestId: id)
      XCTFail("Must reject reused key")
    } catch { XCTAssertEqual(error as? BusinessError, .duplicateRequest) }
    let snapshot = try await repository.snapshot()
    XCTAssertEqual(snapshot.sales.count, 8)
    XCTAssertEqual(snapshot.products.first { $0.id == "p2" }?.stock, 3)
  }
  func testRepositoryFailedCartIsAtomic() async throws {
    let repository = DemoRepository()
    do {
      _ = try await repository.checkout(
        [CartLine(productId: "p1", quantity: 2), CartLine(productId: "p3", quantity: 1)],
        requestId: UUID())
      XCTFail("Must reject exhausted product")
    } catch { XCTAssertEqual(error as? BusinessError, .unavailable) }
    let snapshot = try await repository.snapshot()
    XCTAssertEqual(snapshot.products.first { $0.id == "p1" }?.stock, 24)
    XCTAssertEqual(snapshot.sales.count, 7)
  }
  func testConcurrentRequestsCannotOversell() async throws {
    let repository = DemoRepository()
    async let a = attempt(repository)
    async let b = attempt(repository)
    let results = await [a, b]
    XCTAssertEqual(results.filter { $0 }.count, 1)
    let snapshot = try await repository.snapshot()
    XCTAssertEqual(snapshot.products.first { $0.id == "p2" }?.stock, 1)
  }
  private func attempt(_ repository: DemoRepository) async -> Bool {
    do {
      _ = try await repository.checkout([CartLine(productId: "p2", quantity: 3)], requestId: UUID())
      return true
    } catch { return false }
  }
  func testRepositoryInstancesAreIsolated() async throws {
    let first = DemoRepository()
    let second = DemoRepository()
    _ = try await first.checkout([CartLine(productId: "p1", quantity: 1)], requestId: UUID())
    let original = try await second.snapshot()
    XCTAssertEqual(original.sales.count, 7)
    XCTAssertEqual(original.products.first { $0.id == "p1" }?.stock, 24)
  }
  func testAssistantIsGuidedAndHasSources() async throws {
    let repository = DemoRepository()
    for question in Question.allCases {
      let answer = try await repository.answer(question, period: .demoWeek)
      XCTAssertFalse(answer.generative)
      XCTAssertEqual(answer.sources.count, 3)
      XCTAssertFalse(answer.text.isEmpty)
    }
  }
  func testAssistantNoAverageWithoutSales() async throws {
    let answer = try await DemoRepository().answer(
      .average, period: Period(start: "2026-12-01", end: "2026-12-02"))
    XCTAssertTrue(answer.text.contains("no está definido"))
  }
}
