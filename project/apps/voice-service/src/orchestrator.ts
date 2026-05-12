import { createLogger } from '@aasop/observability';
import type { SpeechToText, TranscriptionResult } from './stt.js';
import type { TextToSpeech, TTSOptions } from './tts.js';

const logger = createLogger('voice-orchestrator');

export interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  audioDuration?: number;
  confidence?: number;
  timestamp: Date;
}

export interface ConversationSession {
  id: string;
  userId: string;
  turns: ConversationTurn[];
  language: string;
  voice: string;
  isActive: boolean;
  createdAt: Date;
  lastActivityAt: Date;
  silenceTimeoutMs: number;
  maxTurns: number;
}

export interface OrchestratorConfig {
  silenceTimeoutMs?: number;
  maxTurns?: number;
  sttLanguage?: string;
  ttsVoice?: string;
  ttsSpeed?: number;
  autoPunctuation?: boolean;
}

export class ConversationalOrchestrator {
  private sessions = new Map<string, ConversationSession>();
  private checkInterval?: ReturnType<typeof setInterval>;

  constructor(
    private stt: SpeechToText,
    private tts: TextToSpeech
  ) {
    this.startCleanupInterval();
  }

  async createSession(userId: string, config: OrchestratorConfig = {}): Promise<ConversationSession> {
    const sessionId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const session: ConversationSession = {
      id: sessionId,
      userId,
      turns: [],
      language: config.sttLanguage || 'en-US',
      voice: config.ttsVoice || 'alloy',
      isActive: true,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      silenceTimeoutMs: config.silenceTimeoutMs || 30000,
      maxTurns: config.maxTurns || 50,
    };

    this.sessions.set(sessionId, session);
    logger.info({ sessionId, userId }, 'Conversation session created');
    return session;
  }

  async processAudio(sessionId: string, audioBuffer: Buffer): Promise<{ text: string; response?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      throw new Error('Session not found or inactive');
    }

    // 1. Transcribe audio
    const transcription = await this.stt.transcribeFile(audioBuffer, {
      language: session.language,
    });

    if (!transcription.transcript) {
      return { text: '' };
    }

    // 2. Record user turn
    const userTurn: ConversationTurn = {
      id: `turn_${Date.now()}`,
      role: 'user',
      text: transcription.transcript,
      confidence: transcription.confidence,
      timestamp: new Date(),
    };
    session.turns.push(userTurn);
    session.lastActivityAt = new Date();

    logger.info({ sessionId, text: transcription.transcript }, 'User speech transcribed');
    return { text: transcription.transcript };
  }

  async generateResponse(sessionId: string, responseText: string): Promise<Buffer> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      throw new Error('Session not found or inactive');
    }

    // Record assistant turn
    const assistantTurn: ConversationTurn = {
      id: `turn_${Date.now()}`,
      role: 'assistant',
      text: responseText,
      timestamp: new Date(),
    };
    session.turns.push(assistantTurn);

    // Synthesize speech
    const ttsResult = await this.tts.synthesize(responseText, {
      voice: session.voice,
      language: session.language,
    });

    assistantTurn.audioDuration = ttsResult.duration;
    session.lastActivityAt = new Date();

    logger.info({ sessionId, responseLength: responseText.length }, 'Response generated');
    return ttsResult.audioBuffer;
  }

  async processAudioStream(
    sessionId: string,
    audioStream: AsyncIterable<Buffer>
  ): Promise<AsyncGenerator<{ type: 'partial' | 'final'; text: string; confidence: number }>> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      throw new Error('Session not found or inactive');
    }

    const transcriptionGenerator = this.stt.transcribeStream(audioStream, {
      language: session.language,
    });

    async function* generator() {
      for await (const result of transcriptionGenerator) {
        yield {
          type: result.isFinal ? 'final' as const : 'partial' as const,
          text: result.transcript,
          confidence: result.confidence,
        };
      }
    }

    return generator();
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      logger.info({ sessionId, totalTurns: session.turns.length }, 'Conversation session ended');
    }
  }

  getSession(sessionId: string): ConversationSession | undefined {
    return this.sessions.get(sessionId);
  }

  getSessionHistory(sessionId: string): ConversationTurn[] {
    return this.sessions.get(sessionId)?.turns || [];
  }

  private startCleanupInterval(): void {
    this.checkInterval = setInterval(() => {
      const now = Date.now();
      for (const [id, session] of this.sessions) {
        if (!session.isActive) continue;
        if (now - session.lastActivityAt.getTime() > session.silenceTimeoutMs) {
          session.isActive = false;
          logger.info({ sessionId: id }, 'Session timed out due to silence');
        }
        if (session.turns.length >= session.maxTurns) {
          session.isActive = false;
          logger.info({ sessionId: id }, 'Session ended due to max turns');
        }
      }
    }, 10000);
  }

  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}
