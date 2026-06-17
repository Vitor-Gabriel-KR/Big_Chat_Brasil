import { ApiError, DashboardSnapshot, formatDocumentId, normalizeDocumentId } from '../domain';
import { findClientByDocumentId } from '../repositories/clientRepository';
import { listConversationsByClientId } from '../repositories/conversationRepository';
import { listMessagesByClientId, listQueuedMessagesByClientId } from '../repositories/messageRepository';
import { sortQueueMessages } from '../queue';
import { loadClientBillingState } from './billingService';

export const buildDashboardSnapshot = async (rawDocumentId: string): Promise<DashboardSnapshot> => {
  const documentId = normalizeDocumentId(rawDocumentId);
  const client = await findClientByDocumentId(documentId);

  if (!client || !client.active) {
    throw new ApiError('Cliente não encontrado.', 404);
  }

  const syncedClient = await loadClientBillingState(client.id);
  const conversations = await listConversationsByClientId(client.id);
  const messages = await listMessagesByClientId(client.id);
  const queue = sortQueueMessages(await listQueuedMessagesByClientId(client.id));

  const summary = {
    openConversations: conversations.filter((conversation) => conversation.status === 'open').length,
    queuedMessages: queue.length,
    urgentMessages: queue.filter((message) => message.priority === 'urgent').length,
    totalQueueCost: queue.reduce((total, message) => total + message.cost, 0),
    balance: syncedClient.balance,
    creditLimit: syncedClient.creditLimit,
    monthlyConsumed: syncedClient.monthlyConsumed,
  };

  return {
    client: {
      ...syncedClient,
      documentId: formatDocumentId(client.documentId),
    },
    summary,
    conversations,
    messages,
    queue,
  };
};
