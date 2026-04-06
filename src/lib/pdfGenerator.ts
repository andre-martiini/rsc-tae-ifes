import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  StandardFonts,
  rgb,
} from 'pdf-lib';
import { institutionConfig } from '../config/institution';
import type { Documento, ItemRSC, Lancamento, ProcessoRSC, Servidor } from '../data/mock';
import { addPointValues, formatPointValue, sumPointValues } from './points';

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
const MARGIN_TOP = 20;
const MARGIN_X = 44;
const MARGIN_BOTTOM = 42;
const HEADER_H = 74;
const FOOTER_H = 26;
const CONTENT_TOP = PAGE_H - MARGIN_TOP - HEADER_H - 18;
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


let logoBytesPromise: Promise<Uint8Array | null> | null = null;

function sanitize(value: unknown): string {
  return String(value ?? '')
    .replace(/[^\u0000-\u00FF\u2022]/g, '?')
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
  return formatPointValue(value);
}

function uniqById<T extends { id: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

async function getLogoBytes(): Promise<Uint8Array | null> {
  if (!logoBytesPromise) {
    if (institutionConfig.logoPath.endsWith('.svg')) {
      return null;
    }

    logoBytesPromise = fetch(institutionConfig.logoPath)
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
    this.badge = params.badge ?? 'Consolidado';
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
    const headerY = PAGE_H - MARGIN_TOP - HEADER_H;

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

    const logoBoxW = 72;
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
      this.page.drawText(institutionConfig.shortName, {
        x: MARGIN_X + 10,
        y: headerY + HEADER_H / 2 - 5,
        size: 14,
        font: this.bold,
        color: COLORS.text,
      });
    }

    const centerX = MARGIN_X + logoBoxW + 14;
    const centerW = PAGE_W - MARGIN_X * 2 - logoBoxW - rightBoxW - 28;
    this.page.drawText(institutionConfig.networkName, {
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
    this.page.drawText(`${institutionConfig.shortName} · documento gerado em ${todayLabel()}`, {
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
    const labelLineHeight = 9;
    const labelLines = this.wrap(sanitize(label), this.bold, 7, labelWidth - 8);
    const lines = this.wrap(value, this.regular, size, valueWidth);
    const labelTotalH = labelLines.length * labelLineHeight;
    const valueTotalH = lines.length * lineHeight;
    const rowHeight = Math.max(18, Math.max(labelTotalH, valueTotalH) + 4);
    this.ensure(rowHeight + 4);

    this.page.drawLine({
      start: { x: MARGIN_X, y: this.y + 2 },
      end: { x: PAGE_W - MARGIN_X, y: this.y + 2 },
      thickness: 0.4,
      color: COLORS.border,
    });
    labelLines.forEach((line, index) => {
      this.page.drawText(line, {
        x: MARGIN_X + 4,
        y: this.y - 9 - index * labelLineHeight,
        size: 7,
        font: this.bold,
        color: COLORS.soft,
      });
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
    this.text(`- ${text}`, { size: 9, indent: 4, maxWidth: CONTENT_W - 4 });
  }

  table(headers: string[], rows: string[][], widths: number[]) {
    this.tableRow(headers, widths, true, 0.94);
    rows.forEach((row, index) => {
      this.tableRow(row, widths, false, index % 2 === 0 ? 1 : 0.985);
    });
  }

  /** Renders a full-width header row with a darker background for a criteria block (ANEXO IV). */
  criterioHeader(label: string) {
    this.ensure(24);
    this.page.drawRectangle({
      x: MARGIN_X,
      y: this.y - 4,
      width: CONTENT_W,
      height: 18,
      color: rgb(0.78, 0.78, 0.78),
      borderColor: COLORS.border,
      borderWidth: 0.7,
    });
    this.page.drawText(sanitize(label), {
      x: MARGIN_X + 6,
      y: this.y + 1,
      size: 7.5,
      font: this.bold,
      color: COLORS.text,
    });
    this.y -= 22;
  }

  /**
   * Renders a subtotal/total row spanning the full width. The label appears
   * right-aligned up to the last two columns, and the value in the 5th column
   * slot. Pass `grand=true` for the TOTAL row (bolder styling).
   */
  subtotalRow(label: string, value: string, colOffsets: number[], grand = false) {
    const rowH = grand ? 28 : 16;
    this.ensure(rowH + 4);
    const shade = grand ? 0.86 : 0.93;
    this.page.drawRectangle({
      x: MARGIN_X,
      y: this.y - rowH + 4,
      width: CONTENT_W,
      height: rowH,
      color: rgb(shade, shade, shade),
      borderColor: COLORS.border,
      borderWidth: grand ? 0.7 : 0.4,
    });
    const font = grand ? this.bold : this.bold;
    const size = grand ? 8.5 : 7.5;
    const labelX = MARGIN_X + CONTENT_W * colOffsets[0] - (grand ? 4 : 40);
    const valueX = MARGIN_X + CONTENT_W * colOffsets[1] + 4;
    const textY = grand ? this.y - rowH / 2 - 3 : this.y - 1;

    if (grand) {
      // First line: italic note
      this.page.drawText('(Critério I + Critério II + Critério III + Critério IV + Critério V + Critério VI)', {
        x: MARGIN_X + 8,
        y: this.y - 6,
        size: 6,
        font: this.regular,
        color: COLORS.muted,
      });
    }
    this.page.drawText(sanitize(label), {
      x: labelX,
      y: textY,
      size,
      font,
      color: COLORS.text,
    });
    this.page.drawText(sanitize(value), {
      x: valueX,
      y: textY,
      size,
      font,
      color: COLORS.text,
    });
    this.y -= rowH + 4;
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

export async function generateRequerimentoFormal(
  servidor: Servidor,
  nivelPleiteado: NivelRsc | null,
  processo: ProcessoRSC,
  totalPontos: number,
  itensDistintos: number,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const writer = new Writer({
    doc,
    title: 'Requerimento - RSC-PCCTAE',
    subtitle: 'Modelo para Reconhecimento de Saberes e Competências',
    footerRight: `${servidor.siape} · Requerimento`,
  });
  await writer.init();

  const nivelRoman = (() => {
    if (!nivelPleiteado) return '';
    const match = nivelPleiteado.label.match(/([IVX]+)$/);
    return match ? match[1] : '';
  })();

  const nivelCheckboxes = ['I', 'II', 'III', 'IV', 'V', 'VI']
    .map((roman) => `( ${roman === nivelRoman ? 'X' : ' '} ) RSC-${roman}`)
    .join('  ');

  const nivelClass = servidor.nivel_classificacao ?? 'C';
  const nivelClassStr = ['A', 'B', 'C', 'D', 'E']
    .map((l) => `${l} ( ${nivelClass === l ? 'X' : ' '} )`)
    .join('   ');

  writer.section('1. Identificação do Servidor');
  writer.keyValue('Nome:', sanitize(servidor.nome_completo));
  writer.keyValue('SIAPE:', sanitize(servidor.siape));
  writer.keyValue('Cargo:', sanitize(servidor.cargo ?? '-'));
  writer.keyValue('Data de ingresso em IFE:', sanitize(formatDate(servidor.data_ingresso_ife || servidor.data_ingresso)));
  writer.keyValue('Nível de Classificação:', nivelClassStr);
  writer.keyValue('Lotação:', sanitize(servidor.lotacao ?? '-'));
  writer.keyValue('Função/Encargo:', sanitize(servidor.funcao_encargo ?? '-'));
  writer.keyValue('Telefone/E-mail:', sanitize([servidor.telefone, servidor.email_institucional].filter(Boolean).join(' / ') || '-'));

  const excedente = nivelPleiteado ? Math.max(0, totalPontos - nivelPleiteado.pontosMinimos) : 0;

  writer.section('2. Informações do Requerimento');
  writer.keyValue('Nível RSC pretendido:', nivelCheckboxes);
  writer.keyValue('Pontuação mínima:', nivelPleiteado ? `${nivelPleiteado.pontosMinimos}` : '-');
  writer.keyValue('Pontuação total:', `${formatNumber(totalPontos)} pts`);
  writer.keyValue('Qtd. critérios utilizados:', `${itensDistintos}`);
  writer.keyValue('Pontuação excedente:', excedente > 0 ? `${formatNumber(excedente)} pts` : '-');
  writer.keyValue('Saldo anterior:', processo.saldo_concessao_anterior ? `${formatNumber(processo.saldo_concessao_anterior)} pts` : '0 pts');
  writer.keyValue('Processo anterior:', sanitize(processo.numero_processo_anterior ?? '—'));

  writer.section('3. Declaração de Conformidade Legal');
  writer.text('Declaro, para os fins previstos no Decreto regulamentador do RSC-PCCTAE, que:', { size: 9 });
  writer.bullet('Todos os fatos apresentados ocorreram no exercício da carreira;');
  writer.bullet('Nenhuma atividade aqui declarada foi utilizada em requerimentos anteriores;');
  writer.bullet('Toda a documentação anexada é autêntica e comprova integralmente as atividades;');
  writer.bullet('Tenho ciência de que informações falsas implicam responsabilidade administrativa.');

  writer.gap(16);
  writer.text('Assinatura: ___________________________________________________', { size: 9 });
  writer.gap(6);
  writer.text('Data: ______ / ______ / __________', { size: 9 });

  return doc.save();
}


export async function generateMemorialDescritivo(
  servidor: Servidor,
  nivelElegivel: NivelRsc | null,
  lancamentos: Lancamento[],
  itensRSC: ItemRSC[],
  documentos: Documento[],
  processo?: ProcessoRSC,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const writer = new Writer({
    doc,
    title: 'Memorial Descritivo - RSC-PCCTAE',
    subtitle: 'Relatório circunstanciado de saberes e competências',
    footerRight: `${servidor.siape} · Memorial`,
  });
  await writer.init();

  writer.text('ANEXO IV', { align: 'center', bold: true, size: 14, lineHeight: 18 });
  writer.text('MODELO DE MEMORIAL - RSC-PCCTAE', { align: 'center', bold: true, size: 11 });
  writer.gap(12);

  const totalPontos = sumPointValues(lancamentos.map((entry) => entry.pontos_calculados));
  const itensDistintos = new Set(lancamentos.map((entry) => entry.item_rsc_id)).size;

  writer.section('1. Identificação do Servidor');
  const nivelClass = servidor.nivel_classificacao ?? 'C';
  const nivelClassStr = ['A', 'B', 'C', 'D', 'E']
    .map((l) => `${l} ( ${nivelClass === l ? 'X' : ' '} )`)
    .join('   ');

  writer.keyValue('Nome:', sanitize(servidor.nome_completo));
  writer.keyValue('SIAPE:', sanitize(servidor.siape));
  writer.keyValue('Cargo:', sanitize(servidor.cargo ?? '-'));
  writer.keyValue('Data de ingresso em IFE:', sanitize(formatDate(servidor.data_ingresso_ife || servidor.data_ingresso)));
  writer.keyValue('Nível de Classificação:', nivelClassStr);
  writer.keyValue('Lotação:', sanitize(servidor.lotacao ?? '-'));
  writer.keyValue('Função/Encargo:', sanitize(servidor.funcao_encargo ?? '-'));
  writer.keyValue('Telefone/E-mail:', sanitize([servidor.telefone, servidor.email_institucional].filter(Boolean).join(' / ') || '-'));

  writer.section('2. Informações do Requerimento');
  const excedente = nivelElegivel ? Math.max(0, totalPontos - nivelElegivel.pontosMinimos) : 0;
  writer.keyValue('Pontuação mínima:', nivelElegivel ? `${nivelElegivel.pontosMinimos}` : '-');
  writer.keyValue('Pontuação total apresentada:', `${formatNumber(totalPontos)} pts`);
  writer.keyValue('Quantidade de critérios:', `${itensDistintos}`);
  writer.keyValue('Pontuação excedente:', excedente > 0 ? `${formatNumber(excedente)} pts` : '-');
  writer.keyValue('Saldo anterior:', processo?.saldo_concessao_anterior ? `${formatNumber(processo.saldo_concessao_anterior)} pts` : '0 pts');

  writer.section('3. Declaração de Conformidade Legal');
  writer.text('Declaro, para os fins previstos no RSC-PCCTAE, que os fatos apresentados são verídicos.', { size: 9 });

  writer.addPage();
  writer.section('4. Memorial e Descrição das Atividades');
  writer.gap(4);
  writer.text('Descrição detalhada das atividades vinculadas aos incisos do art. 4º do Decreto.', { size: 8, color: COLORS.muted });

  const CRITERIO_LABELS: Record<string, string> = {
    I: 'Participação em grupos, comissões, comitês, núcleos ou representações',
    II: 'Projetos institucionais, gestão, ensino, pesquisa, extensão, inovação ou assistência',
    III: 'Premiações e reconhecimentos públicos',
    IV: 'Responsabilidades técnico-administrativas e/ou especializadas',
    V: 'Funções ou cargos de direção e assessoramento institucional',
    VI: 'Produção, prospecção e difusão de conhecimento',
  };

  const COL_WIDTHS = [0.05, 0.38, 0.12, 0.10, 0.10, 0.25];
  const colSubtotalLabelStart = 0.05 + 0.38 + 0.12;
  const colSubtotalValueStart = 0.05 + 0.38 + 0.12 + 0.10;

  const RSC_IDS = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const docsById = new Map(documentos.map((d) => [d.id, d]));

  for (const inciso of RSC_IDS) {
    const incisoLancamentos = lancamentos.filter((l) => {
      const item = itensRSC.find((i) => i.id === l.item_rsc_id);
      return item?.inciso === inciso;
    });

    writer.criterioHeader(`Critério ${inciso} - ${CRITERIO_LABELS[inciso]}`);

    const groupedRows = new Map<string, { item: ItemRSC; points: number; docs: string[] }>();
    incisoLancamentos.forEach((l) => {
      const item = itensRSC.find((i) => i.id === l.item_rsc_id);
      if (!item) return;
      const entry = groupedRows.get(item.id) || { item, points: 0, docs: [] };
      entry.points = addPointValues(entry.points, l.pontos_calculados);
      const doc = l.documento_id ? docsById.get(l.documento_id) : undefined;
      if (doc) {
        const docLabel = `[DOC ${entry.docs.length + 1}] ${doc.nome_arquivo}`;
        entry.docs.push(docLabel);
      }
      groupedRows.set(item.id, entry);
    });

    const sortedGroups = Array.from(groupedRows.values()).sort((a, b) => a.item.numero - b.item.numero);
    const tableRows = sortedGroups.map((g) => [
      `${g.item.numero}`,
      g.item.descricao,
      `${g.docs.length} unid.`,
      formatNumber(g.item.pontos_por_unidade),
      formatNumber(g.points),
      g.docs.join('\n'),
    ]);

    writer.table(
      ['Nº', 'Critério específico', 'Unidade', 'Pts/Un', 'Subtotal', 'Documentos'],
      tableRows.length > 0 ? tableRows : [['-', 'Sem lançamentos neste critério', '-', '-', '-', '-']],
      COL_WIDTHS,
    );

    const subtotal = sortedGroups.reduce((acc, g) => addPointValues(acc, g.points), 0);
    writer.subtotalRow(`Subtotal CRITÉRIO ${inciso}`, formatNumber(subtotal), [colSubtotalLabelStart, colSubtotalValueStart]);
    writer.gap(8);
  }

  writer.subtotalRow('TOTAL ACUMULADO', formatNumber(totalPontos), [colSubtotalLabelStart, colSubtotalValueStart], true);

  writer.gap(18);
  writer.section('6. Conclusão do Servidor');
  writer.text(`À vista das informações apresentadas, totalizo ${formatPointValue(totalPontos)} pontos.`, { size: 9 });
  writer.gap(22);
  writer.text('Assinatura: ___________________________________________________', { size: 9 });

  return doc.save();
}

export async function generateComprovacoesIndice(
  servidor: Servidor,
  grupos: ComprovacaoItemResumo[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const writer = new Writer({
    doc,
    title: 'Índice de Comprovações',
    subtitle: 'Organização do conjunto documental por item do rol de saberes e competências',
    footerRight: `${servidor.siape} · Comprovações`,
  });
  await writer.init();

  writer.section('1. Estrutura do Conjunto de Comprovações');
  writer.text(
    'As comprovações deste processo foram organizadas por item do rol de saberes. Cada arquivo desta pasta contém uma capa-resumo com a identificação do item e, quando houver, os anexos físicos correspondentes ao item.',
  );
  writer.gap(4);
  writer.text(
    'Referências de links institucionais e autodeclarações sem arquivo físico aparecem registradas na capa do respectivo item.',
    { size: 9, color: COLORS.muted },
  );

  writer.section('2. Itens com Comprovações');
  if (!grupos.length) {
    writer.text('Nenhum item possui comprovações vinculadas no momento.');
  } else {
    writer.table(
      ['Item', 'Inciso', 'Descrição', 'Lanç.', 'Docs'],
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
    title: `Comprovações - Item ${grupo.item.numero}`,
    subtitle: 'Capa-resumo do conjunto documental do item',
    footerRight: `${servidor.siape} · Item ${grupo.item.numero}`,
  });
  await writer.init();

  const subtotal = sumPointValues(grupo.lancamentos.map((entry) => entry.pontos_calculados));
  const physicalDocs = grupo.documentos.filter(
    (docItem) => docItem.caminho_storage && !docItem.nome_arquivo.endsWith('.ref') && !docItem.autodeclaracao,
  );
  const gedocDocs = grupo.documentos.filter((docItem) => (docItem.gedoc_links?.length ?? 0) > 0);
  const autodeclaracoes = grupo.documentos.filter((docItem) => docItem.autodeclaracao);

  writer.section('1. Identificação do Item');
  writer.infoGrid(
    [
      { label: 'Servidor', value: servidor.nome_completo },
      { label: 'SIAPE', value: servidor.siape },
      { label: 'Item do rol', value: `Item ${grupo.item.numero}` },
      { label: 'Inciso', value: `Inciso ${grupo.item.inciso}` },
    ],
    4,
  );
  writer.keyValue('Descrição do item', grupo.item.descricao);
  writer.keyValue('Pontuação consolidada no item', `${formatNumber(subtotal)} pontos`);

  writer.section('2. Lançamentos Vinculados');
  writer.table(
    ['Período', 'Quantidade', 'Pontos', 'Documento'],
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

  writer.section('3. Composição do Dossiê');
  writer.keyValue('Arquivos físicos anexados', `${physicalDocs.length}`);
  writer.keyValue('Referências de links institucionais', `${gedocDocs.length}`);
  writer.keyValue('Autodeclarações', `${autodeclaracoes.length}`);

  if (gedocDocs.length) {
    writer.gap(4);
    writer.text('Referências de links institucionais:', { bold: true, size: 9 });
    gedocDocs.forEach((docItem) => {
      writer.text(docItem.nome_arquivo, { size: 8.5, bold: true, indent: 8 });
      docItem.gedoc_links?.forEach((link) => {
        writer.text(link, { size: 8, indent: 14, color: COLORS.muted });
      });
    });
  }

  if (autodeclaracoes.length) {
    writer.gap(4);
    writer.text('Registros por autodeclaração:', { bold: true, size: 9 });
    autodeclaracoes.forEach((docItem) => {
      writer.text(`${docItem.nome_arquivo} - sem arquivo físico anexo.`, {
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
    title: 'Ficha de Consolidação - RSC-TAE',
    subtitle: 'Resumo técnico da pontuação e dos itens consolidados do processo',
    footerRight: `${servidor.siape} · ${nivelElegivel?.label ?? 'RSC-TAE'}`,
  });
  await writer.init();

  const totalPontos = sumPointValues(lancamentos.map((entry) => entry.pontos_calculados));
  const itensDistintos = new Set(lancamentos.map((entry) => entry.item_rsc_id)).size;

  writer.section('1. Identificação do Servidor');
  writer.infoGrid(
    [
      { label: 'Nome', value: servidor.nome_completo },
      { label: 'SIAPE', value: servidor.siape },
      { label: 'Lotação', value: servidor.lotacao || '-' },
      { label: 'Escolaridade atual', value: servidor.escolaridade_atual || '-' },
    ],
    4,
  );

  writer.section('2. Dados do Pedido');
  writer.infoGrid(
    [
      { label: 'Nível pleiteável', value: nivelElegivel?.label ?? '-' },
      { label: 'Equivalência', value: nivelElegivel?.equivalencia ?? '-' },
      { label: 'Pontuação total', value: `${formatNumber(totalPontos)} pts` },
      { label: 'Itens distintos', value: `${itensDistintos}` },
    ],
    4,
  );

  writer.section('3. Itens Consolidados');
  if (!lancamentos.length) {
    writer.text('Nenhum item consolidado até o momento.');
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
    writer.table(['Item', 'Inc.', 'Descrição', 'Qtd.', 'Pontos'], rows, [0.08, 0.08, 0.52, 0.12, 0.2]);
  }

  return doc.save();
}
