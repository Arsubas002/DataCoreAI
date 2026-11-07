// Linux-only Security stand-ins. No system Keychain or network is accessed.
import Foundation

typealias OSStatus = Int32
let errSecSuccess: OSStatus = 0
let errSecItemNotFound: OSStatus = -25300
let errSecMissingEntitlement: OSStatus = -34018
let errSecInteractionNotAllowed: OSStatus = -25308
let kSecClass = "class", kSecClassGenericPassword = "generic"
let kSecAttrService = "service", kSecAttrAccount = "account"
let kSecReturnData = "return", kSecMatchLimit = "limit", kSecMatchLimitOne = "one"
let kSecValueData = "data", kSecAttrAccessible = "accessible"
let kSecAttrAccessibleWhenUnlockedThisDeviceOnly = "unlocked-device-only"
enum BusinessError: Error { case invalidData }
protocol AccessTokenProviding: Sendable { func token() throws -> String? }

// PRODUCTION_KEYCHAIN_LOGIC

// State is used sequentially in this executable, never across tasks.
final class SecurityKeychainClient: KeychainAccessing, @unchecked Sendable {
  var value: Data?
  var readFailure: OSStatus?
  var updateFailure: OSStatus?
  var addFailure: OSStatus?
  var deleteFailure: OSStatus?
  var addCalls = 0
  func read(_ query: [String: Any]) -> (OSStatus, Data?) {
    if let readFailure { return (readFailure, nil) }
    return (value == nil ? errSecItemNotFound : errSecSuccess, value)
  }
  func update(_ query: [String: Any], attributes: [String: Any]) -> OSStatus {
    precondition(attributes[kSecAttrAccessible] as? String == kSecAttrAccessibleWhenUnlockedThisDeviceOnly)
    if let updateFailure { return updateFailure }
    guard value != nil else { return errSecItemNotFound }
    value = attributes[kSecValueData] as? Data
    return errSecSuccess
  }
  func add(_ item: [String: Any]) -> OSStatus {
    addCalls += 1
    precondition(item[kSecAttrAccessible] as? String == kSecAttrAccessibleWhenUnlockedThisDeviceOnly)
    if let addFailure { return addFailure }
    value = item[kSecValueData] as? Data
    return errSecSuccess
  }
  func delete(_ query: [String: Any]) -> OSStatus {
    if let deleteFailure { return deleteFailure }
    let status = value == nil ? errSecItemNotFound : errSecSuccess
    value = nil
    return status
  }
}

func check(_ condition: @autoclosure () throws -> Bool) throws {
  let valid = try condition()
  precondition(valid, "Keychain logic regression")
}
func expect(_ error: KeychainError, _ action: () throws -> Void) {
  do { try action(); preconditionFailure("Expected Keychain error") }
  catch let actual as KeychainError { precondition(actual == error) }
  catch { preconditionFailure("Wrong error type") }
}
let client = SecurityKeychainClient()
let store = KeychainTokenStore(service: "fictional-tests", client: client)
try check(store.token() == nil)
try store.save("fictional-first")
try check(store.token() == "fictional-first")
try store.save("fictional-second")
try check(store.token() == "fictional-second")
try check(client.addCalls == 1)
try store.clear()
try store.clear()
try check(store.token() == nil)
client.readFailure = errSecMissingEntitlement
expect(.status(.read, errSecMissingEntitlement)) { _ = try store.token() }
try check(String(describing: KeychainError.status(.read, errSecMissingEntitlement)) == "Keychain read failed (OSStatus -34018)")
client.readFailure = nil
client.updateFailure = errSecInteractionNotAllowed
expect(.status(.update, errSecInteractionNotAllowed)) { try store.save("fictional") }
try check(client.addCalls == 1) // No fallback after permission/locked-device failure.
client.updateFailure = nil
client.addFailure = errSecMissingEntitlement
expect(.status(.add, errSecMissingEntitlement)) { try store.save("fictional") }
client.deleteFailure = errSecMissingEntitlement
expect(.status(.delete, errSecMissingEntitlement)) { try store.clear() }
for data in [Data(), Data([0xff]), Data(repeating: 65, count: 8193)] {
  client.value = data
  expect(.invalidStoredData) { _ = try store.token() }
}
print("Keychain wrapper regression passed with scripted Security stand-ins; not native Keychain validation.")
