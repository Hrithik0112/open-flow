// swift-tools-version:5.10
import PackageDescription

let package = Package(
    name: "OpenFlowSidecar",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "open-flow-sidecar", targets: ["OpenFlowSidecar"])
    ],
    dependencies: [
        .package(url: "https://github.com/argmaxinc/WhisperKit.git", from: "0.9.0")
    ],
    targets: [
        .executableTarget(
            name: "OpenFlowSidecar",
            dependencies: [
                .product(name: "WhisperKit", package: "WhisperKit")
            ],
            path: "Sources/OpenFlowSidecar"
        ),
        .testTarget(
            name: "OpenFlowSidecarTests",
            dependencies: ["OpenFlowSidecar"],
            path: "Tests/OpenFlowSidecarTests"
        )
    ]
)
