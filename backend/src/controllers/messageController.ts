import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { ApiError } from '../domain';
import { enqueueMessage, getClientMessageById, getClientMessageStatus, listClientMessages } from '../services/messageService';

const sendMessageSchema = z.object({
  documentId: z.string().min(1),
  conversationId: z.string().uuid(),
  content: z.string().min(1),
  priority: z.enum(['normal', 'urgent']).default('normal'),
});

const listQuerySchema = z.object({
  documentId: z.string().min(1),
  conversationId: z.string().uuid().optional(),
  status: z.enum(['queued', 'processing', 'sent', 'failed']).optional(),
  sender: z.enum(['company', 'recipient']).optional(),
});

const messageIdSchema = z.object({
  id: z.string().uuid(),
});

export const registerMessageRoutes = async (app: FastifyInstance) => {
  app.get('/messages', async (request, reply) => {
    try {
      const query = listQuerySchema.parse(request.query);
      return reply.send({ messages: await listClientMessages(query.documentId, query) });
    } catch (error) {
      if (error instanceof ApiError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }

      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Dados inválidos.', issues: error.flatten() });
      }

      request.log.error(error);
      return reply.code(500).send({ error: 'Erro interno ao listar mensagens.' });
    }
  });

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

  app.get('/messages/:id', async (request, reply) => {
    try {
      const params = messageIdSchema.parse(request.params);
      const query = listQuerySchema.parse(request.query);
      return reply.send(await getClientMessageById(params.id, query.documentId));
    } catch (error) {
      if (error instanceof ApiError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }

      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Dados inválidos.', issues: error.flatten() });
      }

      request.log.error(error);
      return reply.code(500).send({ error: 'Erro interno ao consultar mensagem.' });
    }
  });

  app.get('/messages/:id/status', async (request, reply) => {
    try {
      const params = messageIdSchema.parse(request.params);
      const query = listQuerySchema.parse(request.query);
      return reply.send(await getClientMessageStatus(params.id, query.documentId));
    } catch (error) {
      if (error instanceof ApiError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }

      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Dados inválidos.', issues: error.flatten() });
      }

      request.log.error(error);
      return reply.code(500).send({ error: 'Erro interno ao consultar status.' });
    }
  });
};
