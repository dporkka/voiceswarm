import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { createLogger } from '@aasop/observability';

const logger = createLogger('speech-to-text');

export interface TranscriptionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  words: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  language?: string;
  speaker?: number;
}

export class SpeechToText {
  private deepgram: ReturnType<typeof createClient> | null;

  constructor(apiKey: string) {
    this.deepgram = apiKey ? createClient(apiKey) : null;
  }

  getSupportedLanguages(): string[] {
    return [
      'en', 'en-US', 'en-GB', 'en-AU',
      'es', 'es-ES', 'es-MX',
      'fr', 'fr-FR',
      'de', 'de-DE',
      'it', 'it-IT',
      'pt', 'pt-BR',
      'ja', 'ja-JP',
      'ko', 'ko-KR',
      'zh', 'zh-CN', 'zh-TW',
      'nl', 'pl', 'ru', 'tr', 'hi',
    ];
  }

  async transcribeFile(audioBuffer: Buffer, opts: { language?: string; model?: string } = {}): Promise<TranscriptionResult> {
    if (!this.deepgram) {
      logger.warn('Deepgram not configured, returning mock transcription');
      return this.mockTranscription();
    }

    try {
      const { result, error } = await this.deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model: opts.model || 'nova-2',
          language: opts.language || 'en-US',
          punctuate: true,
          diarize: true,
          smart_format: true,
        }
      );

      if (error) throw error;

      const alternatives = result.results?.channels?.[0]?.alternatives?.[0];
      return {
        transcript: alternatives?.transcript || '',
        isFinal: true,
        confidence: alternatives?.confidence || 0,
        words: (alternatives?.words || []).map((w: any) => ({
          word: w.word,
          start: w.start,
          end: w.end,
          confidence: w.confidence,
        })),
        language: result.results?.channels?.[0]?.detected_language,
      };
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Transcription failed');
      throw error;
    }
  }

  async *transcribeStream(audioStream: AsyncIterable<Buffer>, opts: { language?: string } = {}): AsyncGenerator<TranscriptionResult> {
    if (!this.deepgram) {
      yield this.mockTranscription();
      return;
    }

    const connection = this.deepgram.listen.live({
      model: 'nova-2',
      language: opts.language || 'en-US',
      punctuate: true,
      diarize: true,
      smart_format: true,
      interim_results: true,
    });

    let resolveNext: ((result: TranscriptionResult) => void) | null = null;
    let done = false;

    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const alternatives = data.channel?.alternatives?.[0];
      if (!alternatives?.transcript) return;

      const result: TranscriptionResult = {
        transcript: alternatives.transcript,
        isFinal: data.is_final || false,
        confidence: alternatives.confidence || 0,
        words: (alternatives.words || []).map((w: any) => ({
          word: w.word,
          start: w.start,
          end: w.end,
          confidence: w.confidence,
        })),
      };

      if (resolveNext) {
        resolveNext(result);
        resolveNext = null;
      }
    });

    connection.on(LiveTranscriptionEvents.Close, () => { done = true; });
    connection.on(LiveTranscriptionEvents.Error, (err) => {
      logger.error({ error: err.message }, 'Deepgram stream error');
      done = true;
    });

    // Feed audio
    (async () => {
      try {
        for await (const chunk of audioStream) {
          if (done) break;
          const audioPayload = chunk.buffer.slice(
            chunk.byteOffset,
            chunk.byteOffset + chunk.byteLength
          ) as ArrayBuffer;
          connection.send(audioPayload);
        }
      } catch (error) {
        logger.error({ error: (error as Error).message }, 'Audio stream error');
      } finally {
        connection.requestClose();
      }
    })();

    while (!done) {
      if (resolveNext) {
        await new Promise((r) => setTimeout(r, 100));
        continue;
      }
      yield new Promise<TranscriptionResult>((resolve) => { resolveNext = resolve; });
    }
  }

  private mockTranscription(): TranscriptionResult {
    return {
      transcript: 'This is a mock transcription result.',
      isFinal: true,
      confidence: 0.95,
      words: [
        { word: 'This', start: 0, end: 0.2, confidence: 0.98 },
        { word: 'is', start: 0.2, end: 0.3, confidence: 0.97 },
        { word: 'a', start: 0.3, end: 0.35, confidence: 0.96 },
        { word: 'mock', start: 0.35, end: 0.6, confidence: 0.95 },
        { word: 'transcription', start: 0.6, end: 1.0, confidence: 0.94 },
      ],
      language: 'en-US',
    };
  }
}
