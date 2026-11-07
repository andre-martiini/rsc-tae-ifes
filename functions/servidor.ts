import {
  SHARDS_COLLECTION,
  createRateLimiter,
  findExact,
  isValidNameQuery,
  normalizeName,
  shardOf,
  type ServidorRow,
} from '../shared/servidorLookup';

// Cloud Function (gen2) no projeto comissao-rsc-tae: consulta UM servidor por nome completo exato.
// Sem chave: roda como a conta de serviço rsc-servidor-lookup (só leitura no Firestore) e pega o
// token do metadata server. Deploy: npm run deploy:servidor.

const PROJECT = 'comissao-rsc-tae';
const ORIGIN_OK = /^(https:\/\/rsc-tae-ifes(-[a-z0-9-]+)?\.vercel\.app|http:\/\/localhost:\d+)$/;
const allowed = createRateLimiter(15, 60_000);
let cachedToken: { value: string; exp: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.value;
  const res = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' } },
  );
  if (!res.ok) throw new Error(`token ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, exp: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

async function loadShard(shard: number): Promise<ServidorRow[]> {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${SHARDS_COLLECTION}/${shard}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${await getAccessToken()}` } });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`firestore ${res.status}`);
  const doc = (await res.json()) as { fields?: { j?: { stringValue?: string } } };
  return JSON.parse(doc.fields?.j?.stringValue ?? '[]') as ServidorRow[];
}

/** O front do Google acrescenta o IP real ao FIM do X-Forwarded-For; o início pode ser forjado pelo cliente. */
export function clientIp(xff: string | undefined): string {
  return xff?.split(',').pop()?.trim() || 'desconhecido';
}

interface Req { method: string; query: Record<string, unknown>; get(name: string): string | undefined }
interface Res {
  set(name: string, value: string): Res;
  status(code: number): Res;
  json(body: unknown): void;
  end(): void;
}

export async function consultarServidorBase(req: Req, res: Res, load = loadShard): Promise<void> {
  const origin = req.get('origin') ?? '';
  if (ORIGIN_OK.test(origin)) res.set('Access-Control-Allow-Origin', origin);
  res.set('Vary', 'Origin').set('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.set('Access-Control-Allow-Methods', 'GET').status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });

  if (!allowed(clientIp(req.get('x-forwarded-for')))) {
    return res.status(429).json({ error: 'Muitas consultas. Aguarde um minuto.' });
  }
  const nome = normalizeName(typeof req.query.nome === 'string' ? req.query.nome : '');
  if (!isValidNameQuery(nome)) return res.status(400).json({ error: 'Informe o nome completo.' });

  try {
    res.json({ matches: findExact(await load(shardOf(nome)), nome) });
  } catch (error) {
    // Sem dado pessoal no log: só a mensagem de erro.
    console.error('servidor lookup_failed', error instanceof Error ? error.message : 'erro');
    res.status(502).json({ error: 'Consulta indisponível no momento.' });
  }
}
