# Big Chat Brasil (BCB)

Sistema de mensageria para empresas com `Fastify`, `Next.js` e `PostgreSQL`.

## Run

```bash
docker compose up --build
```

## Acesso

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:3333/health`

## Login de teste mocados 

- CPF: `123.456.789-09`
- CNPJ: `11.222.333/0001-81`

## Fluxo

- O frontend faz login via CPF ou CNPJ.
- O backend valida o documento, retorna o cliente e monta o dashboard.
- O envio de mensagem debita o saldo e registra a fila no banco.

## Banco

O `database/init.sql` cria e preenche:

- `clients`
- `conversations`
- `messages`

## Fila

Custos fixos por prioridade:

- Normal: `R$ 0,25`
- Urgente: `R$ 0,50`
