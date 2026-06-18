export type PlanType = 'prepaid' | 'postpaid';
export type MessagePriority = 'normal' | 'urgent';
export type MessageStatus = 'queued' | 'processing' | 'sent' | 'failed';

export type Client = {
  id: string;
  name: string;
  documentId: string;
  planType: PlanType;
  balance: number;
  active: boolean;
};

export type Conversation = {
  id: string;
  clientId: string;
  title: string;
  status: 'open' | 'closed';
};

export type Message = {
  id: string;
  conversationId: string;
  clientId: string;
  sender: 'company' | 'recipient';
  content: string;
  priority: MessagePriority;
  cost: number;
  status: MessageStatus;
};

export const clients: Client[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Empresa Aurora',
    documentId: '12345678909',
    planType: 'prepaid',
    balance: 258.75,
    active: true,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Distribuidora Vale',
    documentId: '11222333000181',
    planType: 'postpaid',
    balance: 780,
    active: true,
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Clínica Horizonte',
    documentId: '99887766000144',
    planType: 'prepaid',
    balance: 96.5,
    active: true,
  },
];

export const conversations: Conversation[] = [
  { id: '44444444-4444-4444-8444-444444444444', clientId: '11111111-1111-4111-8111-111111111111', title: 'Financeiro', status: 'open' },
  { id: '55555555-5555-4555-8555-555555555555', clientId: '11111111-1111-4111-8111-111111111111', title: 'Cobrança', status: 'open' },
  { id: '66666666-6666-4666-8666-666666666666', clientId: '22222222-2222-4222-8222-222222222222', title: 'Operações', status: 'open' },
  { id: '77777777-7777-4777-8777-777777777777', clientId: '33333333-3333-4333-8333-333333333333', title: 'Suporte', status: 'closed' },
];

export const messages: Message[] = [
  {
    id: '88888888-8888-4888-8888-888888888888',
    conversationId: '44444444-4444-4444-8444-444444444444',
    clientId: '11111111-1111-4111-8111-111111111111',
    sender: 'company',
    content: 'Preciso confirmar o envio da segunda via.',
    priority: 'normal',
    cost: 0.25,
    status: 'queued',
  },
  {
    id: '99999999-9999-4999-8999-999999999999',
    conversationId: '55555555-5555-4555-8555-555555555555',
    clientId: '11111111-1111-4111-8111-111111111111',
    sender: 'company',
    content: 'Chamar o cliente principal para validação ainda hoje.',
    priority: 'urgent',
    cost: 0.5,
    status: 'queued',
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    conversationId: '66666666-6666-4666-8666-666666666666',
    clientId: '22222222-2222-4222-8222-222222222222',
    sender: 'company',
    content: 'Mensagem de rotina para atualização de status.',
    priority: 'normal',
    cost: 0.25,
    status: 'sent',
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    conversationId: '77777777-7777-4777-8777-777777777777',
    clientId: '33333333-3333-4333-8333-333333333333',
    sender: 'company',
    content: 'Retorno urgente aguardando aceite.',
    priority: 'urgent',
    cost: 0.5,
    status: 'queued',
  },
];
