import { pool } from './db';
import { Client, PlanType, toMoney } from '../domain';

type ClientRow = {
  id: string;
  name: string;
  document_id: string;
  plan_type: PlanType;
  balance: string | number;
  active: boolean;
};

const mapClient = (row: ClientRow): Client => ({
  id: row.id,
  name: row.name,
  documentId: row.document_id,
  planType: row.plan_type,
  balance: toMoney(row.balance),
  active: row.active,
});

export const findClientByDocumentId = async (documentId: string) => {
  const result = await pool.query<ClientRow>(
    `SELECT id, name, document_id, plan_type, balance::float8 AS balance, active
     FROM clients
     WHERE document_id = $1
     LIMIT 1`,
    [documentId],
  );

  return result.rows[0] ? mapClient(result.rows[0]) : null;
};

export const findClientById = async (clientId: string) => {
  const result = await pool.query<ClientRow>(
    `SELECT id, name, document_id, plan_type, balance::float8 AS balance, active
     FROM clients
     WHERE id = $1
     LIMIT 1`,
    [clientId],
  );

  return result.rows[0] ? mapClient(result.rows[0]) : null;
};

export const updateClientBalance = async (clientId: string, balance: number) => {
  const result = await pool.query<ClientRow>(
    `UPDATE clients
     SET balance = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, document_id, plan_type, balance::float8 AS balance, active`,
    [clientId, balance],
  );

  return mapClient(result.rows[0]);
};

