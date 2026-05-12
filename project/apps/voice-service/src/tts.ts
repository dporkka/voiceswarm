import { createLogger } from '@aasop/observability';

const logger = createLogger('text-to-speech');

export interface TTSOptions {
  voice?: string;
  speed?: number;
  format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'pcm';
  language?: string;
}

export interface TTSResult {
  audioBuffer: Buffer;
  format: string;
  duration: number;
  sampleRate: number;
}

export class TextToSpeech {
  private openaiApiKey: string;

  constructor(apiKey: string) {
    this.openaiApiKey = apiKey;
  }

  getAvailableVoices(): Array<{ id: string; name: string; gender: string; languages: string[] }> {
    return [
      { id: 'alloy', name: 'Alloy', gender: 'neutral', languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh'] },
      { id: 'echo', name: 'Echo', gender: 'male', languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh'] },
      { id: 'fable', name: 'Fable', gender: 'male', languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh'] },
      { id: 'onyx', name: 'Onyx', gender: 'male', languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh'] },
      { id: 'nova', name: 'Nova', gender: 'female', languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh'] },
      { id: 'shimmer', name: 'Shimmer', gender: 'female', languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh'] },
    ];
  }

  async synthesize(text: string, opts: TTSOptions = {}): Promise<TTSResult> {
    if (!this.openaiApiKey) {
      logger.warn('OpenAI not configured, returning mock audio');
      return this.mockSynthesize(text);
    }

    const start = Date.now();

    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: opts.voice || 'alloy',
          speed: opts.speed || 1.0,
          response_format: opts.format || 'mp3',
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI TTS API error: ${response.status} ${await response.text()}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);
      const duration = this.estimateDuration(text, opts.speed || 1.0);

      logger.info({ textLength: text.length, duration, voice: opts.voice }, 'Speech synthesized');

      return {
        audioBuffer,
        format: opts.format || 'mp3',
        duration,
        sampleRate: 24000,
      };
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'TTS synthesis failed');
      throw error;
    }
  }

  async synthesizeStream(text: string, opts: TTSOptions = {}): Promise<ReadableStream<Uint8Array>> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI not configured');
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: opts.voice || 'alloy',
        speed: opts.speed || 1.0,
        response_format: opts.format || 'mp3',
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI TTS API error: ${response.status}`);
    }

    return response.body as ReadableStream<Uint8Array>;
  }

  private mockSynthesize(text: string): TTSResult {
    const duration = this.estimateDuration(text, 1.0);
    const sampleCount = duration * 24000;
    const audioBuffer = Buffer.alloc(Math.floor(sampleCount * 2));

    for (let i = 0; i < sampleCount; i++) {
      const sample = Math.sin((i / 24000) * 440 * Math.PI * 2) * 0.1;
      audioBuffer.writeInt16LE(Math.floor(sample * 32767), i * 2);
    }

    return {
      audioBuffer,
      format: 'pcm',
      duration,
      sampleRate: 24000,
    };
  }

  private estimateDuration(text: string, speed: number): number {
    const wordsPerMinute = 150 / speed;
    const wordCount = text.split(/\s+/).length;
    return (wordCount / wordsPerMinute) * 60;
  }
}
