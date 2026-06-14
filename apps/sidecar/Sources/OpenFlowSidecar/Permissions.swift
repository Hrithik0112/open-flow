import Foundation
import AVFoundation
import AppKit
import IOKit.hid

enum SidecarPermission: String, Codable {
    case granted
    case denied
    case notDetermined
    case restricted
    case unknown
}

enum SidecarPermissions {
    static func microphone() -> SidecarPermission {
        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized: return .granted
        case .denied: return .denied
        case .restricted: return .restricted
        case .notDetermined: return .notDetermined
        @unknown default: return .unknown
        }
    }

    static func accessibility() -> SidecarPermission {
        AXIsProcessTrusted() ? .granted : .denied
    }

    static func inputMonitoring() -> SidecarPermission {
        let result = IOHIDCheckAccess(kIOHIDRequestTypeListenEvent)
        switch result {
        case kIOHIDAccessTypeGranted: return .granted
        case kIOHIDAccessTypeDenied: return .denied
        case kIOHIDAccessTypeUnknown: return .notDetermined
        default: return .unknown
        }
    }

    static func requestMicrophone() async -> SidecarPermission {
        let granted = await AVCaptureDevice.requestAccess(for: .audio)
        return granted ? .granted : .denied
    }

    /// Triggers the macOS prompt for Input Monitoring by attempting an access request.
    /// Returns immediately; the actual user response is asynchronous.
    static func requestInputMonitoring() {
        _ = IOHIDRequestAccess(kIOHIDRequestTypeListenEvent)
    }

    /// Triggers the macOS Accessibility prompt with the "Open System Settings" dialog.
    static func promptAccessibility() {
        let key = "AXTrustedCheckOptionPrompt" as CFString
        let options: [CFString: Any] = [key: true]
        _ = AXIsProcessTrustedWithOptions(options as CFDictionary)
    }

    static func binaryPath() -> String {
        Bundle.main.executablePath ?? ProcessInfo.processInfo.arguments.first ?? "open-flow-sidecar"
    }
}
