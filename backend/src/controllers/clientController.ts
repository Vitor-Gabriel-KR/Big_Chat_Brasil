import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { ApiError } from '../domain';
import { createNewClient, getClientBalance, getClientById, listAllClients, updateExistingClient } from '../services/clientService';

const idSchema = z.object({
  id: z.string().uuid(),
});

const documentIdParamsSchema = z.object({
  documentId: z.string().min(1),
});

const createSchema = z.object({
  name: z.string().trim().min(1),
  documentId: z.string().trim().min(1),
  planType: z.enum(['prepaid', 'postpaid']),
  balance: z.coerce.number().min(0).optional(),
  active: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

export const registerClientRoutes = async (app: FastifyInstance) => {
  app.get('/clients', async (_request, reply) => reply.send({ clients: await listAllClients() }));

  app.post('/clients', async (request, reply) => {
    try {
      const body = createSchema.parse(request.body);
      return reply.code(201).send(await createNewClient(body));
    } catch (error) {
      if (error instanceof ApiError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }

      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Dados inválidos.', issues: error.flatten() });
      }

      request.log.error(error);
      return reply.code(500).send({ error: 'Erro interno ao criar cliente.' });
    }
  });

  app.get('/clients/:id', async (request, reply) => {
    try {
      const params = idSchema.parse(request.params);
      return reply.send(await getClientById(params.id));
    } catch (error) {
      if (error instanceof ApiError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }

      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'ID inválido.', issues: error.flatten() });
      }

      request.log.error(error);
      return reply.code(500).send({ error: 'Erro interno ao consultar cliente.' });
    }
  });

  app.put('/clients/:id', async (request, reply) => {
    try {
      const params = idSchema.parse(request.params);
      const body = updateSchema.parse(request.body);
      return reply.send(await updateExistingClient(params.id, body));
    } catch (error) {
      if (error instanceof ApiError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }

      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Dados inválidos.', issues: error.flatten() });
      }

      request.log.error(error);
      return reply.code(500).send({ error: 'Erro interno ao atualizar cliente.' });
    }
  });

  app.get('/clients/:id/balance', async (request, reply) => {
    try {
      const params = idSchema.parse(request.params);
      return reply.send(await getClientBalance(params.id));
    } catch (error) {
      if (error instanceof ApiError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }

      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'ID inválido.', issues: error.flatten() });
      }

      request.log.error(error);
      return reply.code(500).send({ error: 'Erro interno ao consultar saldo.' });
    }
  });
};
