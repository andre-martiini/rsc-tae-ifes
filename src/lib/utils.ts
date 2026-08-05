import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata com segurança strings de data (ex: '2006-08-01' ou ISO) para 'dd/mm/aaaa',
 * evitando desvios de fuso horário causados pelo parse automático UTC-0 do `new Date()`.
 */
export function formatarDataSegura(dataStr?: string, fallback: string = '—'): string {
  if (!dataStr) return fallback;
  
  // Se for formato YYYY-MM-DD
  const match = dataStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, ano, mes, dia] = match;
    return `${dia}/${mes}/${ano}`;
  }
  
  const date = new Date(dataStr);
  if (Number.isNaN(date.getTime())) return dataStr;
  return date.toLocaleDateString('pt-BR');
}

/**
 * Cria um objeto Date no fuso horário local do navegador a partir de uma string 'YYYY-MM-DD' (com ou sem time),
 * evitando desvios de fuso horário.
 */
export function parseLocalDate(dateString: string): Date {
  if (!dateString) return new Date();
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match.map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateString);
}

/**
 * Limpa strings dinâmicas substituindo todos os espaços por underscores e removendo acentos.
 */
export function sanitizeForTag(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
}

/**
 * Sanitiza texto livre (ex.: observa\u00e7\u00e3o de um lan\u00e7amento) para grava\u00e7\u00e3o na
 * tag oculta `[RSC:OBSERVACAO:...]`, desenhada com a fonte Courier padr\u00e3o do
 * pdf-lib: remove acentos e converte pontua\u00e7\u00e3o tipogr\u00e1fica (aspas curvas,
 * travess\u00e3o, retic\u00eancias) para equivalentes ASCII, e descarta qualquer
 * caractere remanescente fora do intervalo ASCII imprim\u00edvel \u2014 sem isso, a
 * fonte grava bytes que n\u00e3o sobrevivem \u00e0 extra\u00e7\u00e3o de texto do PDF. Tamb\u00e9m
 * remove colchetes e quebras de linha, que quebrariam o parser de tags
 * `[RSC:CHAVE:valor]`. Diferente de sanitizeForTag, preserva espa\u00e7os e
 * pontua\u00e7\u00e3o b\u00e1sica: o valor \u00e9 lido por humanos, n\u00e3o usado como identificador.
 */
export function sanitizeObservacaoForTag(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[[\]]/g, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normaliza textos para buscas e comparações (remove acentos, caracteres especiais, capitalização e espaços extras).
 */
export function normalizeText(text?: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

