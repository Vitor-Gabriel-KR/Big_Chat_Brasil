import { pool } from './db';
import { Message, MessagePriority, MessageSender, MessageStatus, toMoney } from '../domain';

type MessageRow = {
  id: string;
  conversation_id: string;
  client_id: string;
  sender: MessageSender;
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
  sender: row.sender,
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
       m.sender,
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
       m.sender,
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

export const findMessageById = async (messageId: string) => {
  const result = await pool.query<MessageRow>(
    `SELECT
       m.id,
       m.conversation_id,
       m.client_id,
       m.sender,
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
     WHERE m.id = $1
     LIMIT 1`,
    [messageId],
  );

  return result.rows[0] ? mapMessage(result.rows[0]) : null;
};

export const listQueuedMessagesForWorker = async () => {
  const result = await pool.query<MessageRow>(
    `SELECT
       m.id,
       m.conversation_id,
       m.client_id,
       m.sender,
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
     WHERE m.status = 'queued'
     ORDER BY
       CASE WHEN m.priority = 'urgent' THEN 0 ELSE 1 END,
       m.queued_at ASC`,
  );

  return result.rows.map(mapMessage);
};

export const listMessagesByConversationId = async (conversationId: string) => {
  const result = await pool.query<MessageRow>(
    `SELECT
       m.id,
       m.conversation_id,
       m.client_id,
       m.sender,
       m.content,
       m.priority,
       m.cost::float8 AS cost,
       m.status,
       m.queued_at::text AS queued_at,
       m.processed_at::text AS processed_at,
       m.created_at::text AS created_at,
       COALESCE(c.title, 'Conversa sem tÃ­tulo') AS conversation_title
     FROM messages m
     LEFT JOIN conversations c ON c.id = m.conversation_id
     WHERE m.conversation_id = $1
     ORDER BY m.created_at ASC`,
    [conversationId],
  );

  return result.rows.map(mapMessage);
};

export const listMessagesByClientIdWithFilters = async (params: {
  clientId: string;
  conversationId?: string;
  status?: MessageStatus;
  sender?: 'company' | 'recipient';
}) => {
  const filters: string[] = ['m.client_id = $1'];
  const values: Array<string | undefined> = [params.clientId];

  if (params.conversationId) {
    values.push(params.conversationId);
    filters.push(`m.conversation_id = $${values.length}`);
  }

  if (params.status) {
    values.push(params.status);
    filters.push(`m.status = $${values.length}`);
  }

  if (params.sender) {
    values.push(params.sender);
    filters.push(`m.sender = $${values.length}`);
  }

  const result = await pool.query<MessageRow>(
    `SELECT
       m.id,
       m.conversation_id,
       m.client_id,
       m.sender,
       m.content,
       m.priority,
       m.cost::float8 AS cost,
       m.status,
       m.queued_at::text AS queued_at,
       m.processed_at::text AS processed_at,
       m.created_at::text AS created_at,
       COALESCE(c.title, 'Conversa sem tÃ­tulo') AS conversation_title
     FROM messages m
     LEFT JOIN conversations c ON c.id = m.conversation_id
     WHERE ${filters.join(' AND ')}
     ORDER BY m.created_at DESC`,
    values,
  );

  return result.rows.map(mapMessage);
};
