import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { ApiError } from '../domain';
import { markConversationAsRead, simulateConversationReply } from '../services/conversationService';

const paramsSchema = z.object({
  conversationId: z.string().uuid(),
});

const bodySchema = z.object({
  documentId: z.string().min(1).optional(),
}).optional();

const replySchema = z.object({
  content: z.string().trim().min(1),
});

export const registerConversationRoutes = async (app: FastifyInstance) => {
  app.patch('/conversations/:conversationId/read', async (request, reply) => {
    try {
      const params = paramsSchema.parse(request.params);
      const body = bodySchema.parse(request.body);

      return reply.send(
        await markConversationAsRead({
          conversationId: params.conversationId,
          documentId: body?.documentId,
        }),
      );
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
      return reply.code(500).send({ error: 'Erro interno ao atualizar conversa.' });
    }
  });

  app.post('/conversations/:conversationId/simulate-reply', async (request, reply) => {
    try {
      const params = paramsSchema.parse(request.params);
      const body = replySchema.parse(request.body);

      return reply.send(
        await simulateConversationReply({
          conversationId: params.conversationId,
          content: body.content,
        }),
      );
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
      return reply.code(500).send({ error: 'Erro interno ao simular resposta.' });
    }
  });
};
