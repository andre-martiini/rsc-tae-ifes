import JSZip from 'jszip';
import { PDFDocument, StandardFonts, rgb, degrees, PDFPage } from 'pdf-lib';
import type { Documento, ItemRSC, Lancamento, ProcessoRSC, Servidor } from '../data/mock';
import { getDocumentBlob } from './documentStorage';
import {
  buildDossierDocumentOrder,
  compareItemsByDossierOrder,
  sortDocumentsByDossierOrder,
  sortLancamentosByDossierOrder,
} from './documentOrdering';
import { sumPointValues, splitPointsEvenly } from './points';
import { getDistinctRscCriterionCount } from './rsc';
import { getInstructionDocument } from './instructionDocuments';
import { sanitizeForTag } from './utils';
import { CATALOG_VERSION } from '../data/normative/rsc-pcctae-2026';
import {
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

function buildComprovacaoGroups(
  lancamentos: Lancamento[],
  itensRSC: ItemRSC[],
  documentos: Documento[],
): ComprovacaoItemResumo[] {
  const docsById = new Map(documentos.map((doc) => [doc.id, doc]));
  const documentOrder = buildDossierDocumentOrder({ lancamentos, itensRSC });
  const sortedLancamentos = sortLancamentosByDossierOrder(lancamentos, itensRSC);
  const grouped = new Map<string, Lancamento[]>();

  sortedLancamentos.forEach((entry) => {
    const current = grouped.get(entry.item_rsc_id) ?? [];
    current.push(entry);
    grouped.set(entry.item_rsc_id, current);
  });

  return Array.from(grouped.entries())
    .map(([itemId, itemLancamentos]) => {
      const item = itensRSC.find((candidate) => candidate.id === itemId);
      if (!item) return null;

      const documentosDoItem = sortDocumentsByDossierOrder(Array.from(
        new Map(
          itemLancamentos
            .flatMap((entry) => {
              const ids = entry.comprovantes_ids ?? (entry.documento_id ? [entry.documento_id] : []);
              return ids.map((id) => docsById.get(id));
            })
            .filter((doc): doc is Documento => !!doc)
            .map((doc) => [doc.id, doc]),
        ).values(),
      ), documentOrder);

      return {
        item,
        lancamentos: itemLancamentos,
        documentos: documentosDoItem,
      };
    })
    .filter((group): group is ComprovacaoItemResumo => !!group)
    .sort((a, b) => compareItemsByDossierOrder(a.item, b.item));
}

interface ManifestLancamento {
  /** Id do lançamento de origem (rsc.ts `Lancamento.id`). Vários documentos do
   * mesmo lançamento compartilham o mesmo lancamento_id — usado pelo
   * avaliador para não confundir "um lançamento com N comprovantes" com "N
   * lançamentos distintos do mesmo item do rol". */
  lancamento_id: string;
  item_numero: number;
  inciso: string;
  pontos: number;
  pagina_inicio: number;
  pagina_fim: number;
  doc_ref: string;
  doc_hash?: string;
  observacao?: string;
}

interface ManifestRSC {
  versao: 1;
  catalogo_versao: string;
  gerado_em: string;
  servidor: { siape: string; nome: string; cargo?: string };
  nivel_pleiteado: string;
  pontos_totais: number;
  itens_distintos: number;
  lancamentos: ManifestLancamento[];
}

/**
 * Serialização completa do processo (00_Manifest_RSC.json), para o sistema
 * avaliador reconstruir o processo sem depender da extração de tags visuais
 * dos PDFs (robusto a reimpressão/reescaneamento do dossiê). As tags nos
 * PDFs permanecem como fallback.
 */
function buildManifest(params: {
  servidor: Servidor;
  nivelElegivel: NivelRsc | null;
  processo: ProcessoRSC;
  lancamentos: Lancamento[];
  itensRSC: ItemRSC[];
  documentos: Documento[];
  documentPageRanges: Record<string, { startPage: number; endPage: number }>;
  documentHashes: Record<string, string>;
  totalPontos: number;
  itensDistintos: number;
}): ManifestRSC {
  const {
    servidor,
    nivelElegivel,
    processo,
    lancamentos,
    itensRSC,
    documentos,
    documentPageRanges,
    documentHashes,
    totalPontos,
    itensDistintos,
  } = params;

  const sortedLancamentos = sortLancamentosByDossierOrder(lancamentos, itensRSC);
  const manifestLancamentos: ManifestLancamento[] = [];

  for (const l of sortedLancamentos) {
    const item = itensRSC.find((i) => i.id === l.item_rsc_id);
    if (!item) continue;

    const docIds = l.comprovantes_ids && l.comprovantes_ids.length > 0
      ? l.comprovantes_ids
      : (l.documento_id ? [l.documento_id] : []);

    if (docIds.length === 0) {
      manifestLancamentos.push({
        lancamento_id: l.id,
        item_numero: item.numero,
        inciso: item.inciso,
        pontos: l.pontos_calculados,
        pagina_inicio: 0,
        pagina_fim: 0,
        doc_ref: 'AUTODECLARACAO',
        observacao: l.observacao || undefined,
      });
      continue;
    }

    // O avaliador soma o campo `pontos` de cada entrada do manifest
    // diretamente (sem reagrupar por item), então quando um lançamento tem
    // vários comprovantes cada entrada precisa carregar sua fração dos
    // pontos — nunca o total do lançamento repetido — sob pena de
    // multiplicar a pontuação apurada por `docIds.length`.
    const parcelas = splitPointsEvenly(l.pontos_calculados, docIds.length);
    docIds.forEach((docId, idx) => {
      const docItem = documentos.find((d) => d.id === docId);
      const docRefKey = docItem ? `${item.numero}_${docItem.id}` : '';
      const range = docRefKey ? documentPageRanges[docRefKey] : undefined;
      manifestLancamentos.push({
        lancamento_id: l.id,
        item_numero: item.numero,
        inciso: item.inciso,
        pontos: parcelas[idx],
        pagina_inicio: range?.startPage ?? 0,
        pagina_fim: range?.endPage ?? 0,
        doc_ref: docItem?.nome_arquivo ?? 'AUTODECLARACAO',
        doc_hash: docRefKey ? documentHashes[docRefKey] : undefined,
        observacao: l.observacao || undefined,
      });
    });
  }

  return {
    versao: 1,
    catalogo_versao: CATALOG_VERSION,
    gerado_em: new Date().toISOString(),
    servidor: { siape: servidor.siape, nome: servidor.nome_completo, cargo: servidor.cargo },
    nivel_pleiteado: processo.nivel_pleiteado_id ?? '',
    pontos_totais: totalPontos,
    itens_distintos: itensDistintos,
    lancamentos: manifestLancamentos,
  };
}

function drawTagOnPage(
  page: PDFPage,
  text: string,
  font: any,
  size: number,
  color: any,
  yOffsetVisual: number,
) {
  const { width, height } = page.getSize();
  const rotation = page.getRotation().angle || 0;
  const xOffsetVisual = 30;

  let x = xOffsetVisual;
  let y = yOffsetVisual;

  if (rotation === 90) {
    x = width - yOffsetVisual;
    y = xOffsetVisual;
  } else if (rotation === 180) {
    x = width - xOffsetVisual;
    y = height - yOffsetVisual;
  } else if (rotation === 270) {
    x = yOffsetVisual;
    y = height - xOffsetVisual;
  }

  page.drawText(text, {
    x,
    y,
    size,
    font,
    color,
    rotate: degrees(rotation),
  });
}

async function mergePdfDocumentSet(documents: Documento[]): Promise<Uint8Array | null> {
  const merged = await PDFDocument.create();

  for (const document of documents) {
    if (!document.caminho_storage) continue;
    const blob = await getDocumentBlob(document.id);
    if (!blob) continue;

    try {
      const source = await PDFDocument.load(await blob.arrayBuffer(), { ignoreEncryption: true });
      const pages = await merged.copyPages(source, source.getPageIndices());
      pages.forEach((page) => merged.addPage(page));
    } catch (error) {
      console.error(`Erro ao incluir o documento de instrução ${document.nome_arquivo}:`, error);
    }
  }

  if (merged.getPageCount() === 0) return null;
  return merged.save();
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
  const itensDistintos = getDistinctRscCriterionCount(lancamentos, itensRSC);

  // 1. Criar o PDF unificado e rastrear intervalos de páginas para cada documento em cada item
  const unifiedPdf = await PDFDocument.create();
  const courierFont = await unifiedPdf.embedFont(StandardFonts.Courier);
  let currentPageIndex = 0;
  const documentPageRanges: Record<string, { startPage: number; endPage: number }> = {};
  const documentHashes: Record<string, string> = {};

  for (const group of groups) {
    const itemNumero = group.item.numero;
    // Seleciona os documentos físicos que serão mesclados
    const physicalDocs = group.documentos.filter(
      (doc) => doc.caminho_storage && !doc.nome_arquivo.endsWith('.ref') && !doc.autodeclaracao,
    );

    for (const doc of physicalDocs) {
      const blob = await getDocumentBlob(doc.id);
      if (!blob) continue;

      try {
        const bytes = await blob.arrayBuffer();
        const sourceDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await unifiedPdf.copyPages(sourceDoc, sourceDoc.getPageIndices());

        if (pages.length === 0) continue;

        const startPage = currentPageIndex + 1;
        const docHash = sanitizeForTag(doc.hash_arquivo || doc.id);

        for (const page of pages) {
          unifiedPdf.addPage(page);
          currentPageIndex++;

          // Injetar tags discretas no rodapé de cada página copiada (tamanho 8pt, cinza escuro, com espaçamento e tratamento de rotação)
          drawTagOnPage(
            page,
            `[RSC:EVIDENCIA_ITEM:${itemNumero}] [RSC:DOC_HASH:${docHash}]`,
            courierFont,
            8,
            rgb(0.6, 0.6, 0.6),
            30,
          );
        }

        const endPage = currentPageIndex;
        const docRefKey = `${itemNumero}_${doc.id}`;
        documentPageRanges[docRefKey] = { startPage, endPage };
        documentHashes[docRefKey] = docHash;

      } catch (err) {
        console.error(`Erro ao mesclar o documento ${doc.nome_arquivo}:`, err);
      }
    }
  }

  // Se o PDF unificado não tiver nenhuma página, cria uma página em branco com a tag de fim
  if (currentPageIndex === 0) {
    const page = unifiedPdf.addPage([595.28, 841.89]);
    drawTagOnPage(page, '[RSC:DOC_TIPO:COMPROVANTES_FIM]', courierFont, 8, rgb(0.6, 0.6, 0.6), 30);
  } else {
    // Inserir tag de fechamento na última página do PDF unificado
    const lastPage = unifiedPdf.getPage(unifiedPdf.getPageCount() - 1);
    drawTagOnPage(lastPage, '[RSC:DOC_TIPO:COMPROVANTES_FIM]', courierFont, 8, rgb(0.6, 0.6, 0.6), 45);
  }

  const unifiedPdfBytes = await unifiedPdf.save();
  zip.file('06_Documentos_Comprobatorios_Unificados.pdf', unifiedPdfBytes);

  // 1.b Manifest estruturado (00_Manifest_RSC.json) — ver buildManifest().
  const manifest = buildManifest({
    servidor,
    nivelElegivel,
    processo,
    lancamentos,
    itensRSC,
    documentos,
    documentPageRanges,
    documentHashes,
    totalPontos,
    itensDistintos,
  });
  zip.file('00_Manifest_RSC.json', JSON.stringify(manifest, null, 2));

  // 2. Gerar o Requerimento
  const requerimentoBytes = await generateRequerimentoFormal(
    servidor,
    nivelElegivel,
    processo,
    totalPontos,
    itensDistintos,
    lancamentos,
    itensRSC,
    documentos,
  );
  zip.file('01_Requerimento_RSC.pdf', requerimentoBytes);

  // 3. Gerar o Memorial textual com as referências estruturadas de página
  const memorialBytes = await generateMemorialDescritivo(
    servidor,
    nivelElegivel,
    lancamentos,
    itensRSC,
    documentos,
    processo,
    documentPageRanges,
  );
  zip.file('02_Memorial_RSC.pdf', memorialBytes);

  // 4. Reunir os documentos funcionais exigidos para instrução do processo.
  const siapeDocuments = [
    getInstructionDocument(documentos, 'siape_dados_funcionais'),
    getInstructionDocument(documentos, 'siape_posicao_carreira'),
    getInstructionDocument(documentos, 'siape_cargo_confianca'),
  ].filter((doc): doc is Documento => !!doc);
  const siapeBytes = await mergePdfDocumentSet(siapeDocuments);
  if (siapeBytes) zip.file('03_Fichas_Funcionais_SIAPE.pdf', siapeBytes);

  const stabilityDocument = getInstructionDocument(documentos, 'portaria_estabilidade');
  if (stabilityDocument) {
    const stabilityBytes = await mergePdfDocumentSet([stabilityDocument]);
    if (stabilityBytes) zip.file('04_Portaria_Estabilidade.pdf', stabilityBytes);
  }

  const priorGrantDocument = getInstructionDocument(documentos, 'portaria_concessao_anterior');
  if (priorGrantDocument) {
    const priorGrantBytes = await mergePdfDocumentSet([priorGrantDocument]);
    if (priorGrantBytes) zip.file('05_Portaria_Concessao_Anterior_RSC.pdf', priorGrantBytes);
  }

  // 5. Compactar e iniciar download do conjunto completo.
  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const siape = servidor.siape.replace(/\D/g, '');
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(zipBlob, `RSC-TAE_Dossie_${siape}_${date}.zip`);
}
