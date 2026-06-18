import { z } from 'zod';

import { ApiError, normalizeDocumentId } from '../domain';
import { createClient, findClientById, findClientByDocumentId, listClients, updateClient } from '../repositories/clientRepository';
import { loadClientBillingState } from './billingService';

const createClientSchema = z.object({
  name: z.string().trim().min(1),
  documentId: z.string().trim().min(1),
  planType: z.enum(['prepaid', 'postpaid']),
  balance: z.coerce.number().min(0).optional(),
  active: z.boolean().optional(),
});

const updateClientSchema = createClientSchema.partial().extend({
  documentId: z.string().trim().min(1).optional(),
});

export const listAllClients = async () => listClients();

export const createNewClient = async (input: unknown) => {
  const payload = createClientSchema.parse(input);
  const documentId = normalizeDocumentId(payload.documentId);

  if (!documentId) {
    throw new ApiError('Documento inválido.', 400);
  }

  const existingClient = await findClientByDocumentId(documentId);
  if (existingClient) {
    throw new ApiError('Cliente já cadastrado.', 409);
  }

  return createClient({
    name: payload.name,
    documentId,
    planType: payload.planType,
    balance: payload.balance,
    active: payload.active,
  });
};

export const getClientById = async (clientId: string) => {
  const client = await findClientById(clientId);

  if (!client) {
    throw new ApiError('Cliente não encontrado.', 404);
  }

  return client;
};

export const updateExistingClient = async (clientId: string, input: unknown) => {
  const payload = updateClientSchema.parse(input);
  const client = await findClientById(clientId);

  if (!client) {
    throw new ApiError('Cliente não encontrado.', 404);
  }

  const updatedClient = await updateClient(clientId, {
    name: payload.name,
    documentId: payload.documentId ? normalizeDocumentId(payload.documentId) : undefined,
    planType: payload.planType,
    balance: payload.balance,
    active: payload.active,
  });

  if (!updatedClient) {
    throw new ApiError('Cliente não encontrado.', 404);
  }

  return updatedClient;
};

export const getClientBalance = async (clientId: string) => {
  const client = await loadClientBillingState(clientId);
  return {
    balance: client.balance,
    creditLimit: client.creditLimit,
    monthlyConsumed: client.monthlyConsumed,
    planType: client.planType,
    active: client.active,
  };
};
