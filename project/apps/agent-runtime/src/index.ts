import { AgentRuntime } from './runtime.js';
import { createLogger } from '@aasop/observability';

const logger = createLogger('agent-runtime');

async function main() {
  const runtime = new AgentRuntime({
    modelRouter: null as any,
    memoryService: null as any,
    sandboxManager: null as any,
    maxConcurrentAgents: parseInt(process.env.MAX_CONCURRENT_AGENTS || '10', 10),
    defaultTimeout: parseInt(process.env.DEFAULT_TIMEOUT || '300000', 10),
  });

  await runtime.initialize();

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down agent runtime');
    await runtime.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down agent runtime');
    await runtime.shutdown();
    process.exit(0);
  });

  logger.info('Agent runtime started');
}

main().catch((err) => {
  logger.error(err, 'Agent runtime failed');
  process.exit(1);
});
