// swift-tools-version: 5.9
import PackageDescription

let package = Package(
  name: "DataCoreDomain",
  platforms: [.iOS(.v17), .macOS(.v13)],
  products: [.library(name: "DataCoreDomain", targets: ["DataCoreDomain"])],
  targets: [
    .target(name: "DataCoreDomain", resources: [.process("Resources")]),
    .testTarget(name: "DataCoreDomainTests", dependencies: ["DataCoreDomain"]),
  ]
)
