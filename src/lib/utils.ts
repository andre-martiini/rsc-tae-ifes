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
