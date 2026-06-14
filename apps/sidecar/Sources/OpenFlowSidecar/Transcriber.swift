import Foundation
import WhisperKit

actor LoadLock {
    private var inFlight = false
    func acquire() -> Bool {
        if inFlight { return false }
        inFlight = true
        return true
    }
    func release() { inFlight = false }
}

final class Transcriber {
    private var pipe: WhisperKit?
    private var dictionary: [DictionaryRule] = []
    private var lastProgressReported: Double = -1
    private let loadLock = LoadLock()

    func setDictionary(_ rules: [DictionaryRule]) {
        self.dictionary = rules
    }

    func loadModel(name: String, downloadBase: String) async throws {
        guard await loadLock.acquire() else {
            Logger.log("loadModel skipped: another load is in flight")
            return
        }
        defer { Task { await loadLock.release() } }

        let baseURL = URL(fileURLWithPath: downloadBase)
        Logger.log("loadModel name=\(name) downloadBase=\(baseURL.path)")

        // Clean any stale partial-download staging area to avoid moved-source errors.
        let stagingURL = baseURL
            .appendingPathComponent("models")
            .appendingPathComponent("argmaxinc")
            .appendingPathComponent("whisperkit-coreml")
            .appendingPathComponent(".cache")
        if FileManager.default.fileExists(atPath: stagingURL.path) {
            try? FileManager.default.removeItem(at: stagingURL)
            Logger.log("removed stale staging: \(stagingURL.path)")
        }

        // 1. Download (or refresh) with progress callback.
        lastProgressReported = -1
        IPC.send(.modelProgress(fraction: 0, message: "Starting download"))
        let modelURL = try await WhisperKit.download(
            variant: name,
            downloadBase: baseURL,
            useBackgroundSession: false,
            from: "argmaxinc/whisperkit-coreml",
            token: nil
        ) { [weak self] progress in
            self?.reportDownloadProgress(progress)
        }

        Logger.log("download complete -> \(modelURL.path)")
        IPC.send(.modelProgress(fraction: 1.0, message: "Loading model"))

        // 2. Load from the resolved folder.
        let config = WhisperKitConfig(
            modelFolder: modelURL.path,
            verbose: false,
            prewarm: true,
            load: true,
            download: false
        )
        self.pipe = try await WhisperKit(config)
        Logger.log("model loaded")
        IPC.send(.modelLoaded(name: name))
    }

    private func reportDownloadProgress(_ progress: Progress) {
        let fraction = progress.fractionCompleted
        // Throttle to ~50 events across the download.
        if fraction - lastProgressReported < 0.02 && fraction < 1.0 {
            return
        }
        lastProgressReported = fraction
        let message = progress.localizedDescription ?? "Downloading…"
        IPC.send(.modelProgress(fraction: fraction, message: message))
    }

    struct Result {
        let raw: String
        let cleaned: String
        let language: String
        let durationMs: Int
    }

    func transcribe(_ samples: [Float]) async throws -> Result {
        guard let pipe else {
            throw NSError(domain: "open-flow", code: 2, userInfo: [NSLocalizedDescriptionKey: "model not loaded"])
        }
        let start = Date()
        let results = try await pipe.transcribe(audioArray: samples)
        let raw = results.map { $0.text }.joined(separator: " ").trimmingCharacters(in: .whitespacesAndNewlines)
        let language = results.first?.language ?? "en"
        let cleaned = applyDictionary(to: raw)
        let dur = Int(Date().timeIntervalSince(start) * 1000)
        return Result(raw: raw, cleaned: cleaned, language: language, durationMs: dur)
    }

    private func applyDictionary(to text: String) -> String {
        var out = text
        for rule in dictionary where !rule.from.isEmpty {
            out = replace(in: out, rule: rule)
        }
        return out
    }

    private func replace(in text: String, rule: DictionaryRule) -> String {
        var options: NSString.CompareOptions = []
        if !rule.caseSensitive {
            options.insert(.caseInsensitive)
        }
        if rule.wholeWord {
            return wholeWordReplace(text: text, from: rule.from, to: rule.to, caseSensitive: rule.caseSensitive)
        }
        return text.replacingOccurrences(of: rule.from, with: rule.to, options: options, range: nil)
    }

    private func wholeWordReplace(text: String, from: String, to: String, caseSensitive: Bool) -> String {
        let pattern = "\\b" + NSRegularExpression.escapedPattern(for: from) + "\\b"
        let regexOpts: NSRegularExpression.Options = caseSensitive ? [] : [.caseInsensitive]
        guard let regex = try? NSRegularExpression(pattern: pattern, options: regexOpts) else { return text }
        let range = NSRange(text.startIndex..., in: text)
        return regex.stringByReplacingMatches(in: text, options: [], range: range, withTemplate: NSRegularExpression.escapedTemplate(for: to))
    }
}

