import XCTest

@testable import DataCoreDomain

private enum TestFailure: Error { case interrupted }

private actor ControlledRepository: BusinessRepository {
  nonisolated let mode: RepositoryMode
  let demo = DemoRepository()
  var answerError: URLError.Code?
  func failAnswer(_ code: URLError.Code) { answerError = code }
  var shouldHold = false
  var snapshotCount = 0
  var continuations: [Int: CheckedContinuation<Snapshot, Error>] = [:]
  var observers: [(Int, CheckedContinuation<Void, Never>)] = []
  var rejectNextCheckout = false
  func rejectOnce() { rejectNextCheckout = true }
  var failAfterCommit = false
  var failNextSnapshot = false
  var checkoutKeys: [UUID] = []
  init(mode: RepositoryMode = .offlineDemo) { self.mode = mode }
  func hold(_ value: Bool) { shouldHold = value }
  func interruptRefreshAfterCommit() { failAfterCommit = true }
  func calls() -> Int { snapshotCount }
  func keys() -> [UUID] { checkoutKeys }
  func waitForCall(_ target: Int) async {
    if snapshotCount >= target { return }
    await withCheckedContinuation { observers.append((target, $0)) }
  }
  func resume(_ number: Int, data: Snapshot) {
    continuations.removeValue(forKey: number)!.resume(returning: data)
  }
  func snapshot() async throws -> Snapshot {
    let captured = try await demo.snapshot()
    snapshotCount += 1
    let number = snapshotCount
    let waiting = observers.filter { $0.0 <= number }
    observers.removeAll { $0.0 <= number }
    if failNextSnapshot {
      failNextSnapshot = false
      waiting.forEach { $0.1.resume() }
      throw TestFailure.interrupted
    }
    if shouldHold {
      return try await withCheckedThrowingContinuation { continuation in
        continuations[number] = continuation
        waiting.forEach { $0.1.resume() }
      }
    }
    waiting.forEach { $0.1.resume() }
    return captured
  }
  func checkout(_ cart: [CartLine], requestId: UUID) async throws -> Sale {
    checkoutKeys.append(requestId)
    if rejectNextCheckout {
      rejectNextCheckout = false
      throw BusinessError.unavailable
    }
    let sale = try await demo.checkout(cart, requestId: requestId)
    if failAfterCommit {
      failAfterCommit = false
      failNextSnapshot = true
    }
    return sale
  }
  func answer(_ question: Question, period: Period) async throws -> AssistantAnswer {
    if let code = answerError {
      answerError = nil
      throw URLError(
        code, userInfo: [NSLocalizedDescriptionKey: "fictional-sensitive-server-message"])
    }
    return try await demo.answer(question, period: period)
  }
}

@MainActor
final class SessionTests: XCTestCase {
  func testOfflineSessionLoadsQuotesSellsAndResets() async throws {
    let session = CommercialSession()
    await session.load()
    let product = try XCTUnwrap(session.snapshot?.products.first)
    session.add(product)
    session.add(product)
    XCTAssertEqual(session.totalMinor, 9980)
    await session.confirmDemoSale()
    XCTAssertEqual(session.snapshot?.sales.count, 8)
    XCTAssertEqual(session.snapshot?.products.first?.stock, 22)
    XCTAssertFalse(session.hasPendingSale)
    XCTAssertTrue(session.cart.isEmpty)
    await session.useOfflineDemo()
    XCTAssertEqual(session.snapshot?.sales.count, 7)
    XCTAssertEqual(session.snapshot?.products.first?.stock, 24)
  }
  func testInterruptedReceiptRefreshLocksCartAndRetriesSameKey() async throws {
    let repository = ControlledRepository()
    let session = CommercialSession()
    await session.replaceRepository(repository)
    let product = try XCTUnwrap(session.snapshot?.products.first)
    session.add(product)
    await repository.interruptRefreshAfterCommit()
    await session.confirmDemoSale()
    XCTAssertTrue(session.hasPendingSale)
    XCTAssertFalse(session.canEditCart)
    XCTAssertTrue(session.canCheckout)
    XCTAssertNil(session.notice)
    session.add(product)
    session.setQuantity(product.id, quantity: 0)
    XCTAssertEqual(session.cart.first?.quantity, 1)
    let count = await repository.calls()
    await session.load()
    let after = await repository.calls()
    XCTAssertEqual(count, after)
    await session.replaceRepository(DemoRepository())
    XCTAssertTrue(session.hasPendingSale)
    await session.confirmDemoSale()
    let keys = await repository.keys()
    XCTAssertEqual(keys.count, 2)
    XCTAssertEqual(keys[0], keys[1])
    XCTAssertFalse(session.hasPendingSale)
    XCTAssertEqual(session.snapshot?.sales.count, 8)
    XCTAssertEqual(session.snapshot?.products.first?.stock, 23)
  }
  func testOldRefreshCannotOverwriteLatestRefreshOrSale() async throws {
    let repository = ControlledRepository()
    let session = CommercialSession()
    await session.replaceRepository(repository)
    let old = try XCTUnwrap(session.snapshot)
    await repository.hold(true)
    let older = Task { await session.load() }
    await repository.waitForCall(2)
    let newer = Task { await session.load() }
    await repository.waitForCall(3)
    await repository.resume(3, data: old)
    await newer.value
    XCTAssertFalse(session.isLoading)
    await repository.hold(false)
    session.add(old.products[0])
    await session.confirmDemoSale()
    XCTAssertEqual(session.snapshot?.sales.count, 8)
    await repository.resume(2, data: old)
    await older.value
    XCTAssertEqual(session.snapshot?.sales.count, 8)
    XCTAssertEqual(session.snapshot?.products.first?.stock, 23)
  }
  func testCancelledRefreshDoesNotReplaceStateOrReportError() async throws {
    let repository = ControlledRepository()
    let session = CommercialSession()
    await session.replaceRepository(repository)
    let before = session.snapshotRevision
    await repository.hold(true)
    let task = Task { await session.load() }
    await repository.waitForCall(2)
    task.cancel()
    await repository.resume(2, data: try DemoFixture.load())
    await task.value
    XCTAssertFalse(session.isLoading)
    XCTAssertNil(session.error)
    XCTAssertEqual(session.snapshotRevision, before)
  }
  func testSwitchingSourceDiscardsAnOldLoad() async throws {
    let repository = ControlledRepository()
    let session = CommercialSession()
    await session.replaceRepository(repository)
    await repository.hold(true)
    let old = Task { await session.load() }
    await repository.waitForCall(2)
    await session.useOfflineDemo()
    let revision = session.snapshotRevision
    await repository.resume(2, data: try DemoFixture.load())
    await old.value
    XCTAssertEqual(session.snapshotRevision, revision)
    XCTAssertEqual(session.mode, .offlineDemo)
  }
  func testInvalidQuantityRetainsCartAndRemoteCannotCheckout() async throws {
    let session = CommercialSession()
    await session.load()
    let product = try XCTUnwrap(session.snapshot?.products.first)
    session.add(product)
    session.setQuantity(product.id, quantity: 25)
    XCTAssertEqual(session.cart.first?.quantity, 1)
    XCTAssertNotNil(session.error)
    let remote = ControlledRepository(mode: .remoteDemo)
    await session.replaceRepository(remote)
    session.add(product)
    await session.confirmDemoSale()
    let keys = await remote.keys()
    XCTAssertTrue(keys.isEmpty)
    XCTAssertFalse(session.canCheckout)
  }
  func testPeriodAndAssistantUseEvidenceAndClearPreviousAnswer() async throws {
    let session = CommercialSession()
    await session.load()
    await session.ask(.revenue)
    XCTAssertEqual(session.answers.count, 1)
    XCTAssertFalse(session.isAnswering)
    session.setPeriod(start: DemoDate.parse("2026-12-01")!, end: DemoDate.parse("2026-12-02")!)
    XCTAssertTrue(session.answers.isEmpty)
    await session.ask(.average)
    XCTAssertTrue(session.answers[0].text.contains("no está definido"))
    let revision = session.conversationRevision
    await session.ask(.average)
    XCTAssertEqual(session.answers.count, 1)
    XCTAssertEqual(session.conversationRevision, revision + 1)
  }
  func testExplicitRejectionDoesNotLeaveAnUncertainCart() async throws {
    let repository = ControlledRepository()
    let session = CommercialSession()
    await session.replaceRepository(repository)
    session.add(try XCTUnwrap(session.snapshot?.products.first))
    await repository.rejectOnce()
    await session.confirmDemoSale()
    XCTAssertFalse(session.hasPendingSale)
    XCTAssertTrue(session.canEditCart)
    XCTAssertEqual(session.snapshot?.sales.count, 7)
    XCTAssertNotNil(session.error)
    await session.confirmDemoSale()
    XCTAssertEqual(session.snapshot?.sales.count, 8)
    XCTAssertNil(session.error)
  }

  func testNetworkCancellationIsQuietAndAllowsRetry() async throws {
    let repository = ControlledRepository()
    let session = CommercialSession()
    await session.replaceRepository(repository)
    await repository.failAnswer(.cancelled)
    await session.ask(.revenue)
    XCTAssertNil(session.error)
    XCTAssertFalse(session.isAnswering)
    XCTAssertFalse(session.isWorking)
    await session.ask(.revenue)
    XCTAssertEqual(session.answers.count, 1)
  }
  func testNetworkTimeoutDoesNotLeakServerDetailsOrFabricateAnswer() async throws {
    let repository = ControlledRepository()
    let session = CommercialSession()
    await session.replaceRepository(repository)
    await repository.failAnswer(.timedOut)
    await session.ask(.revenue)
    XCTAssertNotNil(session.error)
    XCTAssertFalse(session.error!.contains("fictional-sensitive"))
    XCTAssertTrue(session.answers.isEmpty)
    XCTAssertFalse(session.isWorking)
    await session.ask(.revenue)
    XCTAssertEqual(session.answers.count, 1)
  }

}
