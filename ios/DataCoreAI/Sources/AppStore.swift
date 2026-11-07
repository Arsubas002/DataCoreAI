import DataCoreDomain
import Foundation

// Observation is native to iOS 17; business state lives in the package tested on Linux.
typealias AppStore = CommercialSession

extension CommercialSession {
  func connectDemoAPI(_ text: String) async {
    do {
      guard let url = URL(string: text) else { throw APIError.configuration }
      let source = try APIDemoRepository(base: url)
      await replaceRepository(source)
    } catch { self.error = error.localizedDescription }
  }
}
