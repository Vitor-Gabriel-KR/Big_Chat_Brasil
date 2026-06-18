import { pool } from './db';

export const seedDevelopmentData = async () => {
  await pool.query(`
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
      credit_limit = CASE WHEN EXCLUDED.plan_type = 'postpaid' THEN EXCLUDED.balance ELSE NULL END,
      monthly_consumed = 0,
      billing_cycle_at = NOW(),
      active = TRUE,
      updated_at = NOW();
  `);

  await pool.query(`
    INSERT INTO conversations (id, client_id, title, status)
    VALUES
      ('44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111', 'Financeiro', 'open'),
      ('55555555-5555-4555-8555-555555555555', '11111111-1111-4111-8111-111111111111', 'Cobrança', 'open'),
      ('66666666-6666-4666-8666-666666666666', '22222222-2222-4222-8222-222222222222', 'Operações', 'open'),
      ('77777777-7777-4777-8777-777777777777', '33333333-3333-4333-8333-333333333333', 'Suporte', 'closed')
    ON CONFLICT (id) DO NOTHING;
  `);

  await pool.query(`
    INSERT INTO messages (id, conversation_id, client_id, content, priority, cost, status, queued_at, processed_at, read_at, created_at)
    VALUES
      ('88888888-8888-4888-8888-888888888888', '44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111', 'Preciso confirmar o envio da segunda via.', 'normal', 0.25, 'queued', NOW() - INTERVAL '25 minutes', NULL, NULL, NOW() - INTERVAL '25 minutes'),
      ('99999999-9999-4999-8999-999999999999', '55555555-5555-4555-8555-555555555555', '11111111-1111-4111-8111-111111111111', 'Chamar o cliente principal para validação ainda hoje.', 'urgent', 0.50, 'queued', NOW() - INTERVAL '12 minutes', NULL, NULL, NOW() - INTERVAL '12 minutes'),
      ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '66666666-6666-4666-8666-666666666666', '22222222-2222-4222-8222-222222222222', 'Mensagem de rotina para atualização de status.', 'normal', 0.25, 'sent', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '90 minutes', NOW() - INTERVAL '2 hours'),
      ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '77777777-7777-4777-8777-777777777777', '33333333-3333-4333-8333-333333333333', 'Retorno urgente aguardando aceite.', 'urgent', 0.50, 'queued', NOW() - INTERVAL '5 minutes', NULL, NULL, NOW() - INTERVAL '5 minutes')
    ON CONFLICT (id) DO NOTHING;
  `);
};
