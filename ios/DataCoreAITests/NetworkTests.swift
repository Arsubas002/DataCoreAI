import DataCoreDomain
import Foundation
import XCTest

@testable import DataCoreAI

private struct StubReply: Sendable {
  var status = 200
  var data = Data()
  var headers = ["Content-Type": "application/json"]
  var failure: URLError.Code?
}

private final class StubPlans: @unchecked Sendable {
  static let shared = StubPlans()
  private let lock = NSLock()
  private var values: [String: StubReply] = [:]
  private var paths: [String: String] = [:]
  func put(_ value: StubReply, host: String) {
    lock.lock()
    defer { lock.unlock() }
    values[host] = value
  }
  func take(for request: URLRequest) -> StubReply {
    lock.lock()
    defer { lock.unlock() }
    let host = request.url!.host!
    paths[host] = request.url!.path
    return values[host] ?? StubReply(failure: .unsupportedURL)
  }
  func path(_ host: String) -> String? {
    lock.lock()
    defer { lock.unlock() }
    return paths[host]
  }
  func remove(_ host: String) {
    lock.lock()
    defer { lock.unlock() }
    values.removeValue(forKey: host)
    paths.removeValue(forKey: host)
  }
}

/// Installed only on the session under test; never opens a socket, even for unknown hosts.
private final class FixtureURLProtocol: URLProtocol, @unchecked Sendable {
  override class func canInit(with request: URLRequest) -> Bool { true }
  override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
  override func startLoading() {
    let reply = StubPlans.shared.take(for: request)
    if let failure = reply.failure {
      client?.urlProtocol(self, didFailWithError: URLError(failure))
      return
    }
    let response = HTTPURLResponse(
      url: request.url!, statusCode: reply.status, httpVersion: "HTTP/1.1",
      headerFields: reply.headers)!
    client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
    client?.urlProtocol(self, didLoad: reply.data)
    client?.urlProtocolDidFinishLoading(self)
  }
  override func stopLoading() {}
}

@MainActor
final class NetworkTests: XCTestCase {
  private func repository(_ reply: StubReply) throws -> (APIDemoRepository, String) {
    let host = "unit-\(UUID().uuidString.lowercased()).invalid"
    StubPlans.shared.put(reply, host: host)
    addTeardownBlock { StubPlans.shared.remove(host) }
    return (
      try APIDemoRepository(
        base: URL(string: "https://\(host)")!, protocolClasses: [FixtureURLProtocol.self]), host
    )
  }
  private func assertFailure(_ reply: StubReply, expected: APIError) async throws {
    let (source, _) = try repository(reply)
    do {
      _ = try await source.snapshot()
      XCTFail("Expected safe failure")
    } catch let error as APIError {
      XCTAssertEqual(error, expected)
      XCTAssertFalse(error.localizedDescription.contains("fictional-sensitive"))
    } catch { XCTFail("Unexpected error type") }
  }
  func testSuccessUsesFixedSnapshotEndpointAndTypedFixture() async throws {
    let encoder = JSONEncoder()
    encoder.keyEncodingStrategy = .convertToSnakeCase
    let data = try encoder.encode(DemoFixture.load())
    let (source, host) = try repository(StubReply(data: data))
    let snapshot = try await source.snapshot()
    XCTAssertEqual(snapshot.summary(for: .demoWeek).revenueMinor, 134770)
    XCTAssertEqual(StubPlans.shared.path(host), "/v1/snapshot")
  }
  func testHTTPAndMalformedJSONNeverBecomeEmptySuccess() async throws {
    try await assertFailure(
      StubReply(status: 503, data: Data("fictional-sensitive".utf8)), expected: .response)
    try await assertFailure(StubReply(data: Data("not JSON".utf8)), expected: .response)
  }
  func testDeclaredAndActualBodySizeAreLimited() async throws {
    try await assertFailure(
      StubReply(
        data: Data("x".utf8),
        headers: ["Content-Type": "application/json", "Content-Length": "2097153"]),
      expected: .tooLarge)
    try await assertFailure(
      StubReply(data: Data(repeating: 120, count: 2_097_153)), expected: .tooLarge)
  }
  func testTimeoutIsSafeAndCancellationRemainsCancellation() async throws {
    try await assertFailure(StubReply(failure: .timedOut), expected: .transport)
    let (source, _) = try repository(StubReply(failure: .cancelled))
    do {
      _ = try await source.snapshot()
      XCTFail("Expected cancellation")
    } catch is CancellationError {} catch {
      XCTFail("Cancellation must not become a network alert")
    }
  }
}
