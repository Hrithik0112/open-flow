import Foundation

enum Logger {
    static func log(_ message: String) {
        let line = "[\(timestamp())] \(message)\n"
        FileHandle.standardError.write(Data(line.utf8))
    }

    static func error(_ message: String) {
        log("ERROR: \(message)")
    }

    private static func timestamp() -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.string(from: Date())
    }
}
