import { createServer } from 'http';
import { SpeechToText } from './stt.js';
import { TextToSpeech } from './tts.js';
import { ConversationalOrchestrator } from './orchestrator.js';
import { createLogger } from '@aasop/observability';

const logger = createLogger('voice-service');

const PORT = parseInt(process.env.VOICE_PORT || '3002', 10);
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

async function main() {
  const stt = new SpeechToText(DEEPGRAM_API_KEY);
  const tts = new TextToSpeech(OPENAI_API_KEY);
  const orchestrator = new ConversationalOrchestrator(stt, tts);

  const httpServer = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');

    if (req.url === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'ok', service: 'voice' }));
      return;
    }

    if (req.url === '/v1/voice/languages') {
      res.writeHead(200);
      res.end(JSON.stringify({ languages: stt.getSupportedLanguages() }));
      return;
    }

    if (req.url === '/v1/voice/voices') {
      res.writeHead(200);
      res.end(JSON.stringify({ voices: tts.getAvailableVoices() }));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  httpServer.listen(PORT, () => {
    logger.info(`Voice service listening on port ${PORT}`);
  });

  process.on('SIGTERM', () => {
    logger.info('Shutting down voice service');
    httpServer.close();
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error(err, 'Voice service failed');
  process.exit(1);
});
