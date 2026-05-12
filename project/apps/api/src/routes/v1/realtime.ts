import type { FastifyInstance } from 'fastify';

export async function realtimeRoutes(app: FastifyInstance) {
  app.get('/ws', {
    websocket: true,
    schema: { tags: ['realtime'], summary: 'WebSocket connection' },
  }, (connection, req) => {
    connection.socket.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        connection.socket.send(JSON.stringify({
          type: 'ack',
          received: data,
          timestamp: new Date().toISOString(),
        }));
      } catch {
        connection.socket.send(JSON.stringify({
          type: 'error',
          message: 'Invalid JSON',
          timestamp: new Date().toISOString(),
        }));
      }
    });

    connection.socket.on('close', () => {
      // cleanup
    });
  });
}
