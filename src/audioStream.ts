import { MicVAD } from "@ricky0123/vad-web";

class AudioProcessor extends AudioWorkletProcessor {
	constructor() {
		super();

		this.buffer = [];
		this.bufferSize = 4096;
	}

	process(inputs) {
		const input = inputs[0];

		if (input.length > 0) {
			const channel = input[0];

			for (const element of channel) {
				const s = Math.max(-1, Math.min(1, element));

				const sample
				= s < 0
					? s * 0x80_00
					: s * 0x7F_FF;

					this.buffer.push(sample);
			}

			if (this.buffer.length >= this.bufferSize) {
				const pcm16
				= new Int16Array(this.buffer);

				this.port.postMessage(pcm16);

				this.buffer = [];
			}
		}

		return true;
	}
}

registerProcessor(
	'audio-processor',
	AudioProcessor,
);

export default async function startAudioStreaming() {

	// Create websocket
	const ws = new WebSocket(
		"wss://wriggly-tutu-groin.ngrok-free.dev/transcribe"
	)

	ws.binaryType = "arraybuffer"

	// Get microphone
	const stream = await navigator.mediaDevices.getUserMedia({
		audio: true
	})

	// Create audio context
	const audioContext = new AudioContext({
		sampleRate: 48000
	})

	// Load worklet
	await audioContext.audioWorklet.addModule(workletUrl)

	// Create source
	const source =
		audioContext.createMediaStreamSource(stream)

	// Create processor node
	const workletNode =
		new AudioWorkletNode(
			audioContext,
			"audio-processor"
	)

	const vad = await MicVAD.new({
		onSpeechStart: () => {
			workletNode.port.onmessage = (event) => {
				if (ws.readyState === WebSocket.OPEN){
					const pcm16 = event.data
					ws.send(pcm16.buffer)
				}
			}

		},
		onSpeechEnd: () => {
			workletNode.port.onmessage = () => {}
		}
	});

	vad.start();

	source.connect(workletNode)


	return {
		ws,
		stream,
		audioContext
	}
}

