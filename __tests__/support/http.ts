import { NextRequest } from 'next/server';

export function makeJsonRequest(url: string, body: unknown, init?: RequestInit): NextRequest {
  return new NextRequest(
    new Request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      ...init,
    }),
  );
}
