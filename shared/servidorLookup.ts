/** Lógica pura da consulta de servidor (usada pela função serverless, pelo script de carga e pelos testes). */

export const SHARD_COUNT = 1024;
export const SHARDS_COLLECTION = 'servidores_base_shards';
export const MAX_MATCHES = 5;

export function normalizeName(text?: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/** Consulta só por nome completo: mínimo de duas palavras, sem busca parcial. */
export function isValidNameQuery(normalized: string): boolean {
  return normalized.length >= 8 && normalized.split(' ').length >= 2;
}

/** FNV-1a: determinístico, igual no script de carga e na função. */
export function shardOf(normalized: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % SHARD_COUNT;
}

export interface ServidorRow {
  id: string;
  nome: string;
  matricula: string; // já mascarada na fonte (ex.: 232****)
  descricao_cargo: string;
  classe_cargo: string;
  cod_org_lotacao: string;
  org_lotacao: string;
  tipo_vinculo: string;
  situacao_vinculo: string;
}

export function findExact(rows: ServidorRow[], normalized: string): ServidorRow[] {
  return rows.filter((r) => normalizeName(r.nome) === normalized).slice(0, MAX_MATCHES);
}

/** Limite por IP em memória da instância. ponytail: não é global entre instâncias; trocar por Upstash/Vercel Firewall se houver abuso. */
export function createRateLimiter(max: number, windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, number[]>();
  return (key: string): boolean => {
    const t = now();
    const recent = (hits.get(key) ?? []).filter((x) => t - x < windowMs);
    if (recent.length >= max) {
      hits.set(key, recent);
      return false;
    }
    recent.push(t);
    hits.set(key, recent);
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (t - v[v.length - 1] >= windowMs) hits.delete(k);
    }
    return true;
  };
}
