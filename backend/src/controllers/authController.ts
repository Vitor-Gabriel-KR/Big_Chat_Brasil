import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { ApiError } from '../domain';
import { loginWithDocument, serializeSession } from '../services/authService';

const loginSchema = z.object({
  documentId: z.string().min(1),
  documentType: z.enum(['CPF', 'CNPJ']),
});

export const registerAuthRoutes = async (app: FastifyInstance) => {
  app.post('/auth/login', async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);
      const client = await loginWithDocument(body.documentId, body.documentType);

      return reply.send(serializeSession(client));
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
      return reply.code(500).send({ error: 'Erro interno ao autenticar.' });
    }
  });
};

