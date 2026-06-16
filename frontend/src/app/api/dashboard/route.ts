import { NextResponse } from 'next/server';

import { backendBaseUrl } from '@/lib/backend';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId') ?? '';

    const response = await fetch(`${backendBaseUrl}/dashboard?documentId=${encodeURIComponent(documentId)}`, {
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({ error: 'Falha ao carregar dashboard.' }));

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Backend indisponível.' }, { status: 502 });
  }
}
