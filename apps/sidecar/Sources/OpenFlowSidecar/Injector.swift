import Foundation
import AppKit
import CoreGraphics

enum Injector {
    private static let maxTextBytes = 2 * 1024 * 1024

    static func paste(_ text: String) {
        guard !text.isEmpty else { return }
        guard text.utf8.count < maxTextBytes else {
            IPC.send(.error(code: "inject.failed", message: "Transcript too large (>2 MB)."))
            return
        }

        let pasteboard = NSPasteboard.general
        let saved = snapshotPasteboard(pasteboard)

        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)

        sendCommandV()

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            restorePasteboard(pasteboard, saved: saved)
        }
    }

    private static func snapshotPasteboard(_ pb: NSPasteboard) -> [[NSPasteboard.PasteboardType: Data]] {
        var snapshots: [[NSPasteboard.PasteboardType: Data]] = []
        guard let items = pb.pasteboardItems else { return snapshots }
        for item in items {
            var dict: [NSPasteboard.PasteboardType: Data] = [:]
            for type in item.types {
                if let data = item.data(forType: type) {
                    dict[type] = data
                }
            }
            snapshots.append(dict)
        }
        return snapshots
    }

    private static func restorePasteboard(_ pb: NSPasteboard, saved: [[NSPasteboard.PasteboardType: Data]]) {
        pb.clearContents()
        let items = saved.map { dict -> NSPasteboardItem in
            let item = NSPasteboardItem()
            for (type, data) in dict {
                item.setData(data, forType: type)
            }
            return item
        }
        if !items.isEmpty {
            pb.writeObjects(items)
        }
    }

    private static func sendCommandV() {
        let source = CGEventSource(stateID: .combinedSessionState)
        let vKey: CGKeyCode = 9 // "v"
        let down = CGEvent(keyboardEventSource: source, virtualKey: vKey, keyDown: true)
        let up = CGEvent(keyboardEventSource: source, virtualKey: vKey, keyDown: false)
        down?.flags = .maskCommand
        up?.flags = .maskCommand
        down?.post(tap: .cghidEventTap)
        up?.post(tap: .cghidEventTap)
    }
}
