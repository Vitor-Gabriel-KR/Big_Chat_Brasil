'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { detectDocumentType, formatDocumentId, normalizeDocumentId } from '@/lib/bcb';

type LoginResponse = {
  client: {
    id: string;
    name: string;
    documentId: string;
    planType: 'prepaid' | 'postpaid';
    balance: number;
    active: boolean;
  };
  session: {
    documentId: string;
    documentType: 'CPF' | 'CNPJ';
  };
};

const sessionStorageKey = 'bcb_session';

export default function LoginPage() {
  const router = useRouter();
  const [documentType, setDocumentType] = useState<'CPF' | 'CNPJ'>('CPF');
  const [documentId, setDocumentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDocumentChange = (value: string) => {
    const digits = normalizeDocumentId(value);
    const limit = documentType === 'CPF' ? 11 : 14;
    setDocumentId(formatDocumentId(digits.slice(0, limit)));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const digits = normalizeDocumentId(documentId);
      const expectedLength = documentType === 'CPF' ? 11 : 14;

      if (digits.length !== expectedLength) {
        throw new Error(`Digite um ${documentType} válido.`);
      }

      const detectedType = detectDocumentType(digits);
      if (detectedType && detectedType !== documentType) {
        throw new Error(`O documento informado não é um ${documentType}.`);
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: digits, documentType }),
      });

      const data = (await response.json()) as LoginResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível autenticar.');
      }

      localStorage.setItem(sessionStorageKey, JSON.stringify(data.client));
      router.push('/dashboard');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Falha inesperada no login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-6 text-white font-sans selection:bg-blue-500/30">
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <section className="space-y-8">
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-widest">
            Big Chat Brasil
          </div>
          <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight">
            Entrada direta para a <br /> <span className="text-blue-500">operação.</span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-md">
            Acesse com CPF ou CNPJ e vá imediatamente para o dashboard com saldo, fila e conversas do cliente.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            {['Login', 'Fluxo', 'Fila', 'Base'].map((item) => (
              <div
                key={item}
                className="bg-[#151924] p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">{item}</div>
                <div className="text-sm mt-2 font-medium text-gray-200">Configurado</div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#151924] p-8 md:p-10 rounded-3xl border border-white/10 shadow-2xl">
          <h2 className="text-2xl font-semibold mb-2">Login do cliente</h2>
          <p className="text-gray-400 text-sm mb-8">Utilize seu documento cadastrado para prosseguir.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-2 bg-[#0B0F19] p-1.5 rounded-xl border border-white/5">
              {(['CPF', 'CNPJ'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setDocumentType(type);
                    setDocumentId('');
                    setError('');
                  }}
                  className={`py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    documentType === type
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                {documentType === 'CPF' ? 'CPF do cliente' : 'CNPJ da empresa'}
              </label>
              <input
                className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-blue-500 transition-all text-lg placeholder:text-gray-700"
                placeholder={documentType === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
                value={documentId}
                onChange={(event) => handleDocumentChange(event.target.value)}
              />
            </div>

            {error ? (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-xl font-medium">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
            >
              {loading ? 'Autenticando...' : 'Entrar no dashboard'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-gray-600">
              Exemplo cadastrado: <span className="text-gray-400 font-mono">123.456.789-09</span>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
