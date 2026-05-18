// @ts-nocheck
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const chatSchema = z.object({
  prompt: z.string().min(1).max(100000),
  systemPrompt: z.string().max(10000).optional(),
  model: z.string().optional(),
  routing: z.object({
    strategy: z.enum(['cost', 'latency', 'quality', 'load-balance']).optional(),
    providers: z.array(z.string()).optional(),
    maxCost: z.number().optional(),
    maxLatency: z.number().optional(),
  }).optional(),
  stream: z.boolean().optional(),
  structured: z.record(z.unknown()).optional(),
});

export async function inferenceRoutes(app: FastifyInstance) {
  app.post('/chat', {
    schema: {
      tags: ['inference'],
      summary: 'Chat completion',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['prompt'],
        properties: {
          prompt: { type: 'string', maxLength: 100000 },
          systemPrompt: { type: 'string' },
          model: { type: 'string' },
          routing: { type: 'object' },
          stream: { type: 'boolean' },
          structured: { type: 'object' },
        },
      },
    },
    preHandler: [app.authenticate, app.checkPermission('inference:execute')],
  }, async (req, reply) => {
    const body = chatSchema.parse(req.body);

    const result = {
      content: `Response to: ${body.prompt.slice(0, 100)}...`,
      usage: { input: Math.ceil(body.prompt.length / 4), output: 150, total: Math.ceil(body.prompt.length / 4) + 150 },
      provider: 'openai',
      model: body.model || 'gpt-4o-mini',
      latency: 1200,
      cost: 0.00015,
    };

    return reply.send(result);
  });

  app.post('/stream', {
    schema: { tags: ['inference'], summary: 'Streaming chat', security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate, app.checkPermission('inference:execute')],
  }, async (req, reply) => {
    const body = chatSchema.parse(req.body);

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const words = body.prompt.split(' ').slice(0, 20);
    for (const word of words) {
      reply.raw.write(`data: ${JSON.stringify({ content: `${word} `, done: false })}\n\n`);
      await new Promise((r) => setTimeout(r, 50));
    }

    reply.raw.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
    reply.raw.write('data: [DONE]\n\n');
    reply.raw.end();
  });
}
