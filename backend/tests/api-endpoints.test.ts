type TestResult = {
  name: string;
  ok: boolean;
  status?: number;
  detail: string;
};

const baseUrl = process.env.BCB_API_BASE_URL ?? 'http://localhost:3333';

const seededClient = {
  documentId: '12345678909',
  clientId: '11111111-1111-4111-8111-111111111111',
  conversationId: '44444444-4444-4444-8444-444444444444',
  messageId: '88888888-8888-4888-8888-888888888888',
};

const uniqueDigits = () => String(Date.now()).replace(/\D/g, '');
const createTestDocumentId = () => `99${uniqueDigits().slice(-12)}`.slice(0, 14);

const requestJson = async (method: string, path: string, body?: unknown) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { response, data };
};

const results: TestResult[] = [];

const run = async (
  name: string,
  fn: () => Promise<{ ok: boolean; detail: string }>,
) => {
  try {
    const result = await fn();
    results.push({ name, ok: result.ok, detail: result.detail });
  } catch (error) {
    results.push({
      name,
      ok: false,
      detail: error instanceof Error ? error.message : 'Erro inesperado',
    });
  }
};

const expectStatus = (status: number, expected: number | number[]) => {
  const list = Array.isArray(expected) ? expected : [expected];
  return list.includes(status);
};

const main = async () => {
  const tempDocumentId = createTestDocumentId();
  let createdClientId = '';

  await run('GET /health', async () => {
    const { response, data } = await requestJson('GET', '/health');
    return {
      ok: expectStatus(response.status, 200) && data?.status === 'ok',
      detail: `status=${response.status} database=${data?.database ?? 'n/a'}`,
    };
  });

  await run('GET /queue/status', async () => {
    const { response, data } = await requestJson('GET', '/queue/status');
    return {
      ok: expectStatus(response.status, 200) && data?.status === 'ok',
      detail: `status=${response.status}`,
    };
  });

  await run('GET /docs', async () => {
    const { response, data } = await requestJson('GET', '/docs/openapi.json');
    return {
      ok: expectStatus(response.status, 200) && typeof data?.paths === 'object',
      detail: `status=${response.status} paths=${Object.keys(data?.paths ?? {}).length}`,
    };
  });

  await run('POST /auth', async () => {
    const { response, data } = await requestJson('POST', '/auth', {
      documentId: seededClient.documentId,
      documentType: 'CNPJ',
    });
    return {
      ok: expectStatus(response.status, 200) && data?.client?.documentId === seededClient.documentId,
      detail: `status=${response.status} client=${data?.client?.id ?? 'n/a'}`,
    };
  });

  await run('POST /auth/login', async () => {
    const { response, data } = await requestJson('POST', '/auth/login', {
      documentId: seededClient.documentId,
      documentType: 'CNPJ',
    });
    return {
      ok: expectStatus(response.status, 200) && data?.client?.documentId === seededClient.documentId,
      detail: `status=${response.status} client=${data?.client?.id ?? 'n/a'}`,
    };
  });

  await run('GET /dashboard', async () => {
    const { response, data } = await requestJson('GET', `/dashboard?documentId=${seededClient.documentId}`);
    return {
      ok: expectStatus(response.status, 200) && Array.isArray(data?.conversations),
      detail: `status=${response.status} conversations=${data?.conversations?.length ?? 0}`,
    };
  });

  await run('GET /clients', async () => {
    const { response, data } = await requestJson('GET', '/clients');
    return {
      ok: expectStatus(response.status, 200) && Array.isArray(data?.clients),
      detail: `status=${response.status} clients=${data?.clients?.length ?? 0}`,
    };
  });

  await run('POST /clients', async () => {
    const { response, data } = await requestJson('POST', '/clients', {
      name: 'Cliente de Teste',
      documentId: tempDocumentId,
      planType: 'prepaid',
      balance: 20,
      active: true,
    });

    createdClientId = data?.id ?? '';

    return {
      ok: expectStatus(response.status, 201) && Boolean(createdClientId),
      detail: `status=${response.status} id=${createdClientId || 'n/a'} documentId=${tempDocumentId}`,
    };
  });

  await run('GET /clients/:id', async () => {
    const { response, data } = await requestJson('GET', `/clients/${createdClientId}`);
    return {
      ok: expectStatus(response.status, 200) && data?.id === createdClientId,
      detail: `status=${response.status} id=${data?.id ?? 'n/a'}`,
    };
  });

  await run('PUT /clients/:id', async () => {
    const { response, data } = await requestJson('PUT', `/clients/${createdClientId}`, {
      name: 'Cliente de Teste Atualizado',
      balance: 25,
      active: true,
    });
    return {
      ok: expectStatus(response.status, 200) && data?.name === 'Cliente de Teste Atualizado',
      detail: `status=${response.status} name=${data?.name ?? 'n/a'}`,
    };
  });

  await run('GET /clients/:id/balance', async () => {
    const { response, data } = await requestJson('GET', `/clients/${createdClientId}/balance`);
    return {
      ok: expectStatus(response.status, 200) && typeof data?.balance === 'number',
      detail: `status=${response.status} balance=${data?.balance ?? 'n/a'}`,
    };
  });

  await run('GET /clients/:documentId/billing', async () => {
    const { response, data } = await requestJson('GET', `/clients/${seededClient.documentId}/billing`);
    return {
      ok: expectStatus(response.status, 200) && data?.client?.documentId === seededClient.documentId,
      detail: `status=${response.status}`,
    };
  });

  await run('POST /clients/:documentId/billing/credit', async () => {
    const { response } = await requestJson('POST', `/clients/${tempDocumentId}/billing/credit`, {
      amount: 5,
      note: 'Teste automatizado',
    });
    return {
      ok: expectStatus(response.status, 200),
      detail: `status=${response.status}`,
    };
  });

  await run('POST /clients/:documentId/billing/convert', async () => {
    const { response } = await requestJson('POST', `/clients/${tempDocumentId}/billing/convert`, {
      targetPlan: 'postpaid',
      note: 'Teste automatizado',
    });
    return {
      ok: expectStatus(response.status, 200),
      detail: `status=${response.status}`,
    };
  });

  await run('GET /clients/:documentId/finance', async () => {
    const { response, data } = await requestJson('GET', `/clients/${seededClient.documentId}/finance`);
    return {
      ok: expectStatus(response.status, 200) && data?.client?.documentId === seededClient.documentId,
      detail: `status=${response.status} transactions=${data?.transactions?.length ?? 0}`,
    };
  });

  await run('GET /api/conversations', async () => {
    const { response, data } = await requestJson('GET', `/api/conversations?documentId=${seededClient.documentId}`);
    return {
      ok: expectStatus(response.status, 200) && Array.isArray(data?.conversations),
      detail: `status=${response.status} conversations=${data?.conversations?.length ?? 0}`,
    };
  });

  await run('GET /api/conversations/:conversationId', async () => {
    const { response, data } = await requestJson('GET', `/api/conversations/${seededClient.conversationId}?documentId=${seededClient.documentId}`);
    return {
      ok: expectStatus(response.status, 200) && data?.id === seededClient.conversationId,
      detail: `status=${response.status} id=${data?.id ?? 'n/a'}`,
    };
  });

  await run('GET /api/conversations/:conversationId/messages', async () => {
    const { response, data } = await requestJson('GET', `/api/conversations/${seededClient.conversationId}/messages?documentId=${seededClient.documentId}`);
    return {
      ok: expectStatus(response.status, 200) && Array.isArray(data?.messages),
      detail: `status=${response.status} messages=${data?.messages?.length ?? 0}`,
    };
  });

  await run('PATCH /api/conversations/:conversationId/read', async () => {
    const { response, data } = await requestJson('PATCH', `/api/conversations/${seededClient.conversationId}/read`, {
      documentId: seededClient.documentId,
    });
    return {
      ok: expectStatus(response.status, 200) && data?.success === true,
      detail: `status=${response.status} success=${data?.success === true}`,
    };
  });

  await run('POST /api/conversations/:conversationId/simulate-reply', async () => {
    const { response, data } = await requestJson('POST', `/api/conversations/${seededClient.conversationId}/simulate-reply`, {
      content: 'Boa tarde, ainda estou aguardando resposta.',
    });
    return {
      ok: expectStatus(response.status, 200) && data?.message?.sender === 'recipient',
      detail: `status=${response.status} message=${data?.message?.id ?? 'n/a'}`,
    };
  });

  await run('POST /messages', async () => {
    const { response, data } = await requestJson('POST', '/messages', {
      documentId: seededClient.documentId,
      conversationId: seededClient.conversationId,
      content: 'Mensagem enviada pelo teste',
      priority: 'normal',
    });
    return {
      ok: expectStatus(response.status, 200) && data?.message?.status === 'queued',
      detail: `status=${response.status} message=${data?.message?.id ?? 'n/a'}`,
    };
  });

  await run('GET /messages', async () => {
    const { response, data } = await requestJson('GET', `/messages?documentId=${seededClient.documentId}`);
    return {
      ok: expectStatus(response.status, 200) && Array.isArray(data?.messages),
      detail: `status=${response.status} messages=${data?.messages?.length ?? 0}`,
    };
  });

  await run('GET /messages/:id', async () => {
    const { response, data } = await requestJson('GET', `/messages/${seededClient.messageId}?documentId=${seededClient.documentId}`);
    return {
      ok: expectStatus(response.status, 200) && data?.id === seededClient.messageId,
      detail: `status=${response.status} id=${data?.id ?? 'n/a'}`,
    };
  });

  await run('GET /messages/:id/status', async () => {
    const { response, data } = await requestJson('GET', `/messages/${seededClient.messageId}/status?documentId=${seededClient.documentId}`);
    return {
      ok: expectStatus(response.status, 200) && typeof data?.status === 'string',
      detail: `status=${response.status} status=${data?.status ?? 'n/a'}`,
    };
  });

  await run('GET /docs', async () => {
    const { response, data } = await requestJson('GET', '/docs');
    return {
      ok: expectStatus(response.status, 200) && typeof data === 'string',
      detail: `status=${response.status} html=${typeof data === 'string'}`,
    };
  });

  const total = results.length;
  const passed = results.filter((item) => item.ok).length;
  const failed = total - passed;

  console.log('\nBCB API TEST REPORT');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Total: ${total} | Passou: ${passed} | Falhou: ${failed}\n`);

  for (const result of results) {
    const mark = result.ok ? 'OK' : 'ERRO';
    console.log(`[${mark}] ${result.name} -> ${result.detail}`);
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
};

void main();
