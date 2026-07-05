/**
 * Exporta o rol normativo do RSC-PCCTAE (Decreto nº 13.048/2026) para um
 * JSON canônico, consumido também pelo sistema Analisador de Processos RSC.
 *
 * Uso:
 *   npx tsx scripts/export-rol.ts           # (re)gera shared/rol-rsc-pcctae-2026.json
 *   npx tsx scripts/export-rol.ts --check   # falha (exit 1) se o JSON commitado divergir do código
 *
 * Sempre que o rol em src/data/normative/rsc-pcctae-2026.ts mudar, rode o
 * export e copie o arquivo gerado para o repositório do Analisador em
 * src/utils/rol-rsc-pcctae-2026.json — os dois sistemas devem usar o mesmo rol.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RSC_LEVELS, rolItensRSC, type ItemRSC } from '../src/data/normative/rsc-pcctae-2026';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.resolve(__dirname, '../shared/rol-rsc-pcctae-2026.json');

interface CanonicalItem {
  inciso: string;
  numero: number;
  descricao: string;
  unidade: string;
  pontos: number;
  /** Preenchido apenas nos itens do inciso V, que têm pontuação distinta para substituto. */
  pontosSubstituto: number | null;
}

/** Remove o sufixo " como titular"/" como substituto" mantendo a pontuação final. */
function stripRoleSuffix(descricao: string): string {
  return descricao.replace(/\s+como\s+(titular|substituto)\s*\.?$/i, '.').trim();
}

function buildCanonicalItems(itens: ItemRSC[]): CanonicalItem[] {
  const byKey = new Map<string, CanonicalItem>();

  for (const item of itens) {
    const key = `${item.inciso}-${item.numero}`;
    const isSubstituto = /como\s+substituto/i.test(item.descricao);
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, {
        inciso: item.inciso,
        numero: item.numero,
        descricao: stripRoleSuffix(item.descricao),
        unidade: item.unidade_medida,
        pontos: isSubstituto ? 0 : item.pontos_por_unidade,
        pontosSubstituto: isSubstituto ? item.pontos_por_unidade : null,
      });
      continue;
    }

    if (isSubstituto) {
      existing.pontosSubstituto = item.pontos_por_unidade;
    } else {
      existing.pontos = item.pontos_por_unidade;
      existing.descricao = stripRoleSuffix(item.descricao);
    }
  }

  const ordemIncisos = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  return Array.from(byKey.values()).sort((a, b) => {
    const incisoDiff = ordemIncisos.indexOf(a.inciso) - ordemIncisos.indexOf(b.inciso);
    return incisoDiff !== 0 ? incisoDiff : a.numero - b.numero;
  });
}

function buildCanonical() {
  return {
    $fonte: 'Decreto nº 13.048, de 3 de julho de 2026 (Anexos I a VI) — Lei nº 15.367/2026',
    $gerado_por: 'rsc-tae-ifes/scripts/export-rol.ts — NÃO editar manualmente; altere o rol em src/data/normative e re-exporte',
    niveis: RSC_LEVELS.map((level) => ({
      id: level.id,
      equivalencia: level.equivalencia,
      percentualIQ: level.percentualIncentivo,
      pontosMinimos: level.pontosMinimos,
      criteriosMinimos: level.itensMinimos,
      // Grupos de incisos obrigatórios: em cada grupo, pelo menos um critério
      // deferido deve pertencer a um dos incisos listados (art. 5º do decreto).
      incisosObrigatorios: level.incisosObrigatorios,
    })),
    itens: buildCanonicalItems(rolItensRSC),
  };
}

function main() {
  const checkMode = process.argv.includes('--check');
  const canonical = buildCanonical();
  const serialized = JSON.stringify(canonical, null, 2) + '\n';

  if (checkMode) {
    if (!fs.existsSync(OUTPUT_PATH)) {
      console.error(`✗ Arquivo canônico não encontrado: ${OUTPUT_PATH}. Rode: npm run export-rol`);
      process.exit(1);
    }
    const committed = fs.readFileSync(OUTPUT_PATH, 'utf-8');
    if (committed !== serialized) {
      console.error('✗ O rol em src/data/normative diverge de shared/rol-rsc-pcctae-2026.json.');
      console.error('  Rode `npm run export-rol` e copie o JSON atualizado para o Analisador.');
      process.exit(1);
    }
    console.log(`✓ Rol canônico consistente (${canonical.itens.length} itens, ${canonical.niveis.length} níveis).`);
    return;
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, serialized, 'utf-8');
  console.log(`✓ Gerado ${OUTPUT_PATH} (${canonical.itens.length} itens, ${canonical.niveis.length} níveis).`);
  console.log('  Copie para o Analisador: src/utils/rol-rsc-pcctae-2026.json');
}

main();
