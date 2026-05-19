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
