import { NextResponse } from 'next/server';

import { backendBaseUrl } from '@/lib/backend';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const response = await fetch(`${backendBaseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({ error: 'Falha ao autenticar.' }));

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Backend indisponível.' }, { status: 502 });
  }
}
