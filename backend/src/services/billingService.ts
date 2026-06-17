import { ApiError, Client, isSameBillingMonth, messageCostByPriority, PlanType } from '../domain';
import { pool } from '../repositories/db';
import { recordFinancialTransaction } from '../repositories/financialTransactionRepository';

type ClientRow = {
  id: string;
  name: string;
  document_id: string;
  plan_type: 'prepaid' | 'postpaid';
  balance: string | number;
  credit_limit: string | number | null;
  monthly_consumed: string | number;
  billing_cycle_at: string;
  active: boolean;
};

const mapClient = (row: ClientRow): Client => ({
  id: row.id,
  name: row.name,
  documentId: row.document_id,
  planType: row.plan_type,
  balance: Number(row.balance),
  creditLimit: row.credit_limit === null ? null : Number(row.credit_limit),
  monthlyConsumed: Number(row.monthly_consumed),
  billingCycleAt: row.billing_cycle_at,
  active: row.active,
});

export const loadClientBillingState = async (clientId: string) => {
  const result = await pool.query<ClientRow>(
    `SELECT id, name, document_id, plan_type, balance::float8 AS balance, credit_limit::float8 AS credit_limit, monthly_consumed::float8 AS monthly_consumed, billing_cycle_at::text AS billing_cycle_at, active
     FROM clients
     WHERE id = $1
     LIMIT 1`,
    [clientId],
  );

  const client = result.rows[0] ? mapClient(result.rows[0]) : null;

  if (!client) {
    throw new ApiError('Cliente não encontrado.', 404);
  }

  if (client.planType !== 'postpaid' || isSameBillingMonth(client.billingCycleAt)) {
    return client;
  }

  const resetLimit = client.creditLimit ?? client.balance;
  const previousBalance = client.balance;

  const resetResult = await pool.query<ClientRow>(
    `UPDATE clients
     SET monthly_consumed = 0,
         balance = COALESCE(credit_limit, balance),
         billing_cycle_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, document_id, plan_type, balance::float8 AS balance, credit_limit::float8 AS credit_limit, monthly_consumed::float8 AS monthly_consumed, billing_cycle_at::text AS billing_cycle_at, active`,
    [client.id],
  );

  const updatedClient = mapClient(resetResult.rows[0]);

  await recordFinancialTransaction({
    clientId: client.id,
    type: 'cycle_reset',
    amount: 0,
    previousBalance,
    newBalance: updatedClient.balance,
    note: 'Reset mensal do ciclo pós-pago',
  });

  return updatedClient;
};

export const applyMessageCharge = async (params: {
  clientId: string;
  client: Client;
  priority: 'normal' | 'urgent';
  note: string;
}) => {
  const cost = messageCostByPriority(params.priority);

  if (params.client.planType === 'prepaid') {
    if (params.client.balance < cost) {
      throw new ApiError('Saldo insuficiente para enviar esta mensagem.', 400);
    }

    const nextBalance = Number((params.client.balance - cost).toFixed(2));

    const result = await pool.query<ClientRow>(
      `UPDATE clients
       SET balance = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, document_id, plan_type, balance::float8 AS balance, credit_limit::float8 AS credit_limit, monthly_consumed::float8 AS monthly_consumed, billing_cycle_at::text AS billing_cycle_at, active`,
      [params.clientId, nextBalance],
    );

    const updatedClient = mapClient(result.rows[0]);

    await recordFinancialTransaction({
      clientId: params.clientId,
      type: 'debit',
      amount: cost,
      previousBalance: params.client.balance,
      newBalance: updatedClient.balance,
      note: params.note,
    });

    return updatedClient;
  }

  const monthlyLimit = params.client.creditLimit ?? params.client.balance;
  const nextConsumed = Number((params.client.monthlyConsumed + cost).toFixed(2));

  if (nextConsumed > monthlyLimit) {
    throw new ApiError('Limite mensal excedido para este cliente.', 400);
  }

  const nextBalance = Number((monthlyLimit - nextConsumed).toFixed(2));

  const result = await pool.query<ClientRow>(
    `UPDATE clients
     SET monthly_consumed = $2,
         balance = $3,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, document_id, plan_type, balance::float8 AS balance, credit_limit::float8 AS credit_limit, monthly_consumed::float8 AS monthly_consumed, billing_cycle_at::text AS billing_cycle_at, active`,
    [params.clientId, nextConsumed, nextBalance],
  );

  const updatedClient = mapClient(result.rows[0]);

  await recordFinancialTransaction({
    clientId: params.clientId,
    type: 'debit',
    amount: cost,
    previousBalance: params.client.balance,
    newBalance: updatedClient.balance,
    note: params.note,
  });

  return updatedClient;
};

export const adjustClientFinancials = async (params: {
  clientId: string;
  amount: number;
  note: string;
}) => {
  if (params.amount <= 0) {
    throw new ApiError('O valor deve ser positivo.', 400);
  }

  const client = await loadClientBillingState(params.clientId);
  const currentLimit = client.creditLimit ?? client.balance;

  if (client.planType === 'prepaid') {
    const nextBalance = Number((client.balance + params.amount).toFixed(2));

    const result = await pool.query<ClientRow>(
      `UPDATE clients
       SET balance = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, document_id, plan_type, balance::float8 AS balance, credit_limit::float8 AS credit_limit, monthly_consumed::float8 AS monthly_consumed, billing_cycle_at::text AS billing_cycle_at, active`,
      [client.id, nextBalance],
    );

    const updatedClient = mapClient(result.rows[0]);

    await recordFinancialTransaction({
      clientId: client.id,
      type: 'credit',
      amount: params.amount,
      previousBalance: client.balance,
      newBalance: updatedClient.balance,
      note: params.note,
    });

    return updatedClient;
  }

  const nextLimit = Number((currentLimit + params.amount).toFixed(2));
  if (nextLimit < client.monthlyConsumed) {
    throw new ApiError('O novo limite não pode ficar abaixo do consumo mensal já registrado.', 400);
  }

  const nextBalance = Number((nextLimit - client.monthlyConsumed).toFixed(2));

  const result = await pool.query<ClientRow>(
    `UPDATE clients
     SET credit_limit = $2,
         balance = $3,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, document_id, plan_type, balance::float8 AS balance, credit_limit::float8 AS credit_limit, monthly_consumed::float8 AS monthly_consumed, billing_cycle_at::text AS billing_cycle_at, active`,
    [client.id, nextLimit, nextBalance],
  );

  const updatedClient = mapClient(result.rows[0]);

  await recordFinancialTransaction({
    clientId: client.id,
    type: 'limit_adjustment',
    amount: params.amount,
    previousBalance: client.balance,
    newBalance: updatedClient.balance,
    note: params.note,
  });

  return updatedClient;
};

export const convertClientPlan = async (params: {
  clientId: string;
  targetPlan: PlanType;
  note: string;
}) => {
  const client = await loadClientBillingState(params.clientId);

  if (client.planType === params.targetPlan) {
    return client;
  }

  let nextBalance = client.balance;
  let nextCreditLimit: number | null = client.creditLimit;

  if (params.targetPlan === 'postpaid') {
    nextCreditLimit = client.balance;
    nextBalance = client.balance;
  } else {
    nextCreditLimit = null;
    nextBalance = client.balance;
  }

  const result = await pool.query<ClientRow>(
    `UPDATE clients
     SET plan_type = $2,
         balance = $3,
         credit_limit = $4,
         monthly_consumed = 0,
         billing_cycle_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, document_id, plan_type, balance::float8 AS balance, credit_limit::float8 AS credit_limit, monthly_consumed::float8 AS monthly_consumed, billing_cycle_at::text AS billing_cycle_at, active`,
    [client.id, params.targetPlan, nextBalance, nextCreditLimit],
  );

  const updatedClient = mapClient(result.rows[0]);

  await recordFinancialTransaction({
    clientId: client.id,
    type: 'plan_conversion',
    amount: 0,
    previousBalance: client.balance,
    newBalance: updatedClient.balance,
    note: params.note,
  });

  return updatedClient;
};
