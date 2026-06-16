import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { ApiError, normalizeDocumentId } from '../domain';
import { buildDashboardSnapshot } from '../services/dashboardService';

const querySchema = z.object({
  documentId: z.string().min(1),
});

export const registerDashboardRoutes = async (app: FastifyInstance) => {
  app.get('/dashboard', async (request, reply) => {
    try {
      const query = querySchema.parse(request.query);
      const documentId = normalizeDocumentId(query.documentId);

      return reply.send(await buildDashboardSnapshot(documentId));
    } catch (error) {
      if (error instanceof ApiError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Informe o documento do cliente.',
          issues: error.flatten(),
        });
      }

      request.log.error(error);
      return reply.code(500).send({ error: 'Erro interno ao carregar dashboard.' });
    }
  });
};
