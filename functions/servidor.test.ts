import { describe, expect, it } from 'vitest';
import { clientIp, consultarServidorBase } from './servidor';

function call(opts: { method?: string; nome?: string; origin?: string; xff?: string }, load = async () => []) {
  const headers: Record<string, string | undefined> = { origin: opts.origin, 'x-forwarded-for': opts.xff };
  const out: { status: number; body?: unknown; headers: Record<string, string> } = { status: 200, headers: {} };
  const res = {
    set(k: string, v: string) { out.headers[k] = v; return res; },
    status(c: number) { out.status = c; return res; },
    json(b: unknown) { out.body = b; },
    end() {},
  };
  return consultarServidorBase(
    { method: opts.method ?? 'GET', query: { nome: opts.nome }, get: (k) => headers[k.toLowerCase()] },
    res,
    load,
  ).then(() => out);
}

describe('função consultarServidorBase', () => {
  it('usa o último IP do X-Forwarded-For (o que o Google acrescenta)', () => {
    expect(clientIp('1.1.1.1, 9.9.9.9')).toBe('9.9.9.9');
    expect(clientIp(undefined)).toBe('desconhecido');
  });

  it('CORS só para o domínio do app', async () => {
    expect((await call({ method: 'OPTIONS', origin: 'https://rsc-tae-ifes.vercel.app' })).headers['Access-Control-Allow-Origin'])
      .toBe('https://rsc-tae-ifes.vercel.app');
    expect((await call({ method: 'OPTIONS', origin: 'https://rsc-tae-ifes.vercel.app.evil.com' })).headers['Access-Control-Allow-Origin'])
      .toBeUndefined();
  });

  it('recusa nome parcial e devolve o exato', async () => {
    expect((await call({ nome: 'joao', xff: '10.0.0.1' })).status).toBe(400);
    const row = { nome: 'João da Silva' } as never;
    const ok = await call({ nome: 'JOAO DA SILVA', xff: '10.0.0.1' }, async () => [row]);
    expect(ok.body).toEqual({ matches: [row] });
  });

  it('limita 15 consultas por minuto por IP', async () => {
    for (let i = 0; i < 15; i++) await call({ nome: 'joao da silva', xff: '10.0.0.2' });
    expect((await call({ nome: 'joao da silva', xff: '10.0.0.2' })).status).toBe(429);
    expect((await call({ nome: 'joao da silva', xff: '10.0.0.3' })).status).toBe(200);
  });

  it('falha do Firestore vira 502 sem detalhe', async () => {
    const r = await call({ nome: 'joao da silva', xff: '10.0.0.4' }, async () => { throw new Error('firestore 403'); });
    expect(r.status).toBe(502);
  });
});
