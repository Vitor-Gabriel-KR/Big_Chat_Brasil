import { z } from 'zod';

import { ApiError, normalizeDocumentId } from '../domain';
import { findClientByDocumentId } from '../repositories/clientRepository';
import {
  findConversationById,
  findConversationByIdAndClientId,
  markConversationMessagesAsRead,
} from '../repositories/conversationRepository';
import { pool } from '../repositories/db';

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

const simulateReplySchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().trim().min(1).max(500),
});

export const simulateConversationReply = async (input: unknown) => {
  const payload = simulateReplySchema.parse(input);
  const conversation = await findConversationById(payload.conversationId);

  if (!conversation) {
    throw new ApiError('Conversa não encontrada.', 404);
  }

  const result = await pool.query(
    `INSERT INTO messages (
       conversation_id,
       client_id,
       sender,
       content,
       priority,
       cost,
       status,
       read_at
     )
     VALUES ($1, $2, 'recipient', $3, 'normal', 0, 'sent', NULL)
     RETURNING
       id,
       conversation_id,
       client_id,
       sender,
       content,
       priority,
       cost::float8 AS cost,
       status,
       queued_at::text AS queued_at,
       processed_at::text AS processed_at,
       created_at::text AS created_at`,
    [conversation.id, conversation.clientId, payload.content],
  );

  return {
    message: {
      id: result.rows[0].id,
      conversationId: result.rows[0].conversation_id,
      clientId: result.rows[0].client_id,
      sender: result.rows[0].sender,
      content: result.rows[0].content,
      priority: result.rows[0].priority,
      cost: Number(result.rows[0].cost),
      status: result.rows[0].status,
      queuedAt: result.rows[0].queued_at,
      processedAt: result.rows[0].processed_at,
      createdAt: result.rows[0].created_at,
      conversationTitle: conversation.title,
    },
  };
};
