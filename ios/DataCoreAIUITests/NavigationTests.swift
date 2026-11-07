import XCTest

/// Prepared for a real iOS Simulator. Not executed on Windows/Linux.
final class NavigationTests: XCTestCase {
  @MainActor
  func testSixScreensAndCaptureEvidence() throws {
    let app = XCUIApplication()
    app.launch()
    XCTAssertTrue(app.staticTexts["DEMO LOCAL · DATOS FICTICIOS"].waitForExistence(timeout: 15))
    capture("01-Dashboard", app)
    app.tabBars.buttons["Productos"].tap()
    XCTAssertTrue(app.navigationBars["Productos"].waitForExistence(timeout: 5))
    capture("02-Productos", app)
    app.tabBars.buttons["Ventas"].tap()
    XCTAssertTrue(app.buttons["Agregar Cuaderno Studio"].waitForExistence(timeout: 5))
    app.buttons["Agregar Cuaderno Studio"].tap()
    capture("03-Ventas", app)
    app.tabBars.buttons["Más"].tap()
    for (name, number) in [("Inventario", "04"), ("Reportes", "05"), ("Asistente IA", "06")] {
      app.buttons[name].tap()
      XCTAssertTrue(app.navigationBars[name].waitForExistence(timeout: 5))
      if name == "Asistente IA" {
        app.buttons["ask-revenue"].tap()
        for _ in 0..<3 { app.swipeUp() }
      }
      capture("\(number)-\(name)", app)
      app.navigationBars.buttons["Más"].tap()
    }
  }
  @MainActor
  func testDemoConfirmationAndHistory() throws {
    let app = XCUIApplication()
    app.launch()
    app.tabBars.buttons["Ventas"].tap()
    let add = app.buttons["Agregar Cuaderno Studio"]
    XCTAssertTrue(add.waitForExistence(timeout: 10))
    add.tap()
    let simulate = app.buttons["simulate-sale"]
    for _ in 0..<10 {
      if simulate.isHittable { break }
      app.swipeUp()
    }
    XCTAssertTrue(simulate.isHittable)
    simulate.tap()
    app.buttons["Confirmar simulación"].tap()
    for _ in 0..<10 {
      if app.staticTexts["sale-result"].isHittable { break }
      app.swipeDown()
    }
    XCTAssertTrue(app.staticTexts["sale-result"].exists)
    app.buttons["Historial"].tap()
    capture("07-Historial-demo", app)
  }
  @MainActor private func capture(_ name: String, _ app: XCUIApplication) {
    let attachment = XCTAttachment(screenshot: app.screenshot())
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }
}
