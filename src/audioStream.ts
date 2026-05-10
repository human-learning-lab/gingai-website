import workletUrl from './audio-processor.js?url'
import { MicVAD } from "@ricky0123/vad-web";

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
		onSpeechEnd: (audio) => {
			workletNode.port.onmessage = (event) => {}
		}
	});


	source.connect(workletNode)


	return {
		ws,
		stream,
		audioContext
	}
}

