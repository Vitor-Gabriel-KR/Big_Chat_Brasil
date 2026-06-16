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
  content: string;
  priority: MessagePriority;
  cost: number;
  status: MessageStatus;
  queuedAt: string;
  processedAt: string | null;
  createdAt: string;
  conversationTitle: string;
};

export type LoginInput = {
  documentId: string;
  documentType: 'CPF' | 'CNPJ';
};

export type DashboardSnapshot = {
  client: Client;
  summary: {
    openConversations: number;
    queuedMessages: number;
    urgentMessages: number;
    totalQueueCost: number;
    balance: number;
  };
  conversations: Conversation[];
  messages: Message[];
  queue: Message[];
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const normalizeDocumentId = (value: string) => value.replace(/\D/g, '');

export const formatDocumentId = (value: string) => {
  const digits = normalizeDocumentId(value);

  if (digits.length <= 11) {
    return digits
      .slice(0, 11)
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  }

  return digits
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
};

export const detectDocumentType = (value: string): LoginInput['documentType'] | null => {
  const digits = normalizeDocumentId(value);

  if (digits.length === 11) {
    return 'CPF';
  }

  if (digits.length === 14) {
    return 'CNPJ';
  }

  return null;
};

export const toMoney = (value: string | number) => Number(value);

export const formatMoney = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

export const messageCostByPriority = (priority: MessagePriority) => (priority === 'urgent' ? 0.5 : 0.25);

