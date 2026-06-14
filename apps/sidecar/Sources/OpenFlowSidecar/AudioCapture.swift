import Foundation
import AVFoundation

final class AudioCapture {
    static let targetSampleRate: Double = 16000

    private let engine = AVAudioEngine()
    private var converter: AVAudioConverter?
    private var buffer: [Float] = []
    private var maxSeconds: Int = 60
    private var isRunning = false
    var onLevels: ((Double) -> Void)?
    var onMaxDurationReached: (() -> Void)?

    func setMaxSeconds(_ seconds: Int) {
        self.maxSeconds = max(1, seconds)
    }

    func start() throws {
        guard !isRunning else { return }
        buffer.removeAll(keepingCapacity: true)
        let input = engine.inputNode
        let inputFormat = input.outputFormat(forBus: 0)
        guard let outputFormat = AVAudioFormat(commonFormat: .pcmFormatFloat32,
                                               sampleRate: AudioCapture.targetSampleRate,
                                               channels: 1,
                                               interleaved: false) else {
            throw NSError(domain: "open-flow", code: 1, userInfo: [NSLocalizedDescriptionKey: "bad output format"])
        }
        converter = AVAudioConverter(from: inputFormat, to: outputFormat)

        input.removeTap(onBus: 0)
        input.installTap(onBus: 0, bufferSize: 4096, format: inputFormat) { [weak self] (pcm, _) in
            self?.handleInput(pcm: pcm, outputFormat: outputFormat)
        }
        engine.prepare()
        try engine.start()
        isRunning = true
    }

    func stopAndDrain() -> [Float] {
        guard isRunning else { return [] }
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
        isRunning = false
        let drained = buffer
        buffer.removeAll(keepingCapacity: false)
        return drained
    }

    private func handleInput(pcm: AVAudioPCMBuffer, outputFormat: AVAudioFormat) {
        guard let converter else { return }
        let ratio = outputFormat.sampleRate / pcm.format.sampleRate
        let capacity = AVAudioFrameCount(Double(pcm.frameLength) * ratio + 1024)
        guard let out = AVAudioPCMBuffer(pcmFormat: outputFormat, frameCapacity: capacity) else { return }

        var error: NSError?
        var supplied = false
        let status = converter.convert(to: out, error: &error) { _, status in
            if supplied {
                status.pointee = .noDataNow
                return nil
            }
            supplied = true
            status.pointee = .haveData
            return pcm
        }
        if status == .error || error != nil {
            Logger.error("converter error: \(error?.localizedDescription ?? "unknown")")
            return
        }

        if let data = out.floatChannelData?.pointee {
            let frames = Int(out.frameLength)
            let appended = UnsafeBufferPointer(start: data, count: frames)
            buffer.append(contentsOf: appended)

            var sum: Float = 0
            for v in appended { sum += v * v }
            let rms = frames > 0 ? sqrt(sum / Float(frames)) : 0
            onLevels?(Double(rms))

            if buffer.count >= Int(AudioCapture.targetSampleRate) * maxSeconds {
                onMaxDurationReached?()
            }
        }
    }
}
