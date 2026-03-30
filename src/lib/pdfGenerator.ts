import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  StandardFonts,
  rgb,
} from 'pdf-lib';
import type { Documento, ItemRSC, Lancamento, Servidor } from '../data/mock';

export type NivelRsc = {
  label: string;
  equivalencia: string;
  pontosMinimos: number;
  itensMinimos: number;
};

export type ComprovacaoItemResumo = {
  item: ItemRSC;
  lancamentos: Lancamento[];
  documentos: Documento[];
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 44;
const MARGIN_BOTTOM = 42;
const HEADER_H = 74;
const FOOTER_H = 26;
const CONTENT_TOP = PAGE_H - HEADER_H - 18;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

const COLORS = {
  text: rgb(0.12, 0.12, 0.12),
  muted: rgb(0.45, 0.45, 0.45),
  soft: rgb(0.7, 0.7, 0.7),
  border: rgb(0.82, 0.82, 0.82),
  sectionBg: rgb(0.96, 0.96, 0.96),
  chipBg: rgb(0.94, 0.94, 0.94),
  accent: rgb(0.16, 0.16, 0.16),
};

const INCISO_DESC: Record<string, string> = {
  I: 'Comissoes e grupos de trabalho',
  II: 'Projetos institucionais',
  III: 'Premiacoes e reconhecimentos',
  IV: 'Responsabilidades tecnicas',
  V: 'Direcao, assessoramento e chefia',
  VI: 'Publicacoes e producao tecnica',
};

const RSC_OPTIONS = [
  'RSC-PCCTAE - I',
  'RSC-PCCTAE - II',
  'RSC-PCCTAE - III',
  'RSC-PCCTAE - IV',
  'RSC-PCCTAE - V',
  'RSC-PCCTAE - VI',
];

const RSC_REQUIREMENTS = [
  'a) RSC-PCCTAE - I: comprovante de ensino fundamental incompleto, acrescido de 10 pontos, distribuidos em no minimo 2 itens do rol de saberes e competencias.',
  'b) RSC-PCCTAE - II: diploma de ensino fundamental completo, acrescido de 20 pontos, distribuidos em no minimo 3 itens do rol de saberes e competencias.',
  'c) RSC-PCCTAE - III: diploma de ensino medio ou tecnico de nivel medio, acrescido de 25 pontos, distribuidos em no minimo 4 itens do rol de saberes e competencias.',
  'd) RSC-PCCTAE - IV: diploma de graduacao, acrescido de 30 pontos, distribuidos em no minimo 5 itens do rol de saberes e competencias.',
  'e) RSC-PCCTAE - V: certificado de pos-graduacao lato sensu, acrescido de 52 pontos, distribuidos em no minimo 8 itens do rol de saberes e competencias.',
  'f) RSC-PCCTAE - VI: diploma de mestrado, acrescido de 75 pontos, distribuidos em no minimo 12 itens do rol de saberes e competencias.',
];

let logoBytesPromise: Promise<Uint8Array | null> | null = null;

function sanitize(value: unknown): string {
  return String(value ?? '')
    .replace(/[^\u0000-\u00FF]/g, '?')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDate(value?: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return sanitize(value);
  return date.toLocaleDateString('pt-BR');
}

function todayLabel(): string {
  return new Date().toLocaleDateString('pt-BR');
}

function todayYear(): string {
  return new Date().getFullYear().toString();
}

function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function uniqById<T extends { id: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

async function getLogoBytes(): Promise<Uint8Array | null> {
  if (!logoBytesPromise) {
    logoBytesPromise = fetch('/logo_ifes.png')
      .then(async (response) => {
        if (!response.ok) return null;
        return new Uint8Array(await response.arrayBuffer());
      })
      .catch(() => null);
  }

  return logoBytesPromise;
}

class Writer {
  private doc: PDFDocument;
  private title: string;
  private subtitle: string;
  private badge: string;
  private footerRight: string;
  private regular!: PDFFont;
  private bold!: PDFFont;
  private logo?: PDFImage;
  private page!: PDFPage;
  public y = 0;

  constructor(params: {
    doc: PDFDocument;
    title: string;
    subtitle: string;
    badge?: string;
    footerRight?: string;
  }) {
    this.doc = params.doc;
    this.title = params.title;
    this.subtitle = params.subtitle;
    this.badge = params.badge ?? 'Rascunho';
    this.footerRight = params.footerRight ?? 'RSC-TAE';
  }

  async init() {
    this.regular = await this.doc.embedFont(StandardFonts.Helvetica);
    this.bold = await this.doc.embedFont(StandardFonts.HelveticaBold);
    const logoBytes = await getLogoBytes();
    if (logoBytes) {
      try {
        this.logo = await this.doc.embedPng(logoBytes);
      } catch {
        this.logo = undefined;
      }
    }
    this.addPage();
  }

  addPage() {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.drawChrome();
    this.y = CONTENT_TOP;
  }

  private drawChrome() {
    const headerY = PAGE_H - HEADER_H;

    this.page.drawRectangle({
      x: MARGIN_X,
      y: headerY,
      width: PAGE_W - MARGIN_X * 2,
      height: HEADER_H,
      borderColor: COLORS.border,
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });

    this.page.drawLine({
      start: { x: MARGIN_X, y: headerY + HEADER_H - 1 },
      end: { x: PAGE_W - MARGIN_X, y: headerY + HEADER_H - 1 },
      thickness: 1.4,
      color: COLORS.accent,
    });

    const logoBoxW = 54;
    const rightBoxW = 92;

    this.page.drawLine({
      start: { x: MARGIN_X + logoBoxW, y: headerY },
      end: { x: MARGIN_X + logoBoxW, y: headerY + HEADER_H },
      thickness: 0.8,
      color: COLORS.border,
    });

    this.page.drawLine({
      start: { x: PAGE_W - MARGIN_X - rightBoxW, y: headerY },
      end: { x: PAGE_W - MARGIN_X - rightBoxW, y: headerY + HEADER_H },
      thickness: 0.8,
      color: COLORS.border,
    });

    if (this.logo) {
      const size = 26;
      this.page.drawImage(this.logo, {
        x: MARGIN_X + (logoBoxW - size) / 2,
        y: headerY + (HEADER_H - size) / 2,
        width: size,
        height: size,
      });
    } else {
      this.page.drawText('IFES', {
        x: MARGIN_X + 10,
        y: headerY + HEADER_H / 2 - 5,
        size: 14,
        font: this.bold,
        color: COLORS.text,
      });
    }

    const centerX = MARGIN_X + logoBoxW + 14;
    const centerW = PAGE_W - MARGIN_X * 2 - logoBoxW - rightBoxW - 28;
    this.page.drawText('Instituto Federal do Espirito Santo', {
      x: centerX,
      y: headerY + 48,
      size: 8,
      font: this.bold,
      color: COLORS.muted,
    });
    this.drawWrapped(this.title, {
      x: centerX,
      y: headerY + 34,
      maxWidth: centerW,
      size: 11,
      font: this.bold,
      color: COLORS.text,
      lineHeight: 12,
    });
    this.drawWrapped(this.subtitle, {
      x: centerX,
      y: headerY + 18,
      maxWidth: centerW,
      size: 7.5,
      font: this.regular,
      color: COLORS.muted,
      lineHeight: 9,
    });

    const rightX = PAGE_W - MARGIN_X - rightBoxW + 10;
    this.page.drawText('Data', {
      x: rightX,
      y: headerY + 48,
      size: 7,
      font: this.bold,
      color: COLORS.soft,
    });
    this.page.drawText(todayLabel(), {
      x: rightX,
      y: headerY + 35,
      size: 8.5,
      font: this.bold,
      color: COLORS.text,
    });

    this.page.drawRectangle({
      x: rightX,
      y: headerY + 14,
      width: rightBoxW - 20,
      height: 12,
      color: COLORS.chipBg,
    });
    this.page.drawText(this.badge, {
      x: rightX + 5,
      y: headerY + 18,
      size: 6.5,
      font: this.bold,
      color: COLORS.muted,
    });

    const footerY = MARGIN_BOTTOM - 4;
    this.page.drawLine({
      start: { x: MARGIN_X, y: footerY + 12 },
      end: { x: PAGE_W - MARGIN_X, y: footerY + 12 },
      thickness: 1,
      color: COLORS.border,
    });
    this.page.drawText(`RSC-TAE - IFES · documento gerado em ${todayLabel()}`, {
      x: MARGIN_X,
      y: footerY,
      size: 7,
      font: this.regular,
      color: COLORS.soft,
    });
    this.page.drawText(this.footerRight, {
      x: PAGE_W - MARGIN_X - this.bold.widthOfTextAtSize(this.footerRight, 7),
      y: footerY,
      size: 7,
      font: this.bold,
      color: COLORS.soft,
    });
  }

  private wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const pieces: string[] = [];
    for (const paragraph of sanitize(text).split('\n')) {
      if (!paragraph) {
        pieces.push('');
        continue;
      }
      let line = '';
      for (const word of paragraph.split(' ')) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
          line = candidate;
        } else {
          if (line) pieces.push(line);
          line = word;
        }
      }
      if (line) pieces.push(line);
    }
    return pieces.length ? pieces : [''];
  }

  private drawWrapped(
    text: string,
    options: {
      x: number;
      y: number;
      maxWidth: number;
      size: number;
      font: PDFFont;
      color: ReturnType<typeof rgb>;
      lineHeight: number;
    },
  ) {
    const lines = this.wrap(text, options.font, options.size, options.maxWidth);
    lines.forEach((line, index) => {
      this.page.drawText(line, {
        x: options.x,
        y: options.y - index * options.lineHeight,
        size: options.size,
        font: options.font,
        color: options.color,
      });
    });
  }

  ensure(height: number) {
    if (this.y - height < MARGIN_BOTTOM + FOOTER_H) {
      this.addPage();
    }
  }

  gap(value = 8) {
    this.y -= value;
  }

  section(title: string) {
    this.gap(10);
    this.ensure(22);
    this.page.drawRectangle({
      x: MARGIN_X,
      y: this.y - 4,
      width: CONTENT_W,
      height: 18,
      color: COLORS.sectionBg,
      borderColor: COLORS.border,
      borderWidth: 0.7,
    });
    this.page.drawText(sanitize(title), {
      x: MARGIN_X + 6,
      y: this.y + 1,
      size: 8,
      font: this.bold,
      color: COLORS.muted,
    });
    this.y -= 22;
  }

  text(
    text: string,
    options: {
      size?: number;
      bold?: boolean;
      color?: ReturnType<typeof rgb>;
      lineHeight?: number;
      indent?: number;
      maxWidth?: number;
      align?: 'left' | 'center' | 'right';
    } = {},
  ) {
    const size = options.size ?? 9.5;
    const font = options.bold ? this.bold : this.regular;
    const x = MARGIN_X + (options.indent ?? 0);
    const maxWidth = options.maxWidth ?? CONTENT_W - (options.indent ?? 0);
    const lineHeight = options.lineHeight ?? size * 1.45;
    const lines = this.wrap(text, font, size, maxWidth);

    for (const line of lines) {
      this.ensure(lineHeight);
      let drawX = x;
      if (options.align === 'center') {
        drawX = MARGIN_X + (CONTENT_W - font.widthOfTextAtSize(line, size)) / 2;
      }
      if (options.align === 'right') {
        drawX = PAGE_W - MARGIN_X - font.widthOfTextAtSize(line, size);
      }
      if (line) {
        this.page.drawText(line, {
          x: drawX,
          y: this.y,
          size,
          font,
          color: options.color ?? COLORS.text,
        });
      }
      this.y -= lineHeight;
    }
  }

  keyValue(label: string, value: string, valueWidth = CONTENT_W - 132) {
    const size = 9;
    const labelWidth = 126;
    const lineHeight = 13;
    const lines = this.wrap(value, this.regular, size, valueWidth);
    const rowHeight = Math.max(18, lines.length * lineHeight + 4);
    this.ensure(rowHeight + 4);

    this.page.drawLine({
      start: { x: MARGIN_X, y: this.y + 2 },
      end: { x: PAGE_W - MARGIN_X, y: this.y + 2 },
      thickness: 0.4,
      color: COLORS.border,
    });
    this.page.drawText(sanitize(label), {
      x: MARGIN_X + 4,
      y: this.y - 9,
      size: 7,
      font: this.bold,
      color: COLORS.soft,
    });
    lines.forEach((line, index) => {
      this.page.drawText(line, {
        x: MARGIN_X + labelWidth,
        y: this.y - 9 - index * lineHeight,
        size,
        font: this.regular,
        color: COLORS.text,
      });
    });
    this.y -= rowHeight;
  }

  infoGrid(cells: Array<{ label: string; value: string }>, columns: 2 | 4 = 2) {
    const colWidth = CONTENT_W / columns;
    const top = this.y;
    const rowHeight = 36;
    this.ensure(rowHeight + 6);

    this.page.drawRectangle({
      x: MARGIN_X,
      y: top - rowHeight + 8,
      width: CONTENT_W,
      height: rowHeight,
      borderColor: COLORS.border,
      borderWidth: 0.8,
      color: rgb(1, 1, 1),
    });

    cells.forEach((cell, index) => {
      const col = index % columns;
      const x = MARGIN_X + col * colWidth;
      if (col > 0) {
        this.page.drawLine({
          start: { x, y: top - rowHeight + 8 },
          end: { x, y: top + 8 },
          thickness: 0.5,
          color: COLORS.border,
        });
      }

      this.page.drawText(sanitize(cell.label), {
        x: x + 8,
        y: top - 2,
        size: 6.5,
        font: this.bold,
        color: COLORS.soft,
      });
      this.drawWrapped(sanitize(cell.value || '-'), {
        x: x + 8,
        y: top - 14,
        maxWidth: colWidth - 16,
        size: 8.5,
        font: this.bold,
        color: COLORS.text,
        lineHeight: 10,
      });
    });

    this.y -= rowHeight + 2;
  }

  bullet(text: string) {
    this.text(`• ${text}`, { size: 9, indent: 4, maxWidth: CONTENT_W - 4 });
  }

  table(headers: string[], rows: string[][], widths: number[]) {
    this.tableRow(headers, widths, true, 0.94);
    rows.forEach((row, index) => {
      this.tableRow(row, widths, false, index % 2 === 0 ? 1 : 0.985);
    });
  }

  private tableRow(cells: string[], widths: number[], bold: boolean, shade: number) {
    const font = bold ? this.bold : this.regular;
    const size = bold ? 7.5 : 7.8;
    const lineHeight = 9.4;
    const widthsPt = widths.map((w) => w * CONTENT_W);
    const lineCounts = cells.map((cell, index) =>
      this.wrap(cell, font, size, widthsPt[index] - 10).length,
    );
    const height = Math.max(18, Math.max(...lineCounts) * lineHeight + 8);
    this.ensure(height + 4);

    this.page.drawRectangle({
      x: MARGIN_X,
      y: this.y - height + 4,
      width: CONTENT_W,
      height,
      color: rgb(shade, shade, shade),
      borderColor: COLORS.border,
      borderWidth: 0.4,
    });

    let currentX = MARGIN_X;
    cells.forEach((cell, index) => {
      if (index > 0) {
        this.page.drawLine({
          start: { x: currentX, y: this.y - height + 4 },
          end: { x: currentX, y: this.y + 4 },
          thickness: 0.35,
          color: COLORS.border,
        });
      }

      const lines = this.wrap(cell, font, size, widthsPt[index] - 10);
      lines.forEach((line, lineIndex) => {
        this.page.drawText(line, {
          x: currentX + 5,
          y: this.y - 8 - lineIndex * lineHeight,
          size,
          font,
          color: COLORS.text,
        });
      });
      currentX += widthsPt[index];
    });

    this.y -= height;
  }
}

function buildIncisoSummary(lancamentos: Lancamento[], itensRSC: ItemRSC[]) {
  const totals = new Map<string, number>();
  lancamentos.forEach((lancamento) => {
    const item = itensRSC.find((entry) => entry.id === lancamento.item_rsc_id);
    if (!item) return;
    totals.set(item.inciso, (totals.get(item.inciso) ?? 0) + lancamento.pontos_calculados);
  });
  return Array.from(totals.entries()).sort(([a], [b]) => a.localeCompare(b));
}

export async function generateRequerimento(
  servidor: Servidor,
  nivelElegivel: NivelRsc | null,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const writer = new Writer({
    doc,
    title: 'Requerimento - RSC-TAE',
    subtitle: 'Documento de solicitacao do Reconhecimento de Saberes e Competencias',
    footerRight: `${servidor.siape} · ${nivelElegivel?.label ?? 'RSC-TAE'}`,
  });
  await writer.init();

  writer.section('1. Identificacao do Servidor');
  writer.infoGrid(
    [
      { label: 'Servidor(a)', value: servidor.nome_completo },
      { label: 'Unidade', value: servidor.lotacao || '-' },
      { label: 'Cargo', value: servidor.cargo || 'Tecnico-Administrativo em Educacao' },
      { label: 'SIAPE', value: servidor.siape },
    ],
    4,
  );
  writer.infoGrid(
    [
      { label: 'E-mail institucional', value: servidor.email_institucional || '-' },
      { label: 'Escolaridade atual', value: servidor.escolaridade_atual || '-' },
    ],
    2,
  );

  writer.section('2. Requerimento');
  writer.text('Venho requerer o nivel abaixo indicado para fins de concessao do RSC-PCCTAE:', {
    size: 9.5,
  });
  writer.gap(4);
  RSC_OPTIONS.forEach((option) => {
    const selected = nivelElegivel?.label.replace('RSC-TAE', 'RSC-PCCTAE') === option;
    writer.text(`${selected ? '[X]' : '[ ]'} ${option}`, {
      size: 9,
      bold: selected,
      indent: 8,
    });
  });

  writer.gap(4);
  writer.keyValue('Nivel requerido', nivelElegivel?.label ?? 'Nao identificado');
  writer.keyValue('Equivalencia pretendida', nivelElegivel?.equivalencia ?? '-');
  writer.keyValue('Requisito apresentado', servidor.escolaridade_atual || '-');

  writer.section('3. Requisitos Minimos');
  RSC_REQUIREMENTS.forEach((requirement) => writer.bullet(requirement));

  writer.section('4. Declaracao e Encaminhamento');
  writer.text(
    `Eu, ${servidor.nome_completo}, SIAPE ${servidor.siape}, lotado(a) em ${servidor.lotacao || '-'}, declaro que os documentos anexados e o Memorial Descritivo refletem fielmente minha trajetoria funcional para fins de analise pela comissao competente.`,
  );
  writer.gap(4);
  writer.text(
    'Apos anexar a documentacao, o processo devera ser encaminhado a unidade CRSC - Comissao Institucional de Reconhecimento de Saberes e Competencias para analise.',
  );
  writer.gap(28);
  writer.text(`Local e data: ${todayLabel()}`, { size: 9 });
  writer.gap(26);
  writer.text('_______________________________________________', { align: 'center' });
  writer.gap(2);
  writer.text(servidor.nome_completo, { align: 'center', bold: true, size: 10 });
  writer.text(`SIAPE ${servidor.siape}`, { align: 'center', size: 8.5, color: COLORS.muted });

  return doc.save();
}

export async function generateMemorialDescritivo(
  servidor: Servidor,
  nivelElegivel: NivelRsc | null,
  lancamentos: Lancamento[],
  itensRSC: ItemRSC[],
  documentos: Documento[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const writer = new Writer({
    doc,
    title: 'Memorial Descritivo - RSC-TAE',
    subtitle: 'Documento narrativo e consolidado da trajetoria funcional apresentada pelo servidor',
    footerRight: `${servidor.siape} · Memorial`,
  });
  await writer.init();

  writer.text('MEMORIAL DESCRITIVO', {
    align: 'center',
    bold: true,
    size: 18,
    lineHeight: 22,
  });
  writer.text('RECONHECIMENTO DE SABERES E COMPETENCIAS (RSC-TAE)', {
    align: 'center',
    bold: true,
    size: 11,
  });
  writer.text(nivelElegivel?.label ?? 'Nivel em analise', {
    align: 'center',
    size: 10,
    color: COLORS.muted,
  });
  writer.gap(26);
  writer.text(servidor.nome_completo, { align: 'center', bold: true, size: 12 });
  writer.text(servidor.lotacao || 'Instituto Federal do Espirito Santo', {
    align: 'center',
    size: 9.5,
    color: COLORS.muted,
  });
  writer.text(todayYear(), { align: 'center', size: 9.5, color: COLORS.muted });
  writer.gap(20);
  writer.text(
    'Memorial Descritivo apresentado a Comissao Institucional de Reconhecimento de Saberes e Competencias do Ifes como parte do processo de solicitacao do RSC-TAE.',
    { size: 10, align: 'center', maxWidth: 360, lineHeight: 14 },
  );

  const totalPontos = lancamentos.reduce((sum, entry) => sum + entry.pontos_calculados, 0);
  const itensDistintos = new Set(lancamentos.map((entry) => entry.item_rsc_id)).size;
  const incisoSummary = buildIncisoSummary(lancamentos, itensRSC);
  const documentosUsados = uniqById(
    documentos.filter((docItem) => lancamentos.some((l) => l.documento_id === docItem.id)),
  );

  writer.addPage();
  writer.section('1. Identificacao do(a) Servidor(a)');
  writer.infoGrid(
    [
      { label: 'Nome completo', value: servidor.nome_completo },
      { label: 'Unidade/Orgao', value: servidor.lotacao || '-' },
      { label: 'Matricula/SIAPE', value: servidor.siape },
      { label: 'Cargo', value: servidor.cargo || 'Tecnico-Administrativo em Educacao' },
    ],
    4,
  );
  writer.infoGrid(
    [
      { label: 'Maior titulacao', value: servidor.escolaridade_atual || '-' },
      { label: 'E-mail institucional', value: servidor.email_institucional || '-' },
    ],
    2,
  );

  writer.section('2. Apresentacao');
  writer.text(
    `O presente Memorial Descritivo tem por finalidade apresentar, de forma objetiva e sistematizada, as atividades desenvolvidas por ${servidor.nome_completo} no exercicio do cargo de ${servidor.cargo || 'Tecnico-Administrativo em Educacao'}, com vistas a concessao do ${nivelElegivel?.label ?? 'RSC-TAE'}, equivalente a ${nivelElegivel?.equivalencia ?? 'nivel superior ao requisito atual'}.`,
  );
  writer.gap(4);
  writer.text(
    'Este documento contempla a descricao das atribuicoes desempenhadas, a participacao em atividades institucionais e o conjunto de evidencias documentais que demonstram o desenvolvimento de saberes e competencias ao longo da trajetoria funcional.',
  );

  writer.section('3. Nivel Pleiteado e Pontuacao Consolidada');
  writer.infoGrid(
    [
      { label: 'Nivel RSC', value: nivelElegivel?.label ?? '-' },
      { label: 'Equivalencia', value: nivelElegivel?.equivalencia ?? '-' },
      { label: 'Total de pontos', value: `${formatNumber(totalPontos)} pts` },
      {
        label: 'Itens distintos',
        value: `${itensDistintos} de ${nivelElegivel?.itensMinimos ?? '-'} min.`,
      },
    ],
    4,
  );
  writer.keyValue(
    'Minimo exigido para o nivel',
    nivelElegivel ? `${nivelElegivel.pontosMinimos} pontos` : '-',
  );
  writer.keyValue(
    'Distribuicao por inciso',
    incisoSummary.length
      ? incisoSummary
          .map(([inciso, pontos]) => `Inciso ${inciso} - ${INCISO_DESC[inciso] ?? inciso}: ${formatNumber(pontos)} pts`)
          .join(' | ')
      : 'Nenhum lancamento consolidado ate o momento.',
  );

  writer.section('4. Relato das Atividades');
  if (!lancamentos.length) {
    writer.text('Nenhum saber ou competencia foi registrado ate o momento.');
  } else {
    const grouped = new Map<string, Lancamento[]>();
    lancamentos.forEach((entry) => {
      const current = grouped.get(entry.item_rsc_id) ?? [];
      current.push(entry);
      grouped.set(entry.item_rsc_id, current);
    });

    Array.from(grouped.entries()).forEach(([itemId, itemLancamentos], index) => {
      const item = itensRSC.find((candidate) => candidate.id === itemId);
      if (!item) return;

      const subtotal = itemLancamentos.reduce((sum, entry) => sum + entry.pontos_calculados, 0);
      writer.gap(4);
      writer.text(`Item ${index + 1}: ${item.descricao}`, { bold: true, size: 10 });
      writer.text(`Diretriz/Inciso: Inciso ${item.inciso} - ${INCISO_DESC[item.inciso] ?? item.inciso}`, {
        size: 8.5,
        color: COLORS.muted,
      });
      writer.text(`Descricao detalhada: ${item.regra_aceite}`, { size: 8.8 });
      writer.table(
        ['Periodo', 'Unidade', 'Quantidade', 'Pts/Un', 'Subtotal'],
        itemLancamentos.map((entry) => [
          `${formatDate(entry.data_inicio)} a ${formatDate(entry.data_fim)}`,
          item.unidade_medida,
          formatNumber(entry.quantidade_informada),
          formatNumber(item.pontos_por_unidade),
          `${formatNumber(entry.pontos_calculados)} pts`,
        ]),
        [0.28, 0.18, 0.16, 0.16, 0.22],
      );
      writer.keyValue('Subtotal do item', `${formatNumber(subtotal)} pontos`);
      writer.keyValue('Documentacao comprobatoria prevista', item.documentos_comprobatorios || '-');
    });
  }

  writer.section('5. Consideracoes Finais e Declaracao de Veracidade');
  writer.text(
    'As evidencias apresentadas demonstram trajetoria funcional marcada por comprometimento institucional, aperfeicoamento continuo e aplicacao pratica de saberes adquiridos ao longo da experiencia profissional.',
  );
  writer.gap(4);
  writer.text(
    'Declaro, para todos os fins de direito, que as informacoes constantes neste Memorial Descritivo sao verdadeiras, autenticas e estao devidamente documentadas, assumindo inteira responsabilidade pelas declaracoes prestadas.',
  );
  writer.gap(10);
  writer.keyValue(
    'Documentos anexados ao processo',
    documentosUsados.length
      ? documentosUsados.map((docItem) => docItem.nome_arquivo).join(' | ')
      : 'Nenhum documento vinculado.',
  );
  writer.gap(18);
  writer.text(`${servidor.lotacao || 'Vitoria - ES'}, ${todayLabel()}.`, { size: 9 });
  writer.gap(26);
  writer.text('___________________________________', { align: 'center' });
  writer.gap(2);
  writer.text(servidor.nome_completo, { align: 'center', bold: true, size: 10 });
  writer.text(servidor.cargo || 'Tecnico-Administrativo em Educacao', {
    align: 'center',
    size: 8.5,
    color: COLORS.muted,
  });

  return doc.save();
}

export async function generateComprovacoesIndice(
  servidor: Servidor,
  grupos: ComprovacaoItemResumo[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const writer = new Writer({
    doc,
    title: 'Indice de Comprovacoes',
    subtitle: 'Organizacao do conjunto documental por item do rol de saberes e competencias',
    footerRight: `${servidor.siape} · Comprovacoes`,
  });
  await writer.init();

  writer.section('1. Estrutura do Conjunto de Comprovacoes');
  writer.text(
    'As comprovacoes deste processo foram organizadas por item do rol de saberes. Cada arquivo desta pasta contem uma capa-resumo com a identificacao do item e, quando houver, os anexos fisicos correspondentes ao item.',
  );
  writer.gap(4);
  writer.text(
    'Referencias do GeDoc e autodeclaracoes sem arquivo fisico aparecem registradas na capa do respectivo item.',
    { size: 9, color: COLORS.muted },
  );

  writer.section('2. Itens com Comprovacoes');
  if (!grupos.length) {
    writer.text('Nenhum item possui comprovacoes vinculadas no momento.');
  } else {
    writer.table(
      ['Item', 'Inciso', 'Descricao', 'Lanc.', 'Docs'],
      grupos.map((grupo) => [
        `${grupo.item.numero}`,
        grupo.item.inciso,
        grupo.item.descricao,
        `${grupo.lancamentos.length}`,
        `${grupo.documentos.length}`,
      ]),
      [0.08, 0.1, 0.56, 0.12, 0.14],
    );
  }

  return doc.save();
}

export async function generateComprovacaoResumoItem(
  servidor: Servidor,
  grupo: ComprovacaoItemResumo,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const writer = new Writer({
    doc,
    title: `Comprovacoes - Item ${grupo.item.numero}`,
    subtitle: 'Capa-resumo do conjunto documental do item',
    footerRight: `${servidor.siape} · Item ${grupo.item.numero}`,
  });
  await writer.init();

  const subtotal = grupo.lancamentos.reduce((sum, entry) => sum + entry.pontos_calculados, 0);
  const physicalDocs = grupo.documentos.filter(
    (docItem) => docItem.caminho_storage && !docItem.nome_arquivo.endsWith('.ref') && !docItem.autodeclaracao,
  );
  const gedocDocs = grupo.documentos.filter((docItem) => (docItem.gedoc_links?.length ?? 0) > 0);
  const autodeclaracoes = grupo.documentos.filter((docItem) => docItem.autodeclaracao);

  writer.section('1. Identificacao do Item');
  writer.infoGrid(
    [
      { label: 'Servidor', value: servidor.nome_completo },
      { label: 'SIAPE', value: servidor.siape },
      { label: 'Item do rol', value: `Item ${grupo.item.numero}` },
      { label: 'Inciso', value: `Inciso ${grupo.item.inciso}` },
    ],
    4,
  );
  writer.keyValue('Descricao do item', grupo.item.descricao);
  writer.keyValue('Regra de aceite', grupo.item.regra_aceite);
  writer.keyValue('Pontuacao consolidada no item', `${formatNumber(subtotal)} pontos`);

  writer.section('2. Lancamentos Vinculados');
  writer.table(
    ['Periodo', 'Quantidade', 'Pontos', 'Documento'],
    grupo.lancamentos.map((entry) => {
      const docItem = grupo.documentos.find((candidate) => candidate.id === entry.documento_id);
      return [
        `${formatDate(entry.data_inicio)} a ${formatDate(entry.data_fim)}`,
        formatNumber(entry.quantidade_informada),
        `${formatNumber(entry.pontos_calculados)} pts`,
        docItem?.nome_arquivo ?? '-',
      ];
    }),
    [0.34, 0.16, 0.16, 0.34],
  );

  writer.section('3. Composicao do Dossie');
  writer.keyValue('Arquivos fisicos anexados', `${physicalDocs.length}`);
  writer.keyValue('Referencias GeDoc', `${gedocDocs.length}`);
  writer.keyValue('Autodeclaracoes', `${autodeclaracoes.length}`);

  if (gedocDocs.length) {
    writer.gap(4);
    writer.text('Referencias de GeDoc:', { bold: true, size: 9 });
    gedocDocs.forEach((docItem) => {
      writer.text(docItem.nome_arquivo, { size: 8.5, bold: true, indent: 8 });
      docItem.gedoc_links?.forEach((link) => {
        writer.text(link, { size: 8, indent: 14, color: COLORS.muted });
      });
    });
  }

  if (autodeclaracoes.length) {
    writer.gap(4);
    writer.text('Registros por autodeclaracao:', { bold: true, size: 9 });
    autodeclaracoes.forEach((docItem) => {
      writer.text(`${docItem.nome_arquivo} - sem arquivo fisico anexo.`, {
        size: 8.5,
        indent: 8,
      });
    });
  }

  return doc.save();
}

export async function generateRelatorioPontuacao(
  servidor: Servidor,
  nivelElegivel: NivelRsc | null,
  lancamentos: Lancamento[],
  itensRSC: ItemRSC[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const writer = new Writer({
    doc,
    title: 'Ficha de Consolidacao - RSC-TAE',
    subtitle: 'Resumo tecnico da pontuacao e dos itens consolidados do processo',
    footerRight: `${servidor.siape} · ${nivelElegivel?.label ?? 'RSC-TAE'}`,
  });
  await writer.init();

  const totalPontos = lancamentos.reduce((sum, entry) => sum + entry.pontos_calculados, 0);
  const itensDistintos = new Set(lancamentos.map((entry) => entry.item_rsc_id)).size;

  writer.section('1. Identificacao do Servidor');
  writer.infoGrid(
    [
      { label: 'Nome', value: servidor.nome_completo },
      { label: 'SIAPE', value: servidor.siape },
      { label: 'Lotacao', value: servidor.lotacao || '-' },
      { label: 'Escolaridade atual', value: servidor.escolaridade_atual || '-' },
    ],
    4,
  );

  writer.section('2. Dados do Pedido');
  writer.infoGrid(
    [
      { label: 'Nivel pleiteavel', value: nivelElegivel?.label ?? '-' },
      { label: 'Equivalencia', value: nivelElegivel?.equivalencia ?? '-' },
      { label: 'Pontuacao total', value: `${formatNumber(totalPontos)} pts` },
      { label: 'Itens distintos', value: `${itensDistintos}` },
    ],
    4,
  );

  writer.section('3. Itens Consolidados');
  if (!lancamentos.length) {
    writer.text('Nenhum item consolidado ate o momento.');
  } else {
    const rows = lancamentos
      .map((entry) => {
        const item = itensRSC.find((candidate) => candidate.id === entry.item_rsc_id);
        if (!item) return null;
        return [
          `${item.numero}`,
          item.inciso,
          item.descricao,
          formatNumber(entry.quantidade_informada),
          `${formatNumber(entry.pontos_calculados)} pts`,
        ];
      })
      .filter((row): row is string[] => !!row);
    writer.table(['Item', 'Inc.', 'Descricao', 'Qtd.', 'Pontos'], rows, [0.08, 0.08, 0.52, 0.12, 0.2]);
  }

  return doc.save();
}
