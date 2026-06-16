'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { Client, DashboardSnapshot, MessagePriority } from '@/lib/bcb';
import { formatDocumentId, formatMoney } from '@/lib/bcb';

const sessionStorageKey = 'bcb_session';

type DashboardResponse = DashboardSnapshot & { error?: string };
type LoggedClient = Client;

export default function DashboardPage() {
  const router = useRouter();
  const [client, setClient] = useState<LoggedClient | null>(null);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeConversationId, setActiveConversationId] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<MessagePriority>('normal');

  useEffect(() => {
    const savedClient = localStorage.getItem(sessionStorageKey);
    if (!savedClient) { router.replace('/'); return; }
    try {
      setClient(JSON.parse(savedClient) as LoggedClient);
    } catch {
      localStorage.removeItem(sessionStorageKey);
      router.replace('/');
    }
  }, [router]);

  useEffect(() => {
    if (!client) return;
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/dashboard?documentId=${encodeURIComponent(client.documentId)}`, { cache: 'no-store' });
        const data = (await response.json()) as DashboardResponse;
        if (!response.ok) throw new Error(data.error || 'Não foi possível carregar o dashboard.');
        setSnapshot(data);
        setActiveConversationId((cur) => {
          if (cur && data.conversations.some((c) => c.id === cur)) return cur;
          const first = data.conversations.find((c) => c.status === 'open');
          return first?.id ?? data.conversations[0]?.id ?? '';
        });
        setError('');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Falha inesperada ao carregar o dashboard.');
      } finally {
        setLoading(false);
      }
    };
    void loadDashboard();
  }, [client]);

  const activeConversation = useMemo(
    () => snapshot?.conversations.find((c) => c.id === activeConversationId) ?? null,
    [activeConversationId, snapshot],
  );

  const filteredConversations = useMemo(() => {
    const base = snapshot?.conversations ?? [];
    if (!search.trim()) return base;
    return base.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));
  }, [search, snapshot]);

  const conversationMessages = useMemo(
    () => (snapshot?.messages ?? []).filter((m) => m.conversationId === activeConversationId),
    [activeConversationId, snapshot],
  );

  const queuedMessages = snapshot?.queue ?? [];

  const handleLogout = () => {
    localStorage.removeItem(sessionStorageKey);
    router.push('/');
  };

  const refreshDashboard = async () => {
    if (!client) return;
    const response = await fetch(`/api/dashboard?documentId=${encodeURIComponent(client.documentId)}`, { cache: 'no-store' });
    const data = (await response.json()) as DashboardResponse;
    if (!response.ok) throw new Error(data.error || 'Não foi possível atualizar o dashboard.');
    setSnapshot(data);
    setClient(data.client);
    localStorage.setItem(sessionStorageKey, JSON.stringify(data.client));
  };

  const handleSendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client || !activeConversationId || !message.trim()) return;
    setSending(true);
    setError('');
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: client.documentId, conversationId: activeConversationId, content: message.trim(), priority }),
      });
      const data = await response.json().catch(() => ({ error: 'Falha ao enviar mensagem.' }));
      if (!response.ok) throw new Error(data.error || 'Não foi possível enviar a mensagem.');
      setMessage('');
      await refreshDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha inesperada ao enviar mensagem.');
    } finally {
      setSending(false);
    }
  };

  // ─── Loading skeleton ────────────────────────────────────────────────────────
  if (!client || loading) {
    return (
      <main className="h-screen bg-[#0A0D14] flex items-center justify-center p-4">
        <div className="w-full max-w-5xl bg-[#0E1320] border border-[#1E2535] rounded-2xl p-8 space-y-4">
          <div className="h-4 w-32 bg-[#1E2535] rounded animate-pulse" />
          <div className="h-20 bg-[#1E2535] rounded-xl animate-pulse" />
          <div className="h-64 bg-[#1E2535] rounded-xl animate-pulse" />
        </div>
      </main>
    );
  }

  const urgentQueuedMessages = queuedMessages.filter((m) => m.priority === 'urgent');

  return (
    <main className="h-screen bg-[#0A0D14] flex overflow-hidden">
      {/* ── Outer shell ── */}
      <div className="w-full flex border-t border-[#1E2535] overflow-hidden" style={{ height: '100vh' }}>
        {/* ════════════════════════════════════════════
            SIDEBAR
        ════════════════════════════════════════════ */}
        <aside className="w-64 min-w-[256px] bg-[#0E1320] border-r border-[#1E2535] flex flex-col overflow-hidden">

          {/* Client info */}
          <div className="px-5 py-5 border-b border-[#1E2535]">
            <span className="inline-flex items-center gap-1.5 bg-[#0A2A1A] text-[#0DDB7A] text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-md mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0DDB7A]" />
              {client.planType === 'prepaid' ? 'Pré-pago' : 'Pós-pago'}
            </span>
            <p className="text-[#E8F0FF] text-[17px] font-semibold tracking-tight leading-tight">{client.name}</p>
            <p className="text-[#556080] text-[12px] font-mono mt-1">{formatDocumentId(client.documentId)}</p>
          </div>

          {/* Balance */}
          <div className="mx-4 mt-4 bg-[#0A0D14] border border-[#1E2535] rounded-xl p-4">
            <p className="text-[10px] text-[#556080] font-semibold tracking-widest uppercase">Saldo disponível</p>
            <p className="text-[#E8F0FF] text-2xl font-semibold tracking-tight mt-1.5">
              {formatMoney(snapshot?.summary.balance ?? client.balance)}
            </p>
            <p className="text-[11px] text-[#445066] mt-1.5 leading-relaxed">
              Normal R$ 0,25 · Urgente R$ 0,50
            </p>
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-2 px-4 py-3">
            {[
              { label: 'Conversas', value: snapshot?.summary.openConversations ?? 0, color: 'text-[#C8D8F0]' },
              { label: 'Fila', value: queuedMessages.length, color: 'text-[#C8D8F0]' },
              { label: 'Urgentes', value: urgentQueuedMessages.length, color: urgentQueuedMessages.length > 0 ? 'text-[#FF6B6B]' : 'text-[#C8D8F0]' },
              { label: 'Custo fila', value: formatMoney(snapshot?.summary.totalQueueCost ?? 0), color: 'text-[#FAC775]' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#0A0D14] border border-[#1E2535] rounded-lg px-3 py-2.5">
                <p className="text-[10px] text-[#556080] font-semibold tracking-widest uppercase">{label}</p>
                <p className={`text-base font-semibold mt-1 ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="px-4 pb-2">
            <input
              className="w-full bg-[#0A0D14] border border-[#1E2535] rounded-lg px-3 py-2 text-[13px] text-[#E8F0FF] placeholder-[#334055] outline-none focus:border-[#1B6FFF] transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversa..."
            />
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto px-2.5 pb-2 space-y-1">
            {filteredConversations.map((conversation) => {
              const qCount = queuedMessages.filter((m) => m.conversationId === conversation.id).length;
              const isActive = activeConversationId === conversation.id;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setActiveConversationId(conversation.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-[#0D1E3A] border-[#1B6FFF]/30'
                      : 'bg-transparent border-transparent hover:bg-[#0E1320] hover:border-[#1E2535]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-[#C8D8F0] truncate">{conversation.title}</span>
                    <span
                      className={`flex-shrink-0 text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded ${
                        conversation.status === 'open'
                          ? 'bg-[#0A2A1A] text-[#0DDB7A]'
                          : 'bg-[#1A1A0A] text-[#FAC775]'
                      }`}
                    >
                      {conversation.status === 'open' ? 'Aberta' : 'Fechada'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#445066] mt-1">{qCount} mensagens na fila</p>
                </button>
              );
            })}
          </div>

          {/* Logout */}
          <div className="px-4 py-3 border-t border-[#1E2535]">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full bg-transparent border border-[#3A1E1E] text-[#FF6B6B] text-[13px] font-medium py-2 rounded-lg hover:bg-[#1A0D0D] transition-colors"
            >
              Sair da conta
            </button>
          </div>
        </aside>

        {/* ════════════════════════════════════════════
            MAIN CONTENT
        ════════════════════════════════════════════ */}
        <section className="flex-1 flex flex-col min-w-0 bg-[#0A0D14]">

          {/* Header */}
          <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[#1E2535] flex-shrink-0">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-semibold text-[#1B6FFF] tracking-widest uppercase">
                <span className="w-3.5 h-px bg-[#1B6FFF]" />
                Dashboard operacional
              </p>
              <h2 className="text-[20px] font-semibold text-[#E8F0FF] tracking-tight mt-1.5">
                {activeConversation ? activeConversation.title : 'Selecione uma conversa'}
              </h2>
              <p className="text-[12px] text-[#556080] mt-1">
                Fila ativa · custo e prioridade em tempo real
              </p>
            </div>
            <div className="bg-[#0D1E3A] border border-[#1B6FFF]/20 rounded-xl px-4 py-3 text-right flex-shrink-0">
              <p className="text-[18px] font-semibold text-[#1B6FFF]">{snapshot?.summary.queuedMessages ?? 0}</p>
              <p className="text-[10px] text-[#556080] uppercase tracking-widest mt-0.5">na fila</p>
            </div>
          </header>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3 min-h-0">
            {error && (
              <div className="flex items-center gap-2 bg-[#1A0D0D] border border-[#5A1E1E] rounded-lg px-4 py-3 text-[#FF6B6B] text-sm" role="alert">
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="#FF6B6B" strokeWidth="1.5"/>
                  <path d="M8 5v3.5M8 10.5v.5" stroke="#FF6B6B" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            )}

            {activeConversation ? (
              conversationMessages.length > 0 ? (
                conversationMessages.map((item) => {
                  const isUrgent = item.priority === 'urgent';
                  return (
                    <article
                      key={item.id}
                      className={`max-w-[88%] bg-[#111622] border rounded-xl px-4 py-3.5 ${
                        isUrgent ? 'border-[#3A1E1E]' : 'border-[#1E2535]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span
                          className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded ${
                            isUrgent ? 'bg-[#1A0D0D] text-[#FF6B6B]' : 'bg-[#0A1A2A] text-[#6699CC]'
                          }`}
                        >
                          {isUrgent ? 'Urgente' : 'Normal'}
                        </span>
                        <span className="text-[12px] text-[#556080] font-mono">{formatMoney(item.cost)}</span>
                      </div>
                      <p className="text-[14px] text-[#C8D8F0] leading-relaxed">{item.content}</p>
                      <p className="text-[11px] text-[#445066] mt-2">
                        {new Date(item.queuedAt).toLocaleString('pt-BR')}
                      </p>
                    </article>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-16">
                  <div className="w-10 h-10 border border-[#1E2535] rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#445066]" viewBox="0 0 20 20" fill="none">
                      <path d="M4 4h12v9a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M8 15l2 2 2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p className="text-[14px] font-semibold text-[#556080]">Nenhuma mensagem ainda</p>
                  <p className="text-[12px] text-[#3A4A60] leading-relaxed max-w-[200px]">
                    Envie a primeira mensagem para iniciar a fila.
                  </p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-16">
                <div className="w-10 h-10 border border-[#1E2535] rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#445066]" viewBox="0 0 20 20" fill="none">
                    <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                    <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                    <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                    <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                  </svg>
                </div>
                <p className="text-[14px] font-semibold text-[#556080]">Escolha uma conversa</p>
                <p className="text-[12px] text-[#3A4A60] leading-relaxed max-w-[200px]">
                  Selecione uma conversa na lateral para ver o histórico e enviar mensagens.
                </p>
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={handleSendMessage}
            className="px-6 py-4 border-t border-[#1E2535] flex-shrink-0 space-y-2.5"
          >
            <div className="flex gap-2.5 items-center">
              <input
                className="flex-1 bg-[#111622] border border-[#1E2535] rounded-lg px-3.5 py-2.5 text-[14px] text-[#E8F0FF] placeholder-[#334055] outline-none focus:border-[#1B6FFF] transition-colors disabled:opacity-40"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escreva a mensagem para entrar na fila"
                disabled={!activeConversation}
              />

              {/* Priority toggle */}
              <div className="flex bg-[#0A0D14] border border-[#1E2535] rounded-lg p-0.5 gap-0.5 flex-shrink-0">
                <button
                  type="button"
                  disabled={!activeConversation}
                  onClick={() => setPriority('normal')}
                  className={`px-3 py-2 rounded-md text-[12px] font-medium transition-all disabled:opacity-40 flex flex-col items-center leading-tight ${
                    priority === 'normal'
                      ? 'bg-[#0A1A2A] text-[#6699CC]'
                      : 'bg-transparent text-[#556080] hover:text-[#8899BB]'
                  }`}
                >
                  <span>Normal</span>
                  <span className="opacity-60 text-[10px] font-mono">R$0,25</span>
                </button>
                <button
                  type="button"
                  disabled={!activeConversation}
                  onClick={() => setPriority('urgent')}
                  className={`px-3 py-2 rounded-md text-[12px] font-medium transition-all disabled:opacity-40 flex flex-col items-center leading-tight ${
                    priority === 'urgent'
                      ? 'bg-[#1A0D0D] text-[#FF6B6B]'
                      : 'bg-transparent text-[#556080] hover:text-[#8899BB]'
                  }`}
                >
                  <span>Urgente</span>
                  <span className="opacity-60 text-[10px] font-mono">R$0,50</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={sending || !activeConversation}
                className="bg-[#1B6FFF] hover:bg-[#2E7AFF] disabled:bg-[#1B3566] disabled:text-[#4A6699] text-white text-[13px] font-semibold px-5 py-2.5 rounded-lg transition-colors flex-shrink-0"
              >
                {sending ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
            <p className="text-[11px] text-[#3A4A60]">
              A mensagem é registrada no backend e entra na fila automaticamente.
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
