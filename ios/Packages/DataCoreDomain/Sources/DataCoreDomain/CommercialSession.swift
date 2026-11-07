import Foundation
import Observation

/// The actual app coordinator, observable on iOS 17 and testable without SwiftUI or networking.
@MainActor @Observable
public final class CommercialSession {
  public private(set) var snapshot: Snapshot?
  public private(set) var isLoading = false
  public private(set) var isWorking = false
  public private(set) var isAnswering = false
  public var error: String?
  public private(set) var notice: String?
  public private(set) var period = Period.demoWeek
  public private(set) var cart: [CartLine] = []
  public private(set) var answers: [AssistantAnswer] = []
  public private(set) var mode: RepositoryMode
  public private(set) var snapshotRevision = 0
  public private(set) var conversationRevision = 0
  public private(set) var hasPendingSale = false
  @ObservationIgnored private var repository: any BusinessRepository
  @ObservationIgnored private var generation = UUID()
  @ObservationIgnored private var activeLoad = UUID()
  @ObservationIgnored private var checkoutId = UUID()

  public init(repository: any BusinessRepository = DemoRepository()) {
    self.repository = repository
    mode = repository.mode
  }
  public var summary: CommercialSummary? { snapshot?.summary(for: period) }
  public var quote: [SaleLine] { (try? snapshot?.quote(cart)) ?? [] }
  public var totalMinor: Int64 { quote.reduce(0) { $0 + $1.subtotalMinor } }
  public var canEditCart: Bool { !isWorking && !isLoading && !hasPendingSale }
  public var canCheckout: Bool {
    mode == .offlineDemo && !isWorking && !isLoading
      && (hasPendingSale || (!cart.isEmpty && !quote.isEmpty))
  }
  public func load() async {
    guard !isWorking && !hasPendingSale else { return }
    let token = generation
    let source = repository
    let request = UUID()
    activeLoad = request
    isLoading = true
    defer { if token == generation && request == activeLoad { isLoading = false } }
    do {
      let data = try await source.snapshot().validated()
      try Task.checkCancellation()
      guard token == generation && request == activeLoad else { return }
      snapshot = data
      snapshotRevision += 1
      self.error = nil
    } catch let cancelled as URLError where cancelled.code == .cancelled {
    } catch is CancellationError {} catch {
      if token == generation && request == activeLoad {
        self.error = "No se pudieron cargar los datos. Puedes reintentar."
      }
    }
  }
  public func setPeriod(start: Date, end: Date) {
    guard !isWorking else { return }
    do {
      let next = try Period(start: DemoDate.string(start), end: DemoDate.string(end))
      period = next
      answers = []
      self.error = nil
    } catch { self.error = error.localizedDescription }
  }
  public func add(_ product: Product) {
    guard canEditCart else { return }
    var next = cart
    if let index = next.firstIndex(where: { $0.productId == product.id }) {
      next[index].quantity += 1
    } else {
      next.append(CartLine(productId: product.id, quantity: 1))
    }
    replaceCart(next)
  }
  public func setQuantity(_ id: String, quantity: Int) {
    guard canEditCart else { return }
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
    do {
      if !next.isEmpty { _ = try snapshot.quote(next) }
      cart = next
      checkoutId = UUID()
      notice = nil
      self.error = nil
    } catch { self.error = error.localizedDescription }
  }
  public func confirmDemoSale() async {
    guard canCheckout else { return }
    let source = repository
    let token = generation
    let items = cart
    let id = checkoutId
    isWorking = true
    hasPendingSale = true
    self.error = nil
    var receivedSale = false
    defer { if token == generation { isWorking = false } }
    do {
      let sale = try await source.checkout(items, requestId: id)
      receivedSale = true
      // A failure here must retain the same UUID/cart; editing must stay locked.
      let refreshed = try await source.snapshot().validated()
      guard token == generation else { return }
      snapshot = refreshed
      snapshotRevision += 1
      cart = []
      checkoutId = UUID()
      hasPendingSale = false
      answers = []
      notice =
        "Venta simulada: \(Money.formatted(sale.totalMinor)). Solo cambió la memoria de esta demo."
    } catch let failure as BusinessError {
      // Only an explicit rejection before the receipt permits editing again.
      if !receivedSale { hasPendingSale = false }
      self.error = failure.localizedDescription
    } catch {
      self.error =
        "Resultado pendiente. Reintenta con el mismo carrito y clave; no crees otra venta."
    }
  }
  public func ask(_ question: Question) async {
    guard !isWorking && !isLoading && !hasPendingSale else { return }
    let token = generation
    let source = repository
    let requestedPeriod = period
    isWorking = true
    isAnswering = true
    self.error = nil
    defer {
      if token == generation {
        isWorking = false
        isAnswering = false
      }
    }
    do {
      let result = try await source.answer(question, period: requestedPeriod)
      try Task.checkCancellation()
      guard token == generation && period == requestedPeriod else { return }
      answers.removeAll { $0.question == question }
      answers.append(result)
      conversationRevision += 1
    } catch let cancelled as URLError where cancelled.code == .cancelled {
    } catch is CancellationError {} catch {
      if token == generation {
        self.error = "No se pudo obtener la respuesta. Reintenta sin compartir información privada."
      }
    }
  }
  public func useOfflineDemo() async {
    // Called only after the UI's explicit reset confirmation. This discards demo memory.
    await replaceRepository(DemoRepository(), discardPendingDemo: true)
  }
  public func replaceRepository(_ source: any BusinessRepository, discardPendingDemo: Bool = false)
    async
  {
    guard !isWorking else { return }
    guard !hasPendingSale || discardPendingDemo else {
      self.error =
        "Resuelve la simulación pendiente o restaura explícitamente la demo antes de cambiar de origen."
      return
    }
    generation = UUID()
    activeLoad = UUID()
    repository = source
    mode = source.mode
    snapshot = nil
    cart = []
    answers = []
    self.error = nil
    notice = nil
    hasPendingSale = false
    checkoutId = UUID()
    snapshotRevision += 1
    await load()
  }
}
