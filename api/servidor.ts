import { createSign } from 'node:crypto';
import {
  SHARDS_COLLECTION,
  createRateLimiter,
  findExact,
  isValidNameQuery,
  normalizeName,
  shardOf,
  type ServidorRow,
} from '../shared/servidorLookup';

// Consulta de UM servidor por nome completo exato. Não lista nem faz busca parcial.
// A base fica no Firestore (regras fechadas ao cliente), lida só aqui com conta de serviço.
// Env: FIREBASE_SERVICE_ACCOUNT (JSON da conta de serviço com leitura no Firestore).

const allowed = createRateLimiter(15, 60_000);
let cachedToken: { value: string; exp: number } | null = null;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function getAccessToken(sa: { client_email: string; private_key: string }): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.value;
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const iat = Math.floor(Date.now() / 1000);
  const unsigned =
    b64({ alg: 'RS256', typ: 'JWT' }) +
    '.' +
    b64({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      iat,
      exp: iat + 3600,
    });
  const signature = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, exp: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

async function loadShard(shard: number): Promise<ServidorRow[]> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT ausente');
  const sa = JSON.parse(raw) as { client_email: string; private_key: string; project_id: string };
  const token = await getAccessToken(sa);
  const url = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents/${SHARDS_COLLECTION}/${shard}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`firestore ${res.status}`);
  const doc = (await res.json()) as { fields?: { j?: { stringValue?: string } } };
  return JSON.parse(doc.fields?.j?.stringValue ?? '[]') as ServidorRow[];
}

export async function handleServidorRequest(request: Request): Promise<Response> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'desconhecido';
  if (!allowed(ip)) return json({ error: 'Muitas consultas. Aguarde um minuto.' }, 429);

  const nome = normalizeName(new URL(request.url).searchParams.get('nome') ?? '');
  if (!isValidNameQuery(nome)) return json({ error: 'Informe o nome completo.' }, 400);

  try {
    const matches = findExact(await loadShard(shardOf(nome)), nome);
    return json({ matches });
  } catch (error) {
    // Sem dado pessoal no log: só a mensagem de erro.
    console.error('servidor lookup_failed', error instanceof Error ? error.message : 'erro');
    return json({ error: 'Consulta indisponível no momento.' }, 502);
  }
}

export async function GET(request: Request) {
  return handleServidorRequest(request);
}

export default {
  fetch(request: Request) {
    return handleServidorRequest(request);
  },
};
