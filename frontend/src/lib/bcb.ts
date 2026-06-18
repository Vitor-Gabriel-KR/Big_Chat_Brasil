export type PlanType = 'prepaid' | 'postpaid';
export type MessagePriority = 'normal' | 'urgent';
export type MessageStatus = 'queued' | 'processing' | 'sent' | 'failed';
export type MessageSender = 'company' | 'recipient';

export type Client = {
  id: string;
  name: string;
  documentId: string;
  planType: PlanType;
  balance: number;
  creditLimit: number | null;
  monthlyConsumed: number;
  billingCycleAt: string;
  active: boolean;
};

export type Conversation = {
  id: string;
  clientId: string;
  title: string;
  status: 'open' | 'closed';
  lastMessageContent: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
};

export type Message = {
  id: string;
  conversationId: string;
  clientId: string;
  sender: MessageSender;
  content: string;
  priority: MessagePriority;
  cost: number;
  status: MessageStatus;
  queuedAt: string;
  processedAt: string | null;
  createdAt: string;
  conversationTitle: string;
};

export type DashboardSnapshot = {
  client: Client;
  summary: {
    openConversations: number;
    queuedMessages: number;
    urgentMessages: number;
    totalQueueCost: number;
    balance: number;
    creditLimit: number | null;
    monthlyConsumed: number;
  };
  conversations: Conversation[];
  messages: Message[];
  queue: Message[];
};

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

export const detectDocumentType = (value: string) => {
  const digits = normalizeDocumentId(value);

  if (digits.length === 11) {
    return 'CPF' as const;
  }

  if (digits.length === 14) {
    return 'CNPJ' as const;
  }

  return null;
};

export const formatMoney = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
