import Foundation
import WhisperKit

enum ModelCacheError: LocalizedError {
    case cleanupFailed(path: String, underlying: Error)
    case modelResetFailed(path: String, underlying: Error)
    case incompleteModel(path: String, missing: [String])

    var errorDescription: String? {
        switch self {
        case .cleanupFailed(let path, let underlying):
            return "Could not reset the WhisperKit model cache at \(path): \(underlying.localizedDescription)"
        case .modelResetFailed(let path, let underlying):
            return "Could not reset the incomplete model folder at \(path): \(underlying.localizedDescription)"
        case .incompleteModel(let path, let missing):
            return "Downloaded model at \(path) is incomplete. Missing: \(missing.joined(separator: ", "))"
        }
    }

    var recoverySuggestion: String? {
        "Quit open-flow, remove the model cache folder, then install the model again."
    }
}

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
    private let requiredModelEntries = [
        "AudioEncoder.mlmodelc",
        "TextDecoder.mlmodelc",
        "MelSpectrogram.mlmodelc",
        "config.json",
        "generation_config.json"
    ]

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

        let modelFolderURL = baseURL
            .appendingPathComponent("models")
            .appendingPathComponent("argmaxinc")
            .appendingPathComponent("whisperkit-coreml")
            .appendingPathComponent(name)

        try resetIncompleteModelIfNeeded(at: modelFolderURL)

        // Clean any stale partial-download staging area to avoid moved-source errors.
        let stagingURL = baseURL
            .appendingPathComponent("models")
            .appendingPathComponent("argmaxinc")
            .appendingPathComponent("whisperkit-coreml")
            .appendingPathComponent(".cache")
        if FileManager.default.fileExists(atPath: stagingURL.path) {
            do {
                try FileManager.default.removeItem(at: stagingURL)
                Logger.log("removed stale staging: \(stagingURL.path)")
            } catch {
                Logger.log("failed to remove stale staging \(stagingURL.path): \(error)")
                throw ModelCacheError.cleanupFailed(path: stagingURL.path, underlying: error)
            }
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
        try validateModel(at: modelURL)
        IPC.send(.modelProgress(fraction: 1.0, message: "Loading model"))

        // 2. Load from the resolved folder.
        let config = WhisperKitConfig(
            model: name,
            downloadBase: baseURL,
            modelFolder: modelURL.path,
            tokenizerFolder: baseURL,
            verbose: false,
            prewarm: true,
            load: true,
            download: true,
            useBackgroundDownloadSession: false
        )
        self.pipe = try await WhisperKit(config)
        Logger.log("model loaded")
        IPC.send(.modelLoaded(name: name))
    }

    private func resetIncompleteModelIfNeeded(at modelURL: URL) throws {
        guard FileManager.default.fileExists(atPath: modelURL.path) else { return }

        let isComplete = missingEntries(in: modelURL).isEmpty
        guard !isComplete else { return }

        Logger.log("removing incomplete model folder: \(modelURL.path)")
        do {
            try FileManager.default.removeItem(at: modelURL)
        } catch {
            Logger.log("failed to remove incomplete model folder \(modelURL.path): \(error)")
            throw ModelCacheError.modelResetFailed(path: modelURL.path, underlying: error)
        }
    }

    private func validateModel(at modelURL: URL) throws {
        let missing = missingEntries(in: modelURL)
        guard missing.isEmpty else {
            Logger.log("downloaded model incomplete: missing \(missing.joined(separator: ", "))")
            throw ModelCacheError.incompleteModel(path: modelURL.path, missing: missing)
        }
    }

    private func missingEntries(in modelURL: URL) -> [String] {
        requiredModelEntries.filter { entry in
            !FileManager.default.fileExists(atPath: modelURL.appendingPathComponent(entry).path)
        }
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

