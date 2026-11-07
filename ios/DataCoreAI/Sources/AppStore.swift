import DataCoreDomain
import SwiftUI

@MainActor
final class AppStore: ObservableObject {
  @Published private(set) var snapshot: Snapshot?
  @Published private(set) var isLoading = false
  @Published private(set) var isWorking = false
  @Published var error: String?
  @Published var notice: String?
  @Published var period = Period.demoWeek
  @Published private(set) var cart: [CartLine] = []
  @Published private(set) var answers: [AssistantAnswer] = []
  @Published private(set) var mode = RepositoryMode.offlineDemo
  private var repository: any BusinessRepository
  private var generation = UUID()
  private var checkoutId = UUID()

  init(repository: any BusinessRepository = DemoRepository()) {
    self.repository = repository
    mode = repository.mode
  }
  var summary: CommercialSummary? { snapshot?.summary(for: period) }
  var quote: [SaleLine] { (try? snapshot?.quote(cart)) ?? [] }
  var totalMinor: Int64 { quote.reduce(0) { $0 + $1.subtotalMinor } }
  var canCheckout: Bool { mode == .offlineDemo && !cart.isEmpty && !quote.isEmpty && !isWorking }

  func load() async {
    let token = generation
    let source = repository
    isLoading = true
    do {
      let data = try await source.snapshot()
      guard token == generation else { return }
      snapshot = data
      error = nil
    } catch is CancellationError {} catch {
      if token == generation { self.error = "No se pudieron cargar los datos. Puedes reintentar." }
    }
    if token == generation { isLoading = false }
  }
  func setPeriod(start: Date, end: Date) {
    guard !isWorking else { return }
    do {
      error = nil
      period = try Period(start: DemoDate.string(start), end: DemoDate.string(end))
      answers = []
    } catch { self.error = error.localizedDescription }
  }
  func add(_ product: Product) {
    guard !isWorking else { return }
    var next = cart
    if let index = next.firstIndex(where: { $0.productId == product.id }) {
      next[index].quantity += 1
    } else {
      next.append(CartLine(productId: product.id, quantity: 1))
    }
    replaceCart(next)
  }
  func setQuantity(_ id: String, quantity: Int) {
    guard !isWorking else { return }
    var next = cart
    if quantity == 0 {
      next.removeAll { $0.productId == id }
    } else if let index = next.firstIndex(where: { $0.productId == id }) {
      next[index].quantity = quantity
    }
    replaceCart(next)
  }
  private func replaceCart(_ next: [CartLine]) {
    guard let snapshot else { return }
    error = nil
    do {
      if !next.isEmpty { _ = try snapshot.quote(next) }
      cart = next
      checkoutId = UUID()
      notice = nil
    } catch { self.error = error.localizedDescription }
  }
  func confirmDemoSale() async {
    guard canCheckout else { return }
    let source = repository
    let token = generation
    let items = cart
    let id = checkoutId
    isWorking = true
    error = nil
    do {
      let sale = try await source.checkout(items, requestId: id)
      let refreshed = try await source.snapshot()
      guard token == generation else { return }
      snapshot = refreshed
      cart = []
      checkoutId = UUID()
      answers = []
      notice =
        "Venta simulada: \(Money.formatted(sale.totalMinor)). Solo cambió la memoria de esta demo."
    } catch { if token == generation { self.error = error.localizedDescription } }
    if token == generation { isWorking = false }
  }
  func ask(_ question: Question) async {
    guard !isWorking else { return }
    let token = generation
    let source = repository
    let requestedPeriod = period
    isWorking = true
    error = nil
    defer { if token == generation { isWorking = false } }
    do {
      let result = try await source.answer(question, period: requestedPeriod)
      guard token == generation, period == requestedPeriod else { return }
      answers.removeAll { $0.question == question }
      answers.append(result)
    } catch {
      if token == generation {
        self.error = "No se pudo obtener la respuesta. Reintenta sin compartir información privada."
      }
    }
    if token == generation { isWorking = false }
  }
  func useOfflineDemo() async { await changeRepository(DemoRepository()) }
  func connectDemoAPI(_ text: String) async {
    do {
      guard let url = URL(string: text) else { throw APIError.configuration }
      let source = try APIDemoRepository(base: url)
      await changeRepository(source)
    } catch { self.error = error.localizedDescription }
  }
  private func changeRepository(_ source: any BusinessRepository) async {
    guard !isWorking else { return }
    generation = UUID()
    repository = source
    mode = source.mode
    snapshot = nil
    cart = []
    answers = []
    error = nil
    notice = nil
    checkoutId = UUID()
    await load()
  }
}
