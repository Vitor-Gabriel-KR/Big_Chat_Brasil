import { pool } from './db';
import { FinancialTransaction, FinancialTransactionType, toMoney } from '../domain';

type FinancialTransactionRow = {
  id: string;
  client_id: string;
  type: FinancialTransactionType;
  amount: string | number;
  previous_balance: string | number;
  new_balance: string | number;
  note: string | null;
  created_at: string;
};

const mapTransaction = (row: FinancialTransactionRow): FinancialTransaction => ({
  id: row.id,
  clientId: row.client_id,
  type: row.type,
  amount: toMoney(row.amount),
  previousBalance: toMoney(row.previous_balance),
  newBalance: toMoney(row.new_balance),
  note: row.note,
  createdAt: row.created_at,
});

export const recordFinancialTransaction = async (params: {
  clientId: string;
  type: FinancialTransactionType;
  amount: number;
  previousBalance: number;
  newBalance: number;
  note?: string | null;
}) => {
  const result = await pool.query<FinancialTransactionRow>(
    `INSERT INTO financial_transactions (
       client_id,
       type,
       amount,
       previous_balance,
       new_balance,
       note
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, client_id, type, amount::float8 AS amount, previous_balance::float8 AS previous_balance, new_balance::float8 AS new_balance, note, created_at::text AS created_at`,
    [params.clientId, params.type, params.amount, params.previousBalance, params.newBalance, params.note ?? null],
  );

  return mapTransaction(result.rows[0]);
};

export const listFinancialTransactionsByClientId = async (clientId: string) => {
  const result = await pool.query<FinancialTransactionRow>(
    `SELECT id, client_id, type, amount::float8 AS amount, previous_balance::float8 AS previous_balance, new_balance::float8 AS new_balance, note, created_at::text AS created_at
     FROM financial_transactions
     WHERE client_id = $1
     ORDER BY created_at DESC`,
    [clientId],
  );

  return result.rows.map(mapTransaction);
};
