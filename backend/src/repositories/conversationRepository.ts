import { pool } from './db';
import { Conversation } from '../domain';

type ConversationRow = {
  id: string;
  client_id: string;
  title: string;
  status: 'open' | 'closed';
};

const mapConversation = (row: ConversationRow): Conversation => ({
  id: row.id,
  clientId: row.client_id,
  title: row.title,
  status: row.status,
});

export const listConversationsByClientId = async (clientId: string) => {
  const result = await pool.query<ConversationRow>(
    `SELECT id, client_id, title, status
     FROM conversations
     WHERE client_id = $1
     ORDER BY updated_at DESC, created_at DESC`,
    [clientId],
  );

  return result.rows.map(mapConversation);
};

export const findConversationByIdAndClientId = async (conversationId: string, clientId: string) => {
  const result = await pool.query<ConversationRow>(
    `SELECT id, client_id, title, status
     FROM conversations
     WHERE id = $1 AND client_id = $2
     LIMIT 1`,
    [conversationId, clientId],
  );

  return result.rows[0] ? mapConversation(result.rows[0]) : null;
};

