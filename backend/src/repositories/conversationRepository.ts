import { pool } from './db';
import { Conversation } from '../domain';
 
type ConversationRow = {
  id: string;
  client_id: string;
  title: string;
  status: 'open' | 'closed';
  last_message_content: string | null;
  last_message_time: string | null;
  unread_count: number;
};
 
const mapConversation = (row: ConversationRow): Conversation => ({
  id: row.id,
  clientId: row.client_id,
  title: row.title,
  status: row.status,
  lastMessageContent: row.last_message_content,
  lastMessageTime: row.last_message_time,
  unreadCount: row.unread_count,
});

const buildConversationQuery = (conversationFilter = '', extraClause = '') => `
  WITH latest_messages AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.content AS last_message_content,
      m.created_at AS last_message_time
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE c.client_id = $1
    ORDER BY m.conversation_id, m.created_at DESC, m.queued_at DESC, m.id DESC
  ),
  unread_counts AS (
    SELECT
      m.conversation_id,
      COUNT(*)::int AS unread_count
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE c.client_id = $1
      AND m.read_at IS NULL
    GROUP BY m.conversation_id
  )
  SELECT
    c.id,
    c.client_id,
    c.title,
    c.status,
    lm.last_message_content,
    lm.last_message_time::text AS last_message_time,
    COALESCE(uc.unread_count, 0)::int AS unread_count
  FROM conversations c
  LEFT JOIN latest_messages lm ON lm.conversation_id = c.id
  LEFT JOIN unread_counts uc ON uc.conversation_id = c.id
  WHERE c.client_id = $1 ${conversationFilter}
  ORDER BY c.updated_at DESC, c.created_at DESC
  ${extraClause}
`;
 
export const listConversationsByClientId = async (clientId: string) => {
  const result = await pool.query<ConversationRow>(buildConversationQuery(), [clientId]);
 
  return result.rows.map(mapConversation);
};
 
export const findConversationByIdAndClientId = async (conversationId: string, clientId: string) => {
  const result = await pool.query<ConversationRow>(
    buildConversationQuery('AND c.id = $2', 'LIMIT 1'),
    [clientId, conversationId],
  );

  return result.rows[0] ? mapConversation(result.rows[0]) : null;
};

export const markConversationMessagesAsRead = async (conversationId: string) => {
  await pool.query(
    `UPDATE messages
     SET read_at = NOW()
     WHERE conversation_id = $1
       AND read_at IS NULL`,
    [conversationId],
  );
};
