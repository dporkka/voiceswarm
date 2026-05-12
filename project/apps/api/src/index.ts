import { createServer } from './server.js';
import { createLogger } from '@aasop/observability';

const logger = createLogger('api-server');

async function main() {
  const host = process.env.API_HOST || '0.0.0.0';
  const port = parseInt(process.env.API_PORT || '8080', 10);

  const app = await createServer();

  try {
    await app.listen({ host, port });
    logger.info(`API server listening on ${host}:${port}`);
  } catch (err) {
    logger.error(err, 'Failed to start API server');
    process.exit(1);
  }

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    await app.close();
    process.exit(0);
  });
}

main();
