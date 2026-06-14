import XCTest
@testable import OpenFlowSidecar

final class ProtocolTests: XCTestCase {
    func testDecodeInit() throws {
        let json = """
        {"type":"init","settings":{"hotkey":{"keycode":61,"modifiers":0,"mode":"pushToTalk"},"model":"openai_whisper-base.en","maxRecordingSeconds":60,"historyEnabled":true,"showRecordingHud":true},"dictionary":[],"modelPath":"/tmp/m"}
        """
        let decoded = IPC.decode(line: json)
        XCTAssertNotNil(decoded)
        if case .initial(let settings, let dict, let path) = decoded {
            XCTAssertEqual(settings.hotkey.keycode, 61)
            XCTAssertEqual(settings.hotkey.mode, .pushToTalk)
            XCTAssertEqual(dict.count, 0)
            XCTAssertEqual(path, "/tmp/m")
        } else {
            XCTFail("not an init")
        }
    }

    func testDecodeShutdown() {
        XCTAssertNotNil(IPC.decode(line: "{\"type\":\"shutdown\"}"))
    }

    func testDecodeUnknownIsNil() {
        XCTAssertNil(IPC.decode(line: "{\"type\":\"nope\"}"))
    }
}
