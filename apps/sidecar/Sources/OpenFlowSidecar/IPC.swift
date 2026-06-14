import Foundation

enum IPC {
    private static let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.outputFormatting = []
        return e
    }()

    private static let decoder = JSONDecoder()
    private static let stdoutQueue = DispatchQueue(label: "open-flow.ipc.stdout")

    static func send(_ msg: Incoming) {
        do {
            let data = try encoder.encode(msg)
            stdoutQueue.async {
                FileHandle.standardOutput.write(data)
                FileHandle.standardOutput.write(Data([0x0A]))
            }
        } catch {
            Logger.error("encode failed: \(error)")
        }
    }

    static func decode(line: String) -> Outgoing? {
        let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, let data = trimmed.data(using: .utf8) else { return nil }
        do {
            return try decoder.decode(Outgoing.self, from: data)
        } catch {
            Logger.error("decode failed: \(error)")
            return nil
        }
    }
}
