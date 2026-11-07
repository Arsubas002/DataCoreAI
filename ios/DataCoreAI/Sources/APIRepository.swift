import DataCoreDomain
import Foundation
import Security

/// Preparation for an OAuth/OIDC PKCE session, never a bundled API key.
/// Production login is deliberately not enabled by this demo.
protocol AccessTokenProviding: Sendable { func token() throws -> String? }

/// Only operation/status are diagnostic. Never include queries, services or token bytes.
enum KeychainError: Error, Equatable, CustomStringConvertible {
  enum Operation: String { case read, update, add, delete }
  case status(Operation, OSStatus)
  case invalidStoredData

  var description: String {
    switch self {
    case .status(let operation, let code):
      return "Keychain \(operation.rawValue) failed (OSStatus \(code))"
    case .invalidStoredData: return "Keychain returned invalid stored data"
    }
  }
}

protocol KeychainAccessing: Sendable {
  func read(_ query: [String: Any]) -> (OSStatus, Data?)
  func update(_ query: [String: Any], attributes: [String: Any]) -> OSStatus
  func add(_ item: [String: Any]) -> OSStatus
  func delete(_ query: [String: Any]) -> OSStatus
}

struct SecurityKeychainClient: KeychainAccessing {
  func read(_ query: [String: Any]) -> (OSStatus, Data?) {
    var result: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    return (status, result as? Data)
  }
  func update(_ query: [String: Any], attributes: [String: Any]) -> OSStatus {
    SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
  }
  func add(_ item: [String: Any]) -> OSStatus { SecItemAdd(item as CFDictionary, nil) }
  func delete(_ query: [String: Any]) -> OSStatus { SecItemDelete(query as CFDictionary) }
}

struct KeychainTokenStore: AccessTokenProviding {
  private let service: String
  private let client: any KeychainAccessing
  init(
    service: String = (Bundle.main.bundleIdentifier ?? "DataCoreAI.demo") + ".user-session",
    client: any KeychainAccessing = SecurityKeychainClient()
  ) {
    self.service = service
    self.client = client
  }
  private var selector: [String: Any] {
    [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service, kSecAttrAccount as String: "access-token",
    ]
  }
  func token() throws -> String? {
    let query = selector.merging([
      kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne,
    ]) { _, new in new }
    let (status, data) = client.read(query)
    if status == errSecItemNotFound { return nil }
    guard status == errSecSuccess else { throw KeychainError.status(.read, status) }
    guard let data, let value = String(data: data, encoding: .utf8),
      !value.isEmpty, data.count <= 8192
    else { throw KeychainError.invalidStoredData }
    return value
  }
  func save(_ token: String) throws {
    guard !token.isEmpty, token.utf8.count <= 8192 else { throw BusinessError.invalidData }
    let attributes: [String: Any] = [
      kSecValueData as String: Data(token.utf8),
      kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
    ]
    let status = client.update(selector, attributes: attributes)
    if status == errSecItemNotFound {
      let status = client.add(selector.merging(attributes) { _, new in new })
      guard status == errSecSuccess else { throw KeychainError.status(.add, status) }
    } else if status != errSecSuccess {
      throw KeychainError.status(.update, status)
    }
  }
  func clear() throws {
    let status = client.delete(selector)
    guard status == errSecSuccess || status == errSecItemNotFound else {
      throw KeychainError.status(.delete, status)
    }
  }
}

private final class NoRedirects: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
  func urlSession(
    _ session: URLSession, task: URLSessionTask,
    willPerformHTTPRedirection response: HTTPURLResponse,
    newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void
  ) {
    completionHandler(nil)
  }
}

enum APIError: Error, LocalizedError, Equatable {
  case configuration, transport, response, tooLarge
  var errorDescription: String? {
    switch self {
    case .configuration: return "Usa una URL HTTPS sin usuario, contraseña, query ni fragmento."
    case .transport: return "No se pudo conectar. Comprueba el servidor HTTPS de demostración."
    case .response: return "El servidor no devolvió un contrato demo válido o rechazó la solicitud."
    case .tooLarge: return "La respuesta excede el límite permitido."
    }
  }
}

actor APIDemoRepository: BusinessRepository {
  nonisolated let mode = RepositoryMode.remoteDemo
  private let base: URL
  private let session: URLSession
  private let redirectDelegate: NoRedirects
  init(base: URL, protocolClasses: [AnyClass] = []) throws {
    guard base.scheme?.lowercased() == "https", base.host != nil, base.user == nil,
      base.password == nil,
      base.query == nil, base.fragment == nil, base.path.isEmpty || base.path == "/"
    else { throw APIError.configuration }
    self.base = base
    let config = URLSessionConfiguration.ephemeral
    // Internal injection for URLProtocol tests; production keeps the system stack.
    if !protocolClasses.isEmpty { config.protocolClasses = protocolClasses }
    config.urlCache = nil
    config.urlCredentialStorage = nil
    config.httpCookieStorage = nil
    config.httpShouldSetCookies = false
    config.timeoutIntervalForRequest = 15
    config.timeoutIntervalForResource = 25
    let delegate = NoRedirects()
    redirectDelegate = delegate
    session = URLSession(configuration: config, delegate: delegate, delegateQueue: nil)
  }
  deinit { session.invalidateAndCancel() }
  private enum Endpoint: String {
    case snapshot = "v1/snapshot"
    case assistant = "v1/assistant"
  }
  private func request(_ endpoint: Endpoint, body: Data? = nil) async throws -> Data {
    var request = URLRequest(url: base.appendingPathComponent(endpoint.rawValue))
    request.httpMethod = body == nil ? "GET" : "POST"
    request.httpBody = body
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    if body != nil { request.setValue("application/json", forHTTPHeaderField: "Content-Type") }
    // Demo sends no tokens, device identifiers, credentials or client-supplied tenant IDs.
    do {
      let (bytes, response) = try await session.bytes(for: request)
      defer { bytes.task.cancel() }
      guard let http = response as? HTTPURLResponse, http.statusCode == 200,
        http.mimeType == "application/json"
      else { throw APIError.response }
      if response.expectedContentLength > 2_097_152 { throw APIError.tooLarge }
      var data = Data()
      for try await byte in bytes {
        guard data.count < 2_097_152 else { throw APIError.tooLarge }
        data.append(byte)
      }
      return data
    } catch let cancelled as URLError where cancelled.code == .cancelled {
      throw CancellationError()
    } catch is CancellationError { throw CancellationError() } catch let error as APIError {
      throw error
    } catch { throw APIError.transport }
  }
  func snapshot() async throws -> Snapshot {
    do {
      let data = try await request(.snapshot)
      return try DemoFixture.decode(data)
    } catch let error as APIError { throw error } catch is CancellationError {
      throw CancellationError()
    } catch { throw APIError.response }
  }
  func checkout(_ cart: [CartLine], requestId: UUID) async throws -> Sale {
    throw BusinessError.readOnly
  }
  func answer(_ question: Question, period: Period) async throws -> AssistantAnswer {
    struct Payload: Encodable {
      let question: Question
      let start: String
      let end: String
    }
    let payload = try JSONEncoder().encode(
      Payload(question: question, start: period.start, end: period.end))
    let data = try await request(.assistant, body: payload)
    let result: AssistantAnswer
    do { result = try JSONDecoder().decode(AssistantAnswer.self, from: data) } catch {
      throw APIError.response
    }
    guard result.mode == "demo", !result.generative, result.question == question,
      result.text.count <= 8000, result.sources.count <= 10,
      result.sources.allSatisfy({ $0.count <= 1000 })
    else { throw APIError.response }
    return result
  }
}
