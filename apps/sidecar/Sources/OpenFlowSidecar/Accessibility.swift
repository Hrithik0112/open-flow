import Foundation
import AppKit

enum Accessibility {
    static func frontmostBundleId() -> String? {
        NSWorkspace.shared.frontmostApplication?.bundleIdentifier
    }

    static func isTrusted() -> Bool {
        let key = "AXTrustedCheckOptionPrompt" as CFString
        let options: [CFString: Any] = [key: false]
        return AXIsProcessTrustedWithOptions(options as CFDictionary)
    }
}
