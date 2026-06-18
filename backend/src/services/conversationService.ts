import { z } from 'zod';

import { ApiError, normalizeDocumentId } from '../domain';
import { findClientByDocumentId } from '../repositories/clientRepository';
import { findConversationByIdAndClientId, markConversationMessagesAsRead } from '../repositories/conversationRepository';

const markReadSchema = z.object({
  conversationId: z.string().uuid(),
  documentId: z.string().min(1).optional(),
});

export const markConversationAsRead = async (input: unknown) => {
  const payload = markReadSchema.parse(input);

  if (payload.documentId) {
    const documentId = normalizeDocumentId(payload.documentId);
    const client = await findClientByDocumentId(documentId);

    if (!client || !client.active) {
      throw new ApiError('Cliente não encontrado.', 404);
    }

    const conversation = await findConversationByIdAndClientId(payload.conversationId, client.id);

    if (!conversation) {
      throw new ApiError('Conversa não encontrada.', 404);
    }
  }

  await markConversationMessagesAsRead(payload.conversationId);

  return { success: true };
};
