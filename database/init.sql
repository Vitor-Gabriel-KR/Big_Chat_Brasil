CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_type') THEN
    CREATE TYPE plan_type AS ENUM ('prepaid', 'postpaid');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_priority') THEN
    CREATE TYPE message_priority AS ENUM ('normal', 'urgent');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_status') THEN
    CREATE TYPE message_status AS ENUM ('queued', 'processing', 'sent', 'failed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  document_id VARCHAR(32) NOT NULL UNIQUE,
  plan_type plan_type NOT NULL,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title VARCHAR(160),
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  priority message_priority NOT NULL DEFAULT 'normal',
  cost NUMERIC(12, 2) NOT NULL CHECK (cost IN (0.25, 0.50)),
  status message_status NOT NULL DEFAULT 'queued',
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_queue ON messages(status, priority, queued_at);

INSERT INTO clients (id, name, document_id, plan_type, balance, active)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'Empresa Aurora', '12345678909', 'prepaid', 258.75, TRUE),
  ('22222222-2222-4222-8222-222222222222', 'Distribuidora Vale', '11222333000181', 'postpaid', 780.00, TRUE),
  ('33333333-3333-4333-8333-333333333333', 'Clínica Horizonte', '99887766000144', 'prepaid', 96.50, TRUE)
ON CONFLICT (document_id) DO UPDATE
SET
  name = EXCLUDED.name,
  plan_type = EXCLUDED.plan_type,
  balance = EXCLUDED.balance,
  active = TRUE,
  updated_at = NOW();

INSERT INTO conversations (id, client_id, title, status)
VALUES
  ('44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111', 'Financeiro', 'open'),
  ('55555555-5555-4555-8555-555555555555', '11111111-1111-4111-8111-111111111111', 'Cobrança', 'open'),
  ('66666666-6666-4666-8666-666666666666', '22222222-2222-4222-8222-222222222222', 'Operações', 'open'),
  ('77777777-7777-4777-8777-777777777777', '33333333-3333-4333-8333-333333333333', 'Suporte', 'closed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO messages (id, conversation_id, client_id, content, priority, cost, status, queued_at, processed_at, created_at)
VALUES
  ('88888888-8888-4888-8888-888888888888', '44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111', 'Preciso confirmar o envio da segunda via.', 'normal', 0.25, 'queued', NOW() - INTERVAL '25 minutes', NULL, NOW() - INTERVAL '25 minutes'),
  ('99999999-9999-4999-8999-999999999999', '55555555-5555-4555-8555-555555555555', '11111111-1111-4111-8111-111111111111', 'Chamar o cliente principal para validação ainda hoje.', 'urgent', 0.50, 'queued', NOW() - INTERVAL '12 minutes', NULL, NOW() - INTERVAL '12 minutes'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '66666666-6666-4666-8666-666666666666', '22222222-2222-4222-8222-222222222222', 'Mensagem de rotina para atualização de status.', 'normal', 0.25, 'sent', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '77777777-7777-4777-8777-777777777777', '33333333-3333-4333-8333-333333333333', 'Retorno urgente aguardando aceite.', 'urgent', 0.50, 'queued', NOW() - INTERVAL '5 minutes', NULL, NOW() - INTERVAL '5 minutes')
ON CONFLICT (id) DO NOTHING;
