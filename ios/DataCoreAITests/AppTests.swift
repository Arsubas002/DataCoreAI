import DataCoreDomain
import PDFKit
import Security
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
  func testKeychainReplacementAndRemovalWithFictionalValues() throws {
    let store = KeychainTokenStore(service: "DataCoreAI.tests.\(UUID().uuidString)")
    defer { try? store.clear() }
    XCTAssertNil(try store.token())
    try store.save("fictional-first-token")
    XCTAssertEqual(try store.token(), "fictional-first-token")
    try store.save("fictional-second-token")
    XCTAssertEqual(try store.token(), "fictional-second-token")
    try store.clear()
    try store.clear()  // Deletion must be idempotent.
    XCTAssertNil(try store.token())
  }
  func testPDFPaginationRetainsLastDateAndTotal() throws {
    let period = try Period(start: "2026-01-01", end: "2026-12-31")
    let url = try ReportExporter.make(snapshot: DemoFixture.load(), period: period, pdf: true)
    defer { try? FileManager.default.removeItem(at: url) }
    let document = try XCTUnwrap(PDFDocument(url: url))
    XCTAssertGreaterThan(document.pageCount, 1)
    XCTAssertTrue(document.string?.contains("2026-12-31") == true)
    XCTAssertTrue(document.string?.contains("TOTAL") == true)
  }

}

/// Scripted statuses exercise failure paths; the original test still uses the real Keychain.
private struct KeychainStub: KeychainAccessing {
  var readStatus: OSStatus = errSecSuccess
  var data: Data? = Data("fictional".utf8)
  var updateStatus: OSStatus = errSecSuccess
  var addStatus: OSStatus = errSecSuccess
  var deleteStatus: OSStatus = errSecSuccess
  func read(_ query: [String: Any]) -> (OSStatus, Data?) { (readStatus, data) }
  func update(_ query: [String: Any], attributes: [String: Any]) -> OSStatus { updateStatus }
  func add(_ item: [String: Any]) -> OSStatus { addStatus }
  func delete(_ query: [String: Any]) -> OSStatus { deleteStatus }
}

extension AppTests {
  func testKeychainMissingEntitlementIsNotTreatedAsEmpty() {
    let store = KeychainTokenStore(client: KeychainStub(readStatus: errSecMissingEntitlement))
    XCTAssertThrowsError(try store.token()) {
      XCTAssertEqual($0 as? KeychainError, .status(.read, errSecMissingEntitlement))
      XCTAssertEqual(String(describing: $0), "Keychain read failed (OSStatus -34018)")
    }
  }
  func testKeychainMalformedDataFailsClosed() {
    for data in [Data(), Data([0xff]), Data(repeating: 65, count: 8193)] {
      XCTAssertThrowsError(try KeychainTokenStore(client: KeychainStub(data: data)).token()) {
        XCTAssertEqual($0 as? KeychainError, .invalidStoredData)
      }
    }
  }
  func testKeychainWriteAndDeleteStatusesRemainDiagnostic() {
    let cases: [(KeychainStub, KeychainError, (KeychainTokenStore) throws -> Void)] = [
      (
        KeychainStub(updateStatus: errSecInteractionNotAllowed),
        .status(.update, errSecInteractionNotAllowed), { try $0.save("fictional") }
      ),
      (
        KeychainStub(updateStatus: errSecItemNotFound, addStatus: errSecMissingEntitlement),
        .status(.add, errSecMissingEntitlement), { try $0.save("fictional") }
      ),
      (
        KeychainStub(deleteStatus: errSecMissingEntitlement),
        .status(.delete, errSecMissingEntitlement), { try $0.clear() }
      ),
    ]
    for (client, expected, operation) in cases {
      XCTAssertThrowsError(try operation(KeychainTokenStore(client: client))) {
        XCTAssertEqual($0 as? KeychainError, expected)
      }
    }
    let missing = KeychainTokenStore(
      client: KeychainStub(readStatus: errSecItemNotFound, deleteStatus: errSecItemNotFound))
    XCTAssertNil(try missing.token())
    XCTAssertNoThrow(try missing.clear())
  }
}
