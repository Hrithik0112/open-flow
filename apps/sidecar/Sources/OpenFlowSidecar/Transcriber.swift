import Foundation
import WhisperKit

final class Transcriber {
    private var pipe: WhisperKit?
    private var modelPath: String = ""
    private var dictionary: [DictionaryRule] = []

    func setDictionary(_ rules: [DictionaryRule]) {
        self.dictionary = rules
    }

    func loadModel(at path: String) async throws {
        self.modelPath = path
        // WhisperKit can load a model folder via modelFolder; we point at the unpacked package.
        self.pipe = try await WhisperKit(WhisperKitConfig(modelFolder: path, load: true))
        Logger.log("model loaded: \(path)")
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
            // Manual whole-word loop because NSString options don't include word boundaries.
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
