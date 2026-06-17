import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { ApiError, normalizeDocumentId } from '../domain';
import { findClientByDocumentId } from '../repositories/clientRepository';
import { listFinancialTransactionsByClientId } from '../repositories/financialTransactionRepository';
import { loadClientBillingState } from '../services/billingService';

const paramsSchema = z.object({
  documentId: z.string().min(1),
});

export const registerFinanceRoutes = async (app: FastifyInstance) => {
  app.get('/clients/:documentId/finance', async (request, reply) => {
    try {
      const params = paramsSchema.parse(request.params);
      const documentId = normalizeDocumentId(params.documentId);
      const client = await findClientByDocumentId(documentId);

      if (!client || !client.active) {
        throw new ApiError('Cliente não encontrado.', 404);
      }

      const billingClient = await loadClientBillingState(client.id);
      const transactions = await listFinancialTransactionsByClientId(client.id);

      return reply.send({
        client: billingClient,
        transactions,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Documento inválido.',
          issues: error.flatten(),
        });
      }

      request.log.error(error);
      return reply.code(500).send({ error: 'Erro interno ao consultar financeiro.' });
    }
  });
};
