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
    id: 'client-1',
    name: 'Empresa Alpha',
    documentId: '12.345.678/0001-90',
    planType: 'prepaid',
    balance: 125.0,
    active: true,
  },
  {
    id: 'client-2',
    name: 'Comércio Beta',
    documentId: '98.765.432/0001-10',
    planType: 'postpaid',
    balance: 0,
    active: true,
  },
];

export const conversations: Conversation[] = [
  { id: 'conversation-1', clientId: 'client-1', title: 'Atendimento financeiro', status: 'open' },
  { id: 'conversation-2', clientId: 'client-2', title: 'Suporte comercial', status: 'open' },
];

export const messages: Message[] = [
  {
    id: 'message-1',
    conversationId: 'conversation-1',
    clientId: 'client-1',
    sender: 'company',
    content: 'Olá, preciso da segunda via do boleto.',
    priority: 'normal',
    cost: 0.25,
    status: 'queued',
  },
  {
    id: 'message-2',
    conversationId: 'conversation-2',
    clientId: 'client-2',
    sender: 'company',
    content: 'Cliente VIP aguardando retorno urgente.',
    priority: 'urgent',
    cost: 0.5,
    status: 'queued',
  },
];
