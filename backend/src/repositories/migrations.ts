import { pool } from './db';

export const ensureBusinessSchema = async () => {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM (
          'debit',
          'credit',
          'limit_adjustment',
          'cycle_reset',
          'plan_conversion'
        );
      END IF;
    END $$;
  `);

  await pool.query(`
    ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12, 2),
      ADD COLUMN IF NOT EXISTS monthly_consumed NUMERIC(12, 2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS billing_cycle_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS financial_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      type transaction_type NOT NULL,
      amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      previous_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
      new_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_financial_transactions_client_id_created_at
      ON financial_transactions(client_id, created_at DESC);
  `);

  await pool.query(`
    UPDATE clients
    SET
      credit_limit = CASE
        WHEN plan_type = 'postpaid' THEN COALESCE(credit_limit, balance)
        ELSE NULL
      END,
      monthly_consumed = COALESCE(monthly_consumed, 0),
      billing_cycle_at = COALESCE(billing_cycle_at, NOW())
    WHERE TRUE;
  `);
};
