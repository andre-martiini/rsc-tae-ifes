import JSZip from 'jszip';
import type { Documento, ItemRSC, Lancamento, ProcessoRSC, Servidor } from '../data/mock';
import { sumPointValues } from './points';
import {
  generateMemorialDescritivo,
  generateRequerimentoFormal,
  type ComprovacaoItemResumo,
  type NivelRsc,
} from './pdfGenerator';
import { unificarComprovantes } from './pdfUnificator';

export type { NivelRsc };

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sortDocuments(documents: Documento[]) {
  return [...documents].sort((a, b) => a.nome_arquivo.localeCompare(b.nome_arquivo));
}

function buildComprovacaoGroups(
  lancamentos: Lancamento[],
  itensRSC: ItemRSC[],
  documentos: Documento[],
): ComprovacaoItemResumo[] {
  const docsById = new Map(documentos.map((doc) => [doc.id, doc]));
  const grouped = new Map<string, Lancamento[]>();

  lancamentos.forEach((entry) => {
    const current = grouped.get(entry.item_rsc_id) ?? [];
    current.push(entry);
    grouped.set(entry.item_rsc_id, current);
  });

  return Array.from(grouped.entries())
    .map(([itemId, itemLancamentos]) => {
      const item = itensRSC.find((candidate) => candidate.id === itemId);
      if (!item) return null;

      const documentosDoItem = sortDocuments(
        Array.from(
          new Map(
            itemLancamentos
              .map((entry) => entry.documento_id ? docsById.get(entry.documento_id) : undefined)
              .filter((doc): doc is Documento => !!doc)
              .map((doc) => [doc.id, doc]),
          ).values(),
        ),
      );

      return {
        item,
        lancamentos: itemLancamentos.sort((a, b) => a.data_inicio.localeCompare(b.data_inicio)),
        documentos: documentosDoItem,
      };
    })
    .filter((group): group is ComprovacaoItemResumo => !!group)
    .sort((a, b) => a.item.numero - b.item.numero);
}

export async function exportPacoteRSC(params: {
  servidor: Servidor;
  nivelElegivel: NivelRsc | null;
  lancamentos: Lancamento[];
  itensRSC: ItemRSC[];
  documentos: Documento[];
  processo: ProcessoRSC;
}): Promise<void> {
  const { servidor, nivelElegivel, lancamentos, itensRSC, documentos, processo } = params;

  const groups = buildComprovacaoGroups(lancamentos, itensRSC, documentos);
  const totalPontos = sumPointValues(lancamentos.map((l) => l.pontos_calculados));
  const itensDistintos = new Set(lancamentos.map((l) => l.item_rsc_id)).size;

  // Unify comprovantes first to obtain page ranges for the memorial metadata page.
  const { bytes: comprovantesBytes, pageRanges } = await unificarComprovantes(groups);

  const requerimentoBytes = await generateRequerimentoFormal(
    servidor,
    nivelElegivel,
    processo,
    totalPontos,
    itensDistintos,
  );

  const memorialBytes = await generateMemorialDescritivo(
    servidor,
    nivelElegivel,
    lancamentos,
    itensRSC,
    documentos,
    processo,
    pageRanges,
  );

  const zip = new JSZip();
  zip.file('01_Requerimento_RSC.pdf', requerimentoBytes);
  zip.file('02_Memorial_Descritivo_RSC.pdf', memorialBytes);
  zip.file('03_Documentos_Comprobatorios_Unificados.pdf', comprovantesBytes);

  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const siape = servidor.siape.replace(/\D/g, '');
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(zipBlob, `RSC-TAE_Dossie_${siape}_${date}.zip`);
}
