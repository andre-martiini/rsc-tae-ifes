/**
 * Carga única da base de servidores no Firestore (coleção fechada ao cliente).
 * Uso: npx tsx scripts/carregar-servidores.ts <caminho-do-csv> <projectId>
 * Usa o token do gcloud (conta com permissão no projeto). O CSV NÃO deve ficar no repositório.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { SHARDS_COLLECTION, SHARD_COUNT, normalizeName, shardOf, type ServidorRow } from '../shared/servidorLookup';

const [csvPath, projectId] = process.argv.slice(2);
if (!csvPath || !projectId) throw new Error('Uso: carregar-servidores.ts <csv> <projectId>');

const lines = readFileSync(csvPath, 'utf8').split(/\r?\n/);
const shards: ServidorRow[][] = Array.from({ length: SHARD_COUNT }, () => []);
for (const line of lines.slice(1)) {
  if (!line.trim()) continue;
  const p = line.split(',');
  if (p.length < 9) continue; // nomes não têm vírgula; linhas com aspas seriam descartadas
  const row: ServidorRow = {
    id: p[0], nome: p[1], matricula: p[2], descricao_cargo: p[3], classe_cargo: p[4],
    cod_org_lotacao: p[5], org_lotacao: p[6], tipo_vinculo: p[7], situacao_vinculo: p[8],
  };
  shards[shardOf(normalizeName(row.nome))].push(row);
}

const token = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
let total = 0;
for (let i = 0; i < SHARD_COUNT; i++) {
  if (shards[i].length === 0) continue;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${SHARDS_COLLECTION}/${i}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { j: { stringValue: JSON.stringify(shards[i]) } } }),
  });
  if (!res.ok) throw new Error(`shard ${i}: ${res.status} ${await res.text()}`);
  total += shards[i].length;
}
console.log(`Carregados ${total} registros em ${SHARD_COUNT} shards.`);
