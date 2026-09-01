import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { EstadoAuditoria } from '../src/data/auditoria';
import { migrarAuditoriaVerificada } from '../src/lib/migrateAuditoriaVerificada';

const caminhoInformado = process.argv[2];
if (!caminhoInformado) {
  throw new Error('Uso: npx tsx scripts/migrate-auditoria-verificada.ts <auditoria.json>');
}

const caminho = resolve(caminhoInformado);
const original = JSON.parse(await readFile(caminho, 'utf8')) as EstadoAuditoria;
const { estado, stats } = migrarAuditoriaVerificada(original);

console.info('Contagem antes:', {
  totalOperacoes: stats.totalOperacoesAntes,
  sinalizarRejeitada: stats.sinalizacoesRejeitadasAntes,
});
console.info('Contagem depois:', {
  sinalizarRejeitada: stats.sinalizacoesRejeitadasDepois,
  sinalizarVerificada: stats.sinalizacoesVerificadasDepois,
  migradas: stats.migradas,
});

if (stats.migradas > 0) {
  await writeFile(caminho, `${JSON.stringify(estado, null, 2)}\n`, 'utf8');
}
