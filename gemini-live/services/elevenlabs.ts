
/**
 * ElevenLabs TTS Service
 * Uses the streaming text-to-speech API for low-latency audio output.
 * Docs: https://elevenlabs.io/docs/api-reference/text-to-speech/convert-as-stream
 */

export interface ElevenLabsVoice {
    voice_id: string;
    name: string;
    category: string;
    description?: string;
}

export const ELEVENLABS_VOICES: ElevenLabsVoice[] = [
    { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', category: 'Premade', description: 'Warm, professional female' },
    { voice_id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', category: 'Premade', description: 'Friendly male' },
    { voice_id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', category: 'Premade', description: 'Calm, nurturing female' },
    { voice_id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', category: 'Premade', description: 'Clear, confident male' },
    { voice_id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', category: 'Premade', description: 'Expressive female' },
    { voice_id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', category: 'Premade', description: 'Deep, authoritative male' },
    { voice_id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', category: 'Premade', description: 'Sophisticated female' },
    { voice_id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', category: 'Premade', description: 'Upbeat, caring female' },
];

export const DEFAULT_VOICE_ID = ELEVENLABS_VOICES[0].voice_id;

export class ElevenLabsTTS {
    private apiKey: string;
    private voiceId: string;
    private audioContext: AudioContext;
    private gainNode: GainNode;
    private currentSource: AudioBufferSourceNode | null = null;
    private isCancelled = false;

    constructor(apiKey: string, voiceId: string, audioContext: AudioContext) {
        this.apiKey = apiKey;
        this.voiceId = voiceId;
        this.audioContext = audioContext;
        this.gainNode = audioContext.createGain();
        this.gainNode.connect(audioContext.destination);
    }

    setVoice(voiceId: string) {
        this.voiceId = voiceId;
    }

    cancel() {
        this.isCancelled = true;
        if (this.currentSource) {
            try { this.currentSource.stop(); } catch { }
            this.currentSource = null;
        }
    }

    async speak(text: string): Promise<void> {
        if (!text.trim() || !this.apiKey || this.apiKey === 'your_elevenlabs_api_key_here') {
            console.warn('ElevenLabs: No API key set or empty text. Skipping TTS.');
            return;
        }

        this.isCancelled = false;

        try {
            const response = await fetch(
                `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}/stream?output_format=pcm_24000`,
                {
                    method: 'POST',
                    headers: {
                        'xi-api-key': this.apiKey,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text,
                        model_id: 'eleven_turbo_v2_5',
                        voice_settings: {
                            stability: 0.5,
                            similarity_boost: 0.75,
                            style: 0.2,
                            use_speaker_boost: true,
                        },
                    }),
                }
            );

            if (!response.ok) {
                const err = await response.json().catch(() => ({ detail: response.statusText }));
                throw new Error(`ElevenLabs API error: ${JSON.stringify(err)}`);
            }

            if (!response.body) throw new Error('No response body from ElevenLabs');

            const reader = response.body.getReader();
            const chunks: Uint8Array[] = [];

            // Stream and collect all PCM chunks
            while (true) {
                const { done, value } = await reader.read();
                if (done || this.isCancelled) break;
                if (value) chunks.push(value);
            }

            if (this.isCancelled) return;

            // Combine all chunks
            const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
            const pcmData = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of chunks) {
                pcmData.set(chunk, offset);
                offset += chunk.length;
            }

            // Convert PCM 24kHz to AudioBuffer and play
            await this.playPCM(pcmData);
        } catch (err) {
            console.error('ElevenLabs TTS error:', err);
            throw err;
        }
    }

    private async playPCM(pcmData: Uint8Array): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const sampleRate = 24000;
                const int16 = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength / 2);
                const frameCount = int16.length;

                const audioBuffer = this.audioContext.createBuffer(1, frameCount, sampleRate);
                const channelData = audioBuffer.getChannelData(0);
                for (let i = 0; i < frameCount; i++) {
                    channelData[i] = int16[i] / 32768.0;
                }

                const source = this.audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(this.gainNode);
                this.currentSource = source;

                source.onended = () => {
                    this.currentSource = null;
                    resolve();
                };
                source.start();
            } catch (err) {
                reject(err);
            }
        });
    }
}
