# Big Chat Brasil (BCB)

Sistema de mensageria corporativa desenvolvido com **Fastify**, **Next.js** e **PostgreSQL**, responsável pelo gerenciamento de conversas, envio de mensagens e controle financeiro baseado em filas de processamento.

---
## 📋 Documentação e Arquitetura (Notion)
Confira os detalhes técnicos e o planejamento do projeto:
- 📑 [Visão Geral do Projeto](https://www.notion.so/Projeto-Big-Chat-Brasil-37f363d155dc8043934ed14744a79c63)
- 🏗️ [Explicação da Arquitetura](https://www.notion.so/Explica-o-da-arquitetura-381363d155dc80d3b017f5a57d4103da)
- 🛠️ [Explicação da Stack](https://www.notion.so/Explica-o-da-Stack-37f363d155dc80ec8c3de417206c340b)
- 🔌 [Documentação de Endpoints](https://www.notion.so/Documenta-o-de-Endpoints-383363d155dc8043b9d7f0e654db0de4)

---

# Como Executar

## Pré-requisitos

- Docker
- Docker Compose

## Inicialização

```bash
docker compose up --build
```
---
# Informações de acesso ao banco

Utilize as credenciais abaixo para conectar ao banco através do **pgAdmin**, **DBeaver**, extensão do **VS Code** ou qualquer outro cliente PostgreSQL.

> ⚠️ O acesso estará disponível apenas quando o container do PostgreSQL estiver em execução.

| Configuração | Valor |
|-------------|--------|
| Host | localhost |
| Porta | 5433 |
| Banco de Dados | bcb |
| Usuário | bcb_user |
| Senha | bcb_password |


Após a inicialização, os serviços estarão disponíveis em:

| Serviço | URL |
|----------|------|
| Frontend | http://localhost:3000 |
| API | http://localhost:3333 |
| Health Check | http://localhost:3333/health |
| Swagger | http://localhost:3333/docs |

---

# Preview do projeto

<img width="1876" height="926" alt="image" src="https://github.com/user-attachments/assets/01b36fa1-317c-4d3f-a143-bcd503aa177a" />

<img width="1857" height="924" alt="image" src="https://github.com/user-attachments/assets/d0e08bee-3100-4e4a-87af-e2962258ae76" />

---

# Credenciais de Teste

Documentos mocados para autenticação:

### Pessoa Física

```text
123.456.789-09
```

### Pessoa Jurídica

```text
11.222.333/0001-81
```

---

# Fluxo da Aplicação

1. Usuário realiza login utilizando CPF ou CNPJ.
2. Backend valida o documento informado.
3. Sistema retorna os dados do cliente.
4. Dashboard é carregado com conversas e saldo disponível.
5. Usuário envia mensagens.
6. O sistema registra a mensagem na fila.
7. O valor correspondente é debitado do saldo do cliente.
8. Toda movimentação financeira é registrada para auditoria.

---

# Estrutura do Banco de Dados

O script `database/init.sql` é responsável por criar e popular as tabelas:

- `clients`
- `conversations`
- `messages`
- `financial_transactions`

---

# Sistema de Filas

Cada mensagem enviada gera um custo financeiro conforme sua prioridade.

| Prioridade | Custo |
|------------|--------|
| Normal | R$ 0,25 |
| Urgente | R$ 0,50 |

---

# Estrutura do Projeto

```text
.
├── backend
├── frontend
├── database
│   └── init.sql
├── docker-compose.yml
└── README.md
```
