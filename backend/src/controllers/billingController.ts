import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { ApiError, normalizeDocumentId } from '../domain';
import { findClientByDocumentId } from '../repositories/clientRepository';
import { listFinancialTransactionsByClientId } from '../repositories/financialTransactionRepository';
import { adjustClientFinancials, convertClientPlan, loadClientBillingState } from '../services/billingService';

const paramsSchema = z.object({
  documentId: z.string().min(1),
});

const adjustSchema = z.object({
  amount: z.coerce.number().positive(),
  note: z.string().optional(),
});

const convertSchema = z.object({
  targetPlan: z.enum(['prepaid', 'postpaid']),
  note: z.string().optional(),
});

export const registerBillingRoutes = async (app: FastifyInstance) => {
  app.get('/clients/:documentId/billing', async (request, reply) => {
    try {
      const params = paramsSchema.parse(request.params);
      const documentId = normalizeDocumentId(params.documentId);
      const client = await findClientByDocumentId(documentId);

      if (!client || !client.active) {
        throw new ApiError('Cliente não encontrado.', 404);
      }

      const currentState = await loadClientBillingState(client.id);
      const transactions = await listFinancialTransactionsByClientId(client.id);

      return reply.send({
        client: currentState,
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
      return reply.code(500).send({ error: 'Erro interno ao consultar billing.' });
    }
  });

  app.post('/clients/:documentId/billing/credit', async (request, reply) => {
    try {
      const params = paramsSchema.parse(request.params);
      const body = adjustSchema.parse(request.body);
      const documentId = normalizeDocumentId(params.documentId);
      const client = await findClientByDocumentId(documentId);

      if (!client || !client.active) {
        throw new ApiError('Cliente não encontrado.', 404);
      }

      const updatedClient = await adjustClientFinancials({
        clientId: client.id,
        amount: body.amount,
        note: body.note ?? 'Ajuste financeiro',
      });

      const transactions = await listFinancialTransactionsByClientId(client.id);
      return reply.send({ client: updatedClient, transactions });
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
      return reply.code(500).send({ error: 'Erro interno ao ajustar crédito.' });
    }
  });

  app.post('/clients/:documentId/billing/convert', async (request, reply) => {
    try {
      const params = paramsSchema.parse(request.params);
      const body = convertSchema.parse(request.body);
      const documentId = normalizeDocumentId(params.documentId);
      const client = await findClientByDocumentId(documentId);

      if (!client || !client.active) {
        throw new ApiError('Cliente não encontrado.', 404);
      }

      const updatedClient = await convertClientPlan({
        clientId: client.id,
        targetPlan: body.targetPlan,
        note: body.note ?? 'Conversão de plano',
      });

      const transactions = await listFinancialTransactionsByClientId(client.id);
      return reply.send({ client: updatedClient, transactions });
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
      return reply.code(500).send({ error: 'Erro interno ao converter plano.' });
    }
  });
};
