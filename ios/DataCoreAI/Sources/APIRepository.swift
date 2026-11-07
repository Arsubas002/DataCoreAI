import DataCoreDomain
import Foundation
import Security

/// Preparation for an OAuth/OIDC PKCE session, never a bundled API key.
/// Production login is deliberately not enabled by this demo.
protocol AccessTokenProviding: Sendable { func token() throws -> String? }

struct KeychainTokenStore: AccessTokenProviding {
  private let service = "DataCoreAI.user-session"
  func token() throws -> String? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service, kSecAttrAccount as String: "access-token",
      kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne,
    ]
    var result: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    if status == errSecItemNotFound { return nil }
    guard status == errSecSuccess, let data = result as? Data,
      let value = String(data: data, encoding: .utf8)
    else { throw BusinessError.invalidData }
    return value
  }
  func save(_ token: String) throws {
    guard !token.isEmpty, token.utf8.count <= 8192 else { throw BusinessError.invalidData }
    try clear()
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service, kSecAttrAccount as String: "access-token",
      kSecValueData as String: Data(token.utf8),
      kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
    ]
    guard SecItemAdd(query as CFDictionary, nil) == errSecSuccess else {
      throw BusinessError.invalidData
    }
  }
  func clear() throws {
    let status = SecItemDelete(
      [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: service, kSecAttrAccount as String: "access-token",
      ] as CFDictionary)
    guard status == errSecSuccess || status == errSecItemNotFound else {
      throw BusinessError.invalidData
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

enum APIError: Error, LocalizedError {
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
  init(base: URL) throws {
    guard base.scheme?.lowercased() == "https", base.host != nil, base.user == nil,
      base.password == nil,
      base.query == nil, base.fragment == nil, base.path.isEmpty || base.path == "/"
    else { throw APIError.configuration }
    self.base = base
    let config = URLSessionConfiguration.ephemeral
    config.urlCache = nil
    config.httpCookieStorage = nil
    config.httpShouldSetCookies = false
    config.timeoutIntervalForRequest = 15
    config.timeoutIntervalForResource = 25
    let delegate = NoRedirects()
    redirectDelegate = delegate
    session = URLSession(configuration: config, delegate: delegate, delegateQueue: nil)
  }
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
