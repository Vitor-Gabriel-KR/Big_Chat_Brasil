import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { ApiError } from '../domain';
import { enqueueMessage } from '../services/messageService';

const sendMessageSchema = z.object({
  documentId: z.string().min(1),
  conversationId: z.string().uuid(),
  content: z.string().min(1),
  priority: z.enum(['normal', 'urgent']).default('normal'),
});

export const registerMessageRoutes = async (app: FastifyInstance) => {
  app.post('/messages', async (request, reply) => {
    try {
      const payload = sendMessageSchema.parse(request.body);
      return reply.send(await enqueueMessage(payload));
    } catch (error) {
      if (error instanceof ApiError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Dados inválidos.',
          issues: error.flatten(),
        });
      }

      request.log.error(error);
      return reply.code(500).send({ error: 'Erro interno ao enviar mensagem.' });
    }
  });
};

