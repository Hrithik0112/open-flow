import Foundation
import CoreGraphics
import AppKit

final class HotkeyMonitor {
    typealias Handler = (_ pressed: Bool) -> Void

    private var binding: HotkeyBinding
    private let handler: Handler
    private var eventTap: CFMachPort?
    private var runLoopSource: CFRunLoopSource?
    private var isHeld = false
    private var toggleActive = false

    init(binding: HotkeyBinding, handler: @escaping Handler) {
        self.binding = binding
        self.handler = handler
    }

    func update(binding: HotkeyBinding) {
        self.binding = binding
        self.isHeld = false
        if binding.mode == .toggle && toggleActive {
            toggleActive = false
            handler(false)
        }
    }

    func start() {
        let mask: CGEventMask =
            (1 << CGEventType.keyDown.rawValue) |
            (1 << CGEventType.keyUp.rawValue) |
            (1 << CGEventType.flagsChanged.rawValue)

        let callback: CGEventTapCallBack = { _, type, event, refcon in
            guard let refcon = refcon else { return Unmanaged.passUnretained(event) }
            let monitor = Unmanaged<HotkeyMonitor>.fromOpaque(refcon).takeUnretainedValue()
            monitor.handle(type: type, event: event)
            return Unmanaged.passUnretained(event)
        }

        let refcon = Unmanaged.passUnretained(self).toOpaque()
        guard let tap = CGEvent.tapCreate(
            tap: .cgSessionEventTap,
            place: .headInsertEventTap,
            options: .listenOnly,
            eventsOfInterest: mask,
            callback: callback,
            userInfo: refcon
        ) else {
            Logger.error("failed to create CGEvent tap. Input Monitoring permission likely missing.")
            IPC.send(.error(code: "permission.inputMonitoring", message: "Input Monitoring permission required."))
            return
        }
        self.eventTap = tap
        let source = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
        self.runLoopSource = source
        // Bind to the main run loop. CFRunLoopGetCurrent() would attach to whichever
        // thread happens to call start() — for us that's the stdin dispatch queue,
        // whose run loop isn't running, so events would never fire.
        CFRunLoopAddSource(CFRunLoopGetMain(), source, .commonModes)
        CGEvent.tapEnable(tap: tap, enable: true)
        Logger.log("hotkey monitor started (bound to main runloop)")
    }

    func stop() {
        if let tap = eventTap {
            CGEvent.tapEnable(tap: tap, enable: false)
        }
        if let src = runLoopSource {
            CFRunLoopRemoveSource(CFRunLoopGetMain(), src, .commonModes)
        }
        eventTap = nil
        runLoopSource = nil
    }

    private func handle(type: CGEventType, event: CGEvent) {
        // Modifier keys arrive as flagsChanged events. Non-modifier keys as keyDown/keyUp.
        let modifierKeycodes: Set<Int> = [54, 55, 56, 58, 59, 60, 61, 62, 63]
        let isModifierKey = modifierKeycodes.contains(binding.keycode)
        let keycode = Int(event.getIntegerValueField(.keyboardEventKeycode))

        if isModifierKey && type == .flagsChanged {
            if keycode == binding.keycode {
                let down = isModifierDown(forKeycode: binding.keycode, in: event.flags)
                handleEdge(pressed: down)
            }
        } else if !isModifierKey && (type == .keyDown || type == .keyUp) {
            if keycode == binding.keycode {
                handleEdge(pressed: type == .keyDown)
            }
        }
    }

    private func handleEdge(pressed: Bool) {
        switch binding.mode {
        case .pushToTalk:
            if pressed && !isHeld {
                isHeld = true
                handler(true)
            } else if !pressed && isHeld {
                isHeld = false
                handler(false)
            }
        case .toggle:
            if pressed {
                toggleActive.toggle()
                handler(toggleActive)
            }
        }
    }

    private func isModifierDown(forKeycode keycode: Int, in flags: CGEventFlags) -> Bool {
        // We can't distinguish left vs right modifier from CGEventFlags alone,
        // but for v1 the heuristic of "the matching modifier is currently set" is good enough.
        switch keycode {
        case 61, 58: return flags.contains(.maskAlternate)
        case 60, 56: return flags.contains(.maskShift)
        case 59, 62: return flags.contains(.maskControl)
        case 54, 55: return flags.contains(.maskCommand)
        case 63: return flags.contains(.maskSecondaryFn)
        default: return false
        }
    }
}
