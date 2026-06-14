import Foundation
import AppKit

final class App {
    let audio = AudioCapture()
    let transcriber = Transcriber()
    var hotkey: HotkeyMonitor?
    var stdinHandle: FileHandle = .standardInput
    var stdinBuffer = Data()
    var hudThrottleCounter = 0

    func run() {
        // Read stdin asynchronously and dispatch messages.
        stdinHandle.readabilityHandler = { [weak self] handle in
            guard let self else { return }
            let data = handle.availableData
            if data.isEmpty {
                Logger.log("stdin EOF, shutting down")
                DispatchQueue.main.async { self.shutdown() }
                return
            }
            self.stdinBuffer.append(data)
            self.drainStdin()
        }

        audio.onLevels = { [weak self] rms in
            guard let self else { return }
            self.hudThrottleCounter += 1
            // Buffers arrive often; emit ~10 Hz only.
            if self.hudThrottleCounter % 4 == 0 {
                IPC.send(.recordingLevels(rms: rms))
            }
        }
        audio.onMaxDurationReached = {
            IPC.send(.recordingMaxDurationReached)
        }

        IPC.send(.ready)
        RunLoop.current.run()
    }

    private func drainStdin() {
        while let nl = stdinBuffer.firstIndex(of: 0x0A) {
            let lineData = stdinBuffer.subdata(in: 0..<nl)
            stdinBuffer.removeSubrange(0...nl)
            guard let line = String(data: lineData, encoding: .utf8),
                  let msg = IPC.decode(line: line) else { continue }
            handle(msg)
        }
    }

    private func handle(_ msg: Outgoing) {
        switch msg {
        case .initial(let settings, let dict, let modelPath):
            transcriber.setDictionary(dict)
            audio.setMaxSeconds(settings.maxRecordingSeconds)
            let monitor = HotkeyMonitor(binding: settings.hotkey) { [weak self] pressed in
                self?.onHotkey(pressed: pressed)
            }
            monitor.start()
            self.hotkey = monitor
            if !modelPath.isEmpty {
                Task { await self.tryLoadModel(modelPath) }
            } else {
                IPC.send(.modelMissing(wanted: settings.model))
            }

        case .setHotkey(let binding):
            hotkey?.update(binding: binding)

        case .setDictionary(let rules):
            transcriber.setDictionary(rules)

        case .loadModel(let path):
            Task { await self.tryLoadModel(path) }

        case .injectText(let text):
            Injector.paste(text)

        case .shutdown:
            shutdown()
        }
    }

    private func tryLoadModel(_ path: String) async {
        do {
            try await transcriber.loadModel(at: path)
            IPC.send(.ready)
        } catch {
            IPC.send(.error(code: "model.loadFailed", message: String(describing: error)))
        }
    }

    private func onHotkey(pressed: Bool) {
        let now = Date().timeIntervalSince1970 * 1000
        if pressed {
            IPC.send(.hotkeyPressed(at: now))
            do {
                try audio.start()
            } catch {
                IPC.send(.error(code: "audio.captureFailed", message: String(describing: error)))
            }
        } else {
            IPC.send(.hotkeyReleased(at: now))
            let samples = audio.stopAndDrain()
            let bundleId = Accessibility.frontmostBundleId()
            Task {
                do {
                    let result = try await transcriber.transcribe(samples)
                    IPC.send(.transcribeComplete(
                        text: result.cleaned,
                        rawText: result.raw,
                        language: result.language,
                        durationMs: result.durationMs,
                        bundleId: bundleId
                    ))
                    DispatchQueue.main.async {
                        Injector.paste(result.cleaned)
                    }
                } catch {
                    IPC.send(.error(code: "transcribe.failed", message: String(describing: error)))
                }
            }
        }
    }

    private func shutdown() {
        hotkey?.stop()
        _ = audio.stopAndDrain()
        exit(0)
    }
}

let app = App()
app.run()
