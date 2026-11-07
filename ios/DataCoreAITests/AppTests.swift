import DataCoreDomain
import PDFKit
import XCTest

@testable import DataCoreAI

@MainActor
final class AppTests: XCTestCase {
  func testStoreStartsOfflineAndLoadsFixture() async {
    let store = AppStore()
    XCTAssertEqual(store.mode, .offlineDemo)
    await store.load()
    XCTAssertNil(store.error)
    XCTAssertEqual(store.summary?.revenueMinor, 134770)
  }
  func testCartSimulationChangesOnlySession() async throws {
    let store = AppStore()
    await store.load()
    let product = try XCTUnwrap(store.snapshot?.products.first)
    store.add(product)
    store.add(product)
    XCTAssertEqual(store.totalMinor, 9980)
    await store.confirmDemoSale()
    XCTAssertTrue(store.cart.isEmpty)
    XCTAssertEqual(store.snapshot?.sales.count, 8)
    XCTAssertNotNil(store.notice)
    await store.useOfflineDemo()
    XCTAssertEqual(store.snapshot?.sales.count, 7)
  }
  func testRejectedCartPreservesPreviousState() async throws {
    let store = AppStore()
    await store.load()
    let product = try XCTUnwrap(store.snapshot?.products.first)
    store.add(product)
    store.setQuantity(product.id, quantity: 25)
    XCTAssertNotNil(store.error)
    XCTAssertEqual(store.cart.first?.quantity, 1)
  }
  func testAPIRequiresSafeHTTPSConfiguration() {
    for text in [
      "http://localhost:8000", "https://user:password@example.invalid",
      "https://example.invalid/path", "https://example.invalid?token=fictional",
      "https://example.invalid#fragment",
    ] {
      XCTAssertThrowsError(try APIDemoRepository(base: URL(string: text)!))
    }
    XCTAssertNoThrow(try APIDemoRepository(base: URL(string: "https://example.invalid")!))
  }
  func testRemoteCheckoutIsDisabledWithoutNetwork() async throws {
    let repository = try APIDemoRepository(base: URL(string: "https://example.invalid")!)
    do {
      _ = try await repository.checkout([CartLine(productId: "p1", quantity: 1)], requestId: UUID())
      XCTFail("Must be read-only")
    } catch { XCTAssertEqual(error as? BusinessError, .readOnly) }
  }
  func testAssistantReturnsEvidenceAndPeriodClearsAnswers() async throws {
    let store = AppStore()
    await store.load()
    await store.ask(.revenue)
    XCTAssertEqual(store.answers.count, 1)
    store.setPeriod(start: DemoDate.parse("2026-12-01")!, end: DemoDate.parse("2026-12-02")!)
    XCTAssertTrue(store.answers.isEmpty)
    await store.ask(.average)
    XCTAssertTrue(store.answers.first?.text.contains("no está definido") == true)
  }
  func testNativePDFAndCSVExportContents() throws {
    let snapshot = try DemoFixture.load()
    let pdf = try ReportExporter.make(snapshot: snapshot, period: .demoWeek, pdf: true)
    let csv = try ReportExporter.make(snapshot: snapshot, period: .demoWeek, pdf: false)
    defer {
      try? FileManager.default.removeItem(at: pdf)
      try? FileManager.default.removeItem(at: csv)
    }
    let document = try XCTUnwrap(PDFDocument(url: pdf))
    XCTAssertGreaterThan(document.pageCount, 0)
    XCTAssertTrue(document.string?.contains("DEMO") == true)
    XCTAssertTrue(try String(contentsOf: csv, encoding: .utf8).contains("1347.70"))
  }
}
