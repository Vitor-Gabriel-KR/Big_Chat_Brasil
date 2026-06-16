import { pool } from './db';
import { Message, MessagePriority, MessageStatus, toMoney } from '../domain';

type MessageRow = {
  id: string;
  conversation_id: string;
  client_id: string;
  content: string;
  priority: MessagePriority;
  cost: string | number;
  status: MessageStatus;
  queued_at: string;
  processed_at: string | null;
  created_at: string;
  conversation_title: string;
};

const mapMessage = (row: MessageRow): Message => ({
  id: row.id,
  conversationId: row.conversation_id,
  clientId: row.client_id,
  content: row.content,
  priority: row.priority,
  cost: toMoney(row.cost),
  status: row.status,
  queuedAt: row.queued_at,
  processedAt: row.processed_at,
  createdAt: row.created_at,
  conversationTitle: row.conversation_title,
});

export const listMessagesByClientId = async (clientId: string) => {
  const result = await pool.query<MessageRow>(
    `SELECT
       m.id,
       m.conversation_id,
       m.client_id,
       m.content,
       m.priority,
       m.cost::float8 AS cost,
       m.status,
       m.queued_at::text AS queued_at,
       m.processed_at::text AS processed_at,
       m.created_at::text AS created_at,
       COALESCE(c.title, 'Conversa sem título') AS conversation_title
     FROM messages m
     LEFT JOIN conversations c ON c.id = m.conversation_id
     WHERE m.client_id = $1
     ORDER BY m.created_at DESC`,
    [clientId],
  );

  return result.rows.map(mapMessage);
};

export const listQueuedMessagesByClientId = async (clientId: string) => {
  const result = await pool.query<MessageRow>(
    `SELECT
       m.id,
       m.conversation_id,
       m.client_id,
       m.content,
       m.priority,
       m.cost::float8 AS cost,
       m.status,
       m.queued_at::text AS queued_at,
       m.processed_at::text AS processed_at,
       m.created_at::text AS created_at,
       COALESCE(c.title, 'Conversa sem título') AS conversation_title
     FROM messages m
     LEFT JOIN conversations c ON c.id = m.conversation_id
     WHERE m.client_id = $1 AND m.status = 'queued'
     ORDER BY
       CASE WHEN m.priority = 'urgent' THEN 0 ELSE 1 END,
       m.queued_at ASC`,
    [clientId],
  );

  return result.rows.map(mapMessage);
};

