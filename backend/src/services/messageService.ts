import { z } from 'zod';

import { ApiError, MessagePriority, messageCostByPriority, normalizeDocumentId } from '../domain';
import { findClientByDocumentId } from '../repositories/clientRepository';
import { findConversationByIdAndClientId } from '../repositories/conversationRepository';
import { pool } from '../repositories/db';
import { enqueueMessageJob } from '../queue';

const sendMessageSchema = z.object({
  documentId: z.string().min(1),
  conversationId: z.string().uuid(),
  content: z.string().trim().min(1).max(500),
  priority: z.enum(['normal', 'urgent']).default('normal'),
});

export const enqueueMessage = async (input: unknown) => {
  const payload = sendMessageSchema.parse(input);
  const documentId = normalizeDocumentId(payload.documentId);
  const client = await findClientByDocumentId(documentId);

  if (!client || !client.active) {
    throw new ApiError('Cliente não encontrado.', 404);
  }

  const conversation = await findConversationByIdAndClientId(payload.conversationId, client.id);

  if (!conversation || conversation.status !== 'open') {
    throw new ApiError('Conversa indisponível para envio.', 400);
  }

  const cost = messageCostByPriority(payload.priority as MessagePriority);
  const nextBalance = Number((client.balance - cost).toFixed(2));

  if (nextBalance < 0) {
    throw new ApiError('Saldo insuficiente para enviar esta mensagem.', 400);
  }

  const connection = await pool.connect();

  try {
    await connection.query('BEGIN');

    const updatedClientResult = await connection.query(
      `UPDATE clients
       SET balance = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, document_id, plan_type, balance::float8 AS balance, active`,
      [client.id, nextBalance],
    );

    const messageResult = await connection.query(
      `INSERT INTO messages (
         conversation_id,
         client_id,
         content,
         priority,
         cost,
         status
       )
       VALUES ($1, $2, $3, $4, $5, 'queued')
       RETURNING
         id,
         conversation_id,
         client_id,
         content,
         priority,
         cost::float8 AS cost,
         status,
         queued_at::text AS queued_at,
         processed_at::text AS processed_at,
         created_at::text AS created_at`,
      [conversation.id, client.id, payload.content, payload.priority, cost],
    );

    await connection.query(
      `UPDATE conversations
       SET updated_at = NOW()
       WHERE id = $1`,
      [conversation.id],
    );

    await connection.query('COMMIT');

    const createdMessage = {
      id: messageResult.rows[0].id,
      conversationId: messageResult.rows[0].conversation_id,
      clientId: messageResult.rows[0].client_id,
      content: messageResult.rows[0].content,
      priority: messageResult.rows[0].priority,
      cost: Number(messageResult.rows[0].cost),
      status: messageResult.rows[0].status,
      queuedAt: messageResult.rows[0].queued_at,
      processedAt: messageResult.rows[0].processed_at,
      createdAt: messageResult.rows[0].created_at,
      conversationTitle: conversation.title,
    };

    enqueueMessageJob({
      messageId: createdMessage.id,
      clientId: client.id,
      conversationId: conversation.id,
      priority: createdMessage.priority,
      cost: createdMessage.cost,
      content: createdMessage.content,
      conversationTitle: conversation.title,
    });

    return {
      client: {
        id: updatedClientResult.rows[0].id,
        name: updatedClientResult.rows[0].name,
        documentId: updatedClientResult.rows[0].document_id,
        planType: updatedClientResult.rows[0].plan_type,
        balance: Number(updatedClientResult.rows[0].balance),
        active: updatedClientResult.rows[0].active,
      },
      message: createdMessage,
    };
  } catch (error) {
    await connection.query('ROLLBACK');
    throw error;
  } finally {
    connection.release();
  }
};
