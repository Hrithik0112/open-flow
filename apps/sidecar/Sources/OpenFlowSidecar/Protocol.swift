import Foundation

// Mirror of packages/shared/src/ipc.ts.
// Keep in sync manually; the schema is small.

struct HotkeyBinding: Codable {
    let keycode: Int
    let modifiers: Int
    let mode: HotkeyMode
}

enum HotkeyMode: String, Codable {
    case pushToTalk
    case toggle
}

struct DictionaryRule: Codable {
    let from: String
    let to: String
    let caseSensitive: Bool
    let wholeWord: Bool
}

struct Settings: Codable {
    let hotkey: HotkeyBinding
    let model: String
    let maxRecordingSeconds: Int
    let historyEnabled: Bool
    let showRecordingHud: Bool
}

// Messages from Electron main to sidecar.
enum Outgoing: Decodable {
    case initial(settings: Settings, dictionary: [DictionaryRule], modelName: String, downloadBase: String)
    case setHotkey(HotkeyBinding)
    case setDictionary([DictionaryRule])
    case loadModel(name: String, downloadBase: String)
    case injectText(String)
    case permissionsCheck
    case permissionsRequestMicrophone
    case permissionsRequestInputMonitoring
    case permissionsPromptAccessibility
    case shutdown

    private enum CodingKeys: String, CodingKey {
        case type, settings, dictionary, modelName, downloadBase, hotkey, rules, text
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let type = try c.decode(String.self, forKey: .type)
        switch type {
        case "init":
            let settings = try c.decode(Settings.self, forKey: .settings)
            let dict = try c.decode([DictionaryRule].self, forKey: .dictionary)
            let name = try c.decode(String.self, forKey: .modelName)
            let base = try c.decode(String.self, forKey: .downloadBase)
            self = .initial(settings: settings, dictionary: dict, modelName: name, downloadBase: base)
        case "setHotkey":
            self = .setHotkey(try c.decode(HotkeyBinding.self, forKey: .hotkey))
        case "setDictionary":
            self = .setDictionary(try c.decode([DictionaryRule].self, forKey: .rules))
        case "loadModel":
            let name = try c.decode(String.self, forKey: .modelName)
            let base = try c.decode(String.self, forKey: .downloadBase)
            self = .loadModel(name: name, downloadBase: base)
        case "injectText":
            self = .injectText(try c.decode(String.self, forKey: .text))
        case "permissions.check":
            self = .permissionsCheck
        case "permissions.requestMicrophone":
            self = .permissionsRequestMicrophone
        case "permissions.requestInputMonitoring":
            self = .permissionsRequestInputMonitoring
        case "permissions.promptAccessibility":
            self = .permissionsPromptAccessibility
        case "shutdown":
            self = .shutdown
        default:
            throw DecodingError.dataCorruptedError(
                forKey: .type, in: c, debugDescription: "unknown type \(type)"
            )
        }
    }
}

// Messages from sidecar to Electron main.
enum Incoming: Encodable {
    case ready
    case hotkeyPressed(at: Double)
    case hotkeyReleased(at: Double)
    case recordingLevels(rms: Double)
    case recordingMaxDurationReached
    case transcribeComplete(text: String, rawText: String, language: String, durationMs: Int, bundleId: String?)
    case modelProgress(fraction: Double, message: String)
    case modelLoaded(name: String)
    case modelMissing(wanted: String)
    case permissions(microphone: SidecarPermission, inputMonitoring: SidecarPermission, accessibility: SidecarPermission, binaryPath: String)
    case error(code: String, message: String)

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: DynamicKey.self)
        switch self {
        case .ready:
            try c.encode("ready", forKey: .init(stringValue: "type")!)
        case .hotkeyPressed(let at):
            try c.encode("hotkey.pressed", forKey: .init(stringValue: "type")!)
            try c.encode(at, forKey: .init(stringValue: "at")!)
        case .hotkeyReleased(let at):
            try c.encode("hotkey.released", forKey: .init(stringValue: "type")!)
            try c.encode(at, forKey: .init(stringValue: "at")!)
        case .recordingLevels(let rms):
            try c.encode("recording.levels", forKey: .init(stringValue: "type")!)
            try c.encode(rms, forKey: .init(stringValue: "rms")!)
        case .recordingMaxDurationReached:
            try c.encode("recording.maxDurationReached", forKey: .init(stringValue: "type")!)
        case .transcribeComplete(let text, let raw, let lang, let dur, let bundleId):
            try c.encode("transcribe.complete", forKey: .init(stringValue: "type")!)
            try c.encode(text, forKey: .init(stringValue: "text")!)
            try c.encode(raw, forKey: .init(stringValue: "rawText")!)
            try c.encode(lang, forKey: .init(stringValue: "language")!)
            try c.encode(dur, forKey: .init(stringValue: "durationMs")!)
            try c.encode(bundleId, forKey: .init(stringValue: "bundleId")!)
        case .modelProgress(let fraction, let message):
            try c.encode("model.progress", forKey: .init(stringValue: "type")!)
            try c.encode(fraction, forKey: .init(stringValue: "fraction")!)
            try c.encode(message, forKey: .init(stringValue: "message")!)
        case .modelLoaded(let name):
            try c.encode("model.loaded", forKey: .init(stringValue: "type")!)
            try c.encode(name, forKey: .init(stringValue: "name")!)
        case .modelMissing(let wanted):
            try c.encode("model.missing", forKey: .init(stringValue: "type")!)
            try c.encode(wanted, forKey: .init(stringValue: "wanted")!)
        case .permissions(let mic, let im, let acc, let path):
            try c.encode("permissions", forKey: .init(stringValue: "type")!)
            try c.encode(mic, forKey: .init(stringValue: "microphone")!)
            try c.encode(im, forKey: .init(stringValue: "inputMonitoring")!)
            try c.encode(acc, forKey: .init(stringValue: "accessibility")!)
            try c.encode(path, forKey: .init(stringValue: "binaryPath")!)
        case .error(let code, let message):
            try c.encode("error", forKey: .init(stringValue: "type")!)
            try c.encode(code, forKey: .init(stringValue: "code")!)
            try c.encode(message, forKey: .init(stringValue: "message")!)
        }
    }
}

private struct DynamicKey: CodingKey {
    var stringValue: String
    var intValue: Int? { nil }
    init?(stringValue: String) { self.stringValue = stringValue }
    init?(intValue: Int) { nil }
}
