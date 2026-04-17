import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import type { Documento, ItemRSC, Lancamento, ProcessoRSC, Servidor } from '../data/mock';
import { getDocumentBlob } from './documentStorage';
import { sumPointValues } from './points';
import {
  generateComprovacaoResumoItem,
  generateComprovacoesIndice,
  generateMemorialDescritivo,
  generateRequerimentoFormal,
  type ComprovacaoItemResumo,
  type NivelRsc,
} from './pdfGenerator';

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

function sanitizeFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

const DOCUMENT_TYPE_FOLDER_LABELS: Record<NonNullable<Documento['tipo_documento']>, string> = {
  comprobatorio_principal: '01_Comprobatorio_Principal',
  complementar: '02_Complementar',
  autodeclaracao: '03_Autodeclaracoes',
  referencia_institucional: '04_Referencias_Institucionais',
  evidencia_vinculada: '05_Evidencias_Vinculadas',
  documento_apoio: '06_Documentos_Apoio',
};

function getDocumentTypeFolder(doc: Documento) {
  if (!doc.tipo_documento) return '99_Nao_Tipificado';
  return DOCUMENT_TYPE_FOLDER_LABELS[doc.tipo_documento] ?? '99_Nao_Tipificado';
}

async function appendPdfBytes(target: PDFDocument, bytes: Uint8Array | ArrayBuffer) {
  const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = await target.copyPages(source, source.getPageIndices());
  pages.forEach((page) => target.addPage(page));
}

async function buildComprovacaoItemPdf(
  servidor: Servidor,
  grupo: ComprovacaoItemResumo,
): Promise<Uint8Array> {
  const merged = await PDFDocument.create();
  const summaryBytes = await generateComprovacaoResumoItem(servidor, grupo);
  await appendPdfBytes(merged, summaryBytes);

  const physicalDocs = grupo.documentos.filter(
    (doc) => doc.caminho_storage && !doc.nome_arquivo.endsWith('.ref') && !doc.autodeclaracao,
  );

  for (const doc of physicalDocs) {
    const blob = await getDocumentBlob(doc.id);
    if (!blob) continue;
    try {
      const bytes = await blob.arrayBuffer();
      await appendPdfBytes(merged, bytes);
    } catch {
      // Skip corrupted files and keep the summary page for traceability.
    }
  }

  return merged.save();
}

function sortDocumentsByType(documents: Documento[]) {
  return [...documents].sort((a, b) => {
    const folderA = getDocumentTypeFolder(a);
    const folderB = getDocumentTypeFolder(b);
    if (folderA !== folderB) return folderA.localeCompare(folderB);
    return a.nome_arquivo.localeCompare(b.nome_arquivo);
  });
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

      const documentosDoItem = sortDocumentsByType(Array.from(
        new Map(
          itemLancamentos
            .map((entry) => docsById.get(entry.documento_id))
            .filter((doc): doc is Documento => !!doc)
            .map((doc) => [doc.id, doc]),
        ).values(),
      ));

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

  const zip = new JSZip();
  const groups = buildComprovacaoGroups(lancamentos, itensRSC, documentos);
  const totalPontos = sumPointValues(lancamentos.map((lancamento) => lancamento.pontos_calculados));
  const itensDistintos = new Set(lancamentos.map((lancamento) => lancamento.item_rsc_id)).size;

  const requerimentoBytes = await generateRequerimentoFormal(
    servidor,
    nivelElegivel,
    processo,
    totalPontos,
    itensDistintos,
  );
  zip.file('00_Requerimento_RSC_PCCTAE.pdf', requerimentoBytes);

  const memorialBytes = await generateMemorialDescritivo(
    servidor,
    nivelElegivel,
    lancamentos,
    itensRSC,
    documentos,
    processo,
  );
  zip.file('01_Memorial_RSC_PCCTAE.pdf', memorialBytes);

  const comprovacoesFolder = zip.folder('03_Comprovacoes');
  if (comprovacoesFolder) {
    const indiceBytes = await generateComprovacoesIndice(servidor, groups);
    comprovacoesFolder.file('00_Indice_Comprovacoes.pdf', indiceBytes);

    for (const group of groups) {
      const baseName = sanitizeFileName(`Item_${group.item.numero}_${group.item.descricao}`);
      const itemFolder = comprovacoesFolder.folder(baseName);
      if (!itemFolder) continue;

      const itemPdfBytes = await buildComprovacaoItemPdf(servidor, group);
      itemFolder.file(`00_Resumo_${baseName}.pdf`, itemPdfBytes);

      for (const doc of sortDocumentsByType(group.documentos)) {
        const typeFolder = itemFolder.folder(getDocumentTypeFolder(doc));
        if (!typeFolder) continue;

        if (doc.gedoc_links?.length) {
          const linksContent = doc.gedoc_links.join('\n');
          typeFolder.file(`${sanitizeFileName(doc.nome_arquivo)}.txt`, linksContent);
          continue;
        }

        if (!doc.caminho_storage) {
          typeFolder.file(`${sanitizeFileName(doc.nome_arquivo)}.txt`, `Registro documental sem arquivo físico anexado.\nTipo: ${doc.tipo_documento ?? 'nao_tipificado'}`);
          continue;
        }

        const blob = await getDocumentBlob(doc.id);
        if (!blob) continue;
        typeFolder.file(sanitizeFileName(doc.nome_arquivo), blob);
      }
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const siape = servidor.siape.replace(/\D/g, '');
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(zipBlob, `RSC-TAE_Dossie_${siape}_${date}.zip`);
}
