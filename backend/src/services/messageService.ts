import { z } from 'zod';

import { ApiError, MessagePriority, messageCostByPriority, normalizeDocumentId } from '../domain';
import { findClientByDocumentId } from '../repositories/clientRepository';
import { findConversationByIdAndClientId } from '../repositories/conversationRepository';
import { pool } from '../repositories/db';
import { enqueueMessageJob } from '../queue';
import { loadClientBillingState } from './billingService';

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

  const billingClient = await loadClientBillingState(client.id);
  const conversation = await findConversationByIdAndClientId(payload.conversationId, client.id);

  if (!conversation || conversation.status !== 'open') {
    throw new ApiError('Conversa indisponível para envio.', 400);
  }

  const cost = messageCostByPriority(payload.priority as MessagePriority);
  const connection = await pool.connect();

  try {
    await connection.query('BEGIN');

    let nextBalance = billingClient.balance;
    let nextMonthlyConsumed = billingClient.monthlyConsumed;

    if (billingClient.planType === 'prepaid') {
      if (billingClient.balance < cost) {
        throw new ApiError('Saldo insuficiente para enviar esta mensagem.', 400);
      }

      nextBalance = Number((billingClient.balance - cost).toFixed(2));
    } else {
      const monthlyLimit = billingClient.creditLimit ?? billingClient.balance;
      const calculatedConsumed = Number((billingClient.monthlyConsumed + cost).toFixed(2));

      if (calculatedConsumed > monthlyLimit) {
        throw new ApiError('Limite mensal excedido para este cliente.', 400);
      }

      nextMonthlyConsumed = calculatedConsumed;
      nextBalance = Number((monthlyLimit - calculatedConsumed).toFixed(2));
    }

    const updatedClientResult = await connection.query(
      `UPDATE clients
       SET balance = $2,
           monthly_consumed = $3,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, document_id, plan_type, balance::float8 AS balance, credit_limit::float8 AS credit_limit, monthly_consumed::float8 AS monthly_consumed, billing_cycle_at::text AS billing_cycle_at, active`,
      [client.id, nextBalance, nextMonthlyConsumed],
    );

    const messageResult = await connection.query(
      `INSERT INTO messages (
         conversation_id,
         client_id,
         sender,
         content,
         priority,
         cost,
         status
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'queued')
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
      [conversation.id, client.id, 'company', payload.content, payload.priority, cost],
    );

    await connection.query(
      `UPDATE conversations
       SET updated_at = NOW()
       WHERE id = $1`,
      [conversation.id],
    );

    await connection.query(
      `INSERT INTO financial_transactions (
         client_id,
         type,
         amount,
         previous_balance,
         new_balance,
         note
       )
       VALUES ($1, 'debit', $2, $3, $4, $5)`,
      [
        client.id,
        cost,
        billingClient.balance,
        nextBalance,
        billingClient.planType === 'prepaid'
          ? 'Débito pré-pago por mensagem'
          : 'Consumo pós-pago por mensagem',
      ],
    );

    await connection.query('COMMIT');

    const createdMessage = {
      id: messageResult.rows[0].id,
      conversationId: messageResult.rows[0].conversation_id,
      clientId: messageResult.rows[0].client_id,
      sender: messageResult.rows[0].sender,
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
        creditLimit:
          updatedClientResult.rows[0].credit_limit === null
            ? null
            : Number(updatedClientResult.rows[0].credit_limit),
        monthlyConsumed: Number(updatedClientResult.rows[0].monthly_consumed),
        billingCycleAt: updatedClientResult.rows[0].billing_cycle_at,
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
