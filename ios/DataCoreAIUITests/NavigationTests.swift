import XCTest

/// Prepared for authorized iOS Simulator execution, never treated as Linux UI coverage.
final class NavigationTests: XCTestCase {
  @MainActor func testSixScreensAndCaptureEvidence() throws {
    try captureSixScreens(darkLarge: false)
  }
  @MainActor func testDarkLargeTypeSixScreens() throws { try captureSixScreens(darkLarge: true) }
  @MainActor private func captureSixScreens(darkLarge: Bool) throws {
    let app = XCUIApplication()
    if darkLarge { app.launchArguments = ["--ui-dark-large"] }
    app.launch()
    XCTAssertTrue(app.staticTexts["dashboard-income"].waitForExistence(timeout: 15))
    let suffix = darkLarge ? "Dark-AX3" : "System"
    capture("01-Dashboard-\(suffix)", app)
    app.tabBars.buttons["Productos"].tap()
    XCTAssertTrue(app.navigationBars["Productos"].waitForExistence(timeout: 5))
    capture("02-Productos-\(suffix)", app)
    app.tabBars.buttons["Ventas"].tap()
    let add = app.buttons["Agregar Cuaderno Studio"]
    reveal(add, app)
    XCTAssertTrue(add.isHittable)
    add.tap()
    capture("03-Ventas-\(suffix)", app)
    app.tabBars.buttons["Más"].tap()
    for (name, number) in [("Inventario", "04"), ("Reportes", "05"), ("Asistente IA", "06")] {
      let link = app.buttons[name]
      reveal(link, app)
      link.tap()
      XCTAssertTrue(app.navigationBars[name].waitForExistence(timeout: 5))
      if name == "Asistente IA" {
        let question = app.buttons["ask-revenue"]
        reveal(question, app)
        question.tap()
        XCTAssertTrue(app.staticTexts["assistant-answer-revenue"].waitForExistence(timeout: 10))
      }
      capture("\(number)-\(name)-\(suffix)", app)
      app.navigationBars.buttons["Más"].tap()
    }
  }
  @MainActor func testDemoConfirmationAndHistory() throws {
    let app = XCUIApplication()
    app.launch()
    XCTAssertTrue(app.staticTexts["dashboard-income"].waitForExistence(timeout: 15))
    app.tabBars.buttons["Ventas"].tap()
    let add = app.buttons["Agregar Cuaderno Studio"]
    reveal(add, app)
    add.tap()
    let simulate = app.buttons["simulate-sale"]
    reveal(simulate, app)
    XCTAssertTrue(simulate.isHittable)
    simulate.tap()
    app.buttons["Confirmar simulación"].tap()
    let result = app.descendants(matching: .any).matching(identifier: "sale-result").firstMatch
    XCTAssertTrue(result.waitForExistence(timeout: 10))
    for _ in 0..<10 {
      if result.isHittable { break }
      app.swipeDown()
    }
    let history = app.buttons["Historial"]
    for _ in 0..<10 {
      if history.isHittable { break }
      app.swipeDown()
    }
    history.tap()
    capture("07-Historial-demo", app)
  }
  @MainActor private func reveal(_ element: XCUIElement, _ app: XCUIApplication) {
    _ = element.waitForExistence(timeout: 5)
    for _ in 0..<12 {
      if element.isHittable { return }
      app.swipeUp()
    }
  }
  @MainActor private func capture(_ name: String, _ app: XCUIApplication) {
    let attachment = XCTAttachment(screenshot: app.screenshot())
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }
}
