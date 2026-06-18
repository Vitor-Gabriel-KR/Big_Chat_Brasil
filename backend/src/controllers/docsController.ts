import { FastifyInstance } from 'fastify';

import { openApiDocument } from '../docs/openapi';

const methodOrder = ['get', 'post', 'put', 'patch', 'delete'] as const;

const methodColors: Record<string, string> = {
  get: '#2f80ed',
  post: '#1f9d55',
  put: '#f5a524',
  patch: '#8b5cf6',
  delete: '#ef4444',
};

const groupLabel = (path: string) => {
  if (path.startsWith('/api/conversations')) return 'Conversas';
  if (path.startsWith('/messages')) return 'Mensagens';
  if (path.startsWith('/clients')) return 'Clientes';
  if (path.startsWith('/auth')) return 'Autenticação';
  if (path.startsWith('/queue')) return 'Fila';
  if (path.startsWith('/dashboard')) return 'Dashboard';
  if (path.startsWith('/health')) return 'Sistema';
  return 'Geral';
};

const toCurl = (method: string, path: string) =>
  `curl -X ${method.toUpperCase()} "http://localhost:3333${path.replace('{conversationId}', 'CONVERSATION_ID').replace('{id}', 'ID')}"`;

const defaultIds = {
  clientId: '11111111-1111-4111-8111-111111111111',
  clientDocumentId: '12345678909',
  financeConversationId: '44444444-4444-4444-8444-444444444444',
  billingConversationId: '55555555-5555-4555-8555-555555555555',
  messagesConversationId: '44444444-4444-4444-8444-444444444444',
  messageId: '88888888-8888-4888-8888-888888888888',
};

const mockExampleForPath = (method: string, path: string) => {
  if (path === '/auth' || path === '/auth/login') {
    return `curl -X ${method.toUpperCase()} "http://localhost:3333${path}" -H "Content-Type: application/json" -d '{"documentId":"${defaultIds.clientDocumentId}","documentType":"CPF"}'`;
  }

  if (path === '/dashboard') {
    return `curl -X GET "http://localhost:3333/dashboard?documentId=${defaultIds.clientDocumentId}"`;
  }

  if (path === '/clients') {
    return method === 'get'
      ? `curl -X GET "http://localhost:3333/clients"`
      : `curl -X POST "http://localhost:3333/clients" -H "Content-Type: application/json" -d '{"name":"Empresa Aurora","documentId":"${defaultIds.clientDocumentId}","planType":"prepaid","balance":258.75,"active":true}'`;
  }

  if (path === '/clients/{id}') {
    return `curl -X ${method.toUpperCase()} "http://localhost:3333/clients/${defaultIds.clientId}"`;
  }

  if (path === '/clients/{id}/balance') {
    return `curl -X GET "http://localhost:3333/clients/${defaultIds.clientId}/balance"`;
  }

  if (path === '/messages') {
    return method === 'get'
      ? `curl -X GET "http://localhost:3333/messages?documentId=${defaultIds.clientDocumentId}"`
      : `curl -X POST "http://localhost:3333/messages" -H "Content-Type: application/json" -d '{"documentId":"${defaultIds.clientDocumentId}","conversationId":"${defaultIds.financeConversationId}","content":"Olá, tudo bem?","priority":"normal"}'`;
  }

  if (path === '/messages/{id}') {
    return `curl -X GET "http://localhost:3333/messages/${defaultIds.messageId}?documentId=${defaultIds.clientDocumentId}"`;
  }

  if (path === '/messages/{id}/status') {
    return `curl -X GET "http://localhost:3333/messages/${defaultIds.messageId}/status?documentId=${defaultIds.clientDocumentId}"`;
  }

  if (path === '/api/conversations') {
    return `curl -X GET "http://localhost:3333/api/conversations?documentId=${defaultIds.clientDocumentId}"`;
  }

  if (path === '/api/conversations/{conversationId}') {
    return `curl -X GET "http://localhost:3333/api/conversations/${defaultIds.financeConversationId}?documentId=${defaultIds.clientDocumentId}"`;
  }

  if (path === '/api/conversations/{conversationId}/messages') {
    return `curl -X GET "http://localhost:3333/api/conversations/${defaultIds.financeConversationId}/messages?documentId=${defaultIds.clientDocumentId}"`;
  }

  if (path === '/api/conversations/{conversationId}/read') {
    return `curl -X PATCH "http://localhost:3333/api/conversations/${defaultIds.financeConversationId}/read" -H "Content-Type: application/json" -d '{"documentId":"${defaultIds.clientDocumentId}"}'`;
  }

  if (path === '/api/conversations/{conversationId}/simulate-reply') {
    return `curl -X POST "http://localhost:3333/api/conversations/${defaultIds.financeConversationId}/simulate-reply" -H "Content-Type: application/json" -d '{"content":"Boa tarde, segue a resposta simulada."}'`;
  }

  if (path === '/queue/status') {
    return `curl -X GET "http://localhost:3333/queue/status"`;
  }

  if (path === '/health') {
    return `curl -X GET "http://localhost:3333/health"`;
  }

  return toCurl(method, path);
};

export const registerDocsRoutes = async (app: FastifyInstance) => {
  app.get('/docs/openapi.json', async (_request, reply) => {
    return reply.send(openApiDocument);
  });

  app.get('/docs', async (_request, reply) => {
    const paths = Object.entries(openApiDocument.paths).flatMap(([path, methods]) =>
      Object.entries(methods as Record<string, { summary?: string }>)
        .filter(([method]) => methodOrder.includes(method as (typeof methodOrder)[number]))
        .map(([method, operation]) => ({
          path,
          method,
          summary: operation.summary ?? '',
          group: groupLabel(path),
        })),
    );

    const grouped = paths.reduce<Record<string, typeof paths>>((accumulator, item) => {
      accumulator[item.group] ??= [];
      accumulator[item.group].push(item);
      return accumulator;
    }, {});

    return reply.type('text/html').send(`
      <!doctype html>
      <html lang="pt-br">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>BCB API Docs</title>
          <style>
            :root{
              --bg:#0a0d14;
              --panel:#0f1624;
              --panel-2:#111a2b;
              --border:#223049;
              --text:#e8f0ff;
              --muted:#8da0bf;
              --accent:#6fb1ff;
            }
            *{box-sizing:border-box}
            body{
              margin:0;
              font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
              background:
                radial-gradient(circle at top left, rgba(111,177,255,.12), transparent 25%),
                radial-gradient(circle at bottom right, rgba(31,157,85,.10), transparent 30%),
                var(--bg);
              color:var(--text);
            }
            a{color:var(--accent);text-decoration:none}
            .shell{display:grid;grid-template-columns:280px 1fr;min-height:100vh}
            .sidebar{
              background:rgba(10,13,20,.92);
              border-right:1px solid var(--border);
              padding:24px 18px;
              position:sticky;top:0;height:100vh;overflow:auto;
            }
            .brand{display:flex;align-items:center;gap:12px;margin-bottom:22px}
            .brand-badge{
              width:42px;height:42px;border-radius:12px;
              display:grid;place-items:center;
              background:linear-gradient(135deg,#2f80ed,#6fb1ff);
              color:#fff;font-weight:800;
              box-shadow:0 10px 24px rgba(47,128,237,.25);
            }
            .brand h1{font-size:18px;margin:0}
            .brand p{margin:2px 0 0;color:var(--muted);font-size:12px}
            .search{
              width:100%;border:1px solid var(--border);border-radius:12px;
              background:var(--panel);color:var(--text);
              padding:12px 14px;outline:none;margin:8px 0 18px;
            }
            .group{margin-bottom:18px}
            .group-title{
              font-size:11px;letter-spacing:.14em;text-transform:uppercase;
              color:var(--muted);margin:0 0 10px;font-weight:700;
            }
            .nav-item{
              display:flex;align-items:center;justify-content:space-between;gap:10px;
              width:100%;border:1px solid transparent;border-radius:12px;
              background:transparent;color:var(--text);padding:10px 12px;
              cursor:pointer;text-align:left;transition:.2s ease;
            }
            .nav-item:hover,.nav-item.active{background:var(--panel);border-color:var(--border)}
            .nav-item small{color:var(--muted)}
            .method-pill{
              display:inline-flex;align-items:center;justify-content:center;
              min-width:54px;padding:4px 10px;border-radius:999px;
              color:white;font-size:11px;font-weight:800;text-transform:uppercase;
              letter-spacing:.08em;
            }
            .content{padding:28px;max-width:1400px;width:100%}
            .hero{
              background:linear-gradient(135deg, rgba(17,26,43,.92), rgba(15,22,36,.92));
              border:1px solid var(--border);border-radius:24px;padding:24px;
              display:flex;align-items:flex-start;justify-content:space-between;gap:24px;
              box-shadow:0 24px 80px rgba(0,0,0,.28);
            }
            .hero h2{margin:0 0 8px;font-size:28px}
            .hero p{margin:0;color:var(--muted);max-width:760px;line-height:1.6}
            .hero-actions{display:flex;gap:10px;flex-wrap:wrap}
            .btn{
              display:inline-flex;align-items:center;gap:8px;
              border:1px solid var(--border);border-radius:12px;
              background:var(--panel);color:var(--text);padding:10px 14px;
              cursor:pointer;font-weight:600;
            }
            .btn.primary{background:linear-gradient(135deg,#2f80ed,#6fb1ff);border-color:transparent}
            .toolbar{display:flex;gap:12px;flex-wrap:wrap;margin:20px 0 22px}
            .chip{
              padding:7px 12px;border-radius:999px;border:1px solid var(--border);
              background:rgba(17,26,43,.8);color:var(--muted);font-size:12px
            }
            .sections{display:grid;gap:18px}
            .section{
              background:rgba(15,22,36,.84);border:1px solid var(--border);
              border-radius:20px;padding:18px;
            }
            .section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
            .section-head h3{margin:0;font-size:18px}
            .section-head span{color:var(--muted);font-size:12px}
            .endpoint{
              border:1px solid var(--border);border-radius:16px;background:var(--panel-2);
              overflow:hidden;margin-top:12px;
            }
            .endpoint summary{
              list-style:none;cursor:pointer;display:grid;grid-template-columns:auto 1fr auto;
              gap:14px;align-items:center;padding:16px 18px;
            }
            .endpoint summary::-webkit-details-marker{display:none}
            .endpoint-title{font-weight:700}
            .endpoint-path{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#cfe1ff}
            .endpoint-body{
              border-top:1px solid var(--border);
              padding:18px;
              display:grid;
              grid-template-columns:1.1fr .9fr;
              gap:16px;
            }
            .box{
              background:rgba(10,13,20,.75);
              border:1px solid var(--border);
              border-radius:14px;
              padding:14px;
            }
            .box h4{margin:0 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#b8c8e6}
            pre{
              margin:0;white-space:pre-wrap;word-break:break-word;
              font-size:12px;line-height:1.6;color:#d8e6ff;
            }
            .meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
            .meta span{
              padding:6px 10px;border-radius:999px;background:rgba(47,128,237,.12);
              color:#b9d7ff;font-size:12px;border:1px solid rgba(111,177,255,.16)
            }
            .footer-note{margin-top:18px;color:var(--muted);font-size:12px}
            @media (max-width: 1080px){
              .shell{grid-template-columns:1fr}
              .sidebar{position:relative;height:auto}
              .endpoint-body{grid-template-columns:1fr}
            }
            @media (max-width: 720px){
              .content{padding:16px}
              .hero{padding:18px;border-radius:18px;flex-direction:column}
              .hero h2{font-size:22px}
              .endpoint summary{grid-template-columns:auto 1fr;align-items:start}
              .endpoint-path{grid-column:1 / -1}
            }
          </style>
        </head>
        <body>
          <div class="shell">
            <aside class="sidebar">
              <div class="brand">
                <div class="brand-badge">BCB</div>
                <div>
                  <h1>BCB API</h1>
                  <p>Documentação interativa</p>
                </div>
              </div>
              <input id="search" class="search" placeholder="Buscar endpoint..." />
              ${Object.entries(grouped)
                .map(
                  ([groupName, items]) => `
                    <div class="group">
                      <p class="group-title">${groupName}</p>
                      ${items
                        .map(
                          (item) => `
                            <button class="nav-item" data-target="${item.method}-${item.path}">
                              <span>${item.path}</span>
                              <small>${item.method.toUpperCase()}</small>
                            </button>
                          `,
                        )
                        .join('')}
                    </div>
                  `,
                )
                .join('')}
            </aside>
            <main class="content">
              <section class="hero">
                <div>
                  <h2>BCB API Docs</h2>
                  <p>
                    Base de documentação para autenticação, clientes, conversas, mensagens e fila.
                  </p>
                  <div class="meta">
                    <span>${Object.keys(openApiDocument.paths).length} rotas</span>
                    <span>Fastify + PostgreSQL</span>
                  </div>
                </div>
                <div class="hero-actions">
                  <a class="btn primary" href="/docs/openapi.json" target="_blank" rel="noreferrer">OpenAPI JSON</a>
                  <button class="btn" id="expandAll" type="button">Expandir tudo</button>
                  <button class="btn" id="collapseAll" type="button">Recolher tudo</button>
                </div>
              </section>

              <div class="sections">
                ${Object.entries(grouped)
                  .map(
                    ([groupName, items]) => `
                      <section class="section" data-section="${groupName}">
                        <div class="section-head">
                          <h3>${groupName}</h3>
                          <span>${items.length} endpoint(s)</span>
                        </div>
                        ${items
                          .map(
                            (item) => `
                              <details class="endpoint" data-endpoint="${item.method}-${item.path}">
                                <summary>
                                  <span class="method-pill" style="background:${methodColors[item.method] ?? '#64748b'}">${item.method}</span>
                                  <div>
                                    <div class="endpoint-title">${item.summary}</div>
                                    <div class="endpoint-path">${item.path}</div>
                                  </div>
                                  <span class="chip">${groupName}</span>
                                </summary>
                                <div class="endpoint-body">
                                  <div class="box">
                                    <h4>Uso</h4>
                                    <pre>${item.summary}</pre>
                                  </div>
                                  <div class="box">
                                    <h4>Exemplo rápido</h4>
                                    <pre>${toCurl(item.method, item.path)}</pre>
                                  </div>
                                  <div class="box">
                                    <h4>Exemplo padrão</h4>
                                    <pre>${mockExampleForPath(item.method, item.path)}</pre>
                                  </div>
                                </div>
                              </details>
                            `,
                          )
                          .join('')}
                      </section>
                    `,
                  )
                  .join('')}
              </div>
            </main>
          </div>
          <script>
            const search = document.getElementById('search');
            const endpoints = [...document.querySelectorAll('.endpoint')];
            const navItems = [...document.querySelectorAll('.nav-item')];
            const expandAll = document.getElementById('expandAll');
            const collapseAll = document.getElementById('collapseAll');

            const syncFilter = () => {
              const value = (search.value || '').trim().toLowerCase();
              endpoints.forEach((endpoint) => {
                const target = endpoint.getAttribute('data-endpoint') || '';
                const visible = !value || target.toLowerCase().includes(value);
                endpoint.style.display = visible ? '' : 'none';
              });
              navItems.forEach((item) => {
                const target = item.getAttribute('data-target') || '';
                item.style.display = !value || target.toLowerCase().includes(value) ? '' : 'none';
              });
            };

            search.addEventListener('input', syncFilter);

            navItems.forEach((item) => {
              item.addEventListener('click', () => {
                const target = item.getAttribute('data-target');
                const endpoint = document.querySelector(\`.endpoint[data-endpoint="\${target}"]\`);
                if (!endpoint) return;
                endpoint.open = true;
                endpoint.scrollIntoView({ behavior: 'smooth', block: 'start' });
              });
            });

            expandAll.addEventListener('click', () => endpoints.forEach((endpoint) => endpoint.open = true));
            collapseAll.addEventListener('click', () => endpoints.forEach((endpoint) => endpoint.open = false));
          </script>
        </body>
      </html>
    `);
  });
};
