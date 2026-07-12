/**
 * Fase 6.1 — Validador de datas reais.
 *
 * `parseIsoDateStrict` verifica três níveis:
 * 1. Formato yyyy-mm-dd (regex estrito, sem zeros à esquerda omitidos);
 * 2. Data válida no calendário (rejeita 2020-02-30, 2021-13-01, etc.);
 * 3. Opcionalmente, comparação de intervalo (inicio ≤ fim).
 *
 * Retorna a string normalizada se válida, ou `null` se inválida.
 */

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Valida uma string de data ISO e retorna a string se válida, ou null.
 * Usa o construtor Date para validar o calendário real, evitando
 * falsos positivos como 2020-02-30.
 */
export function parseIsoDateStrict(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const match = value.match(ISO_DATE_RE);
  if (!match) return null;

  const ano = parseInt(match[1], 10);
  const mes = parseInt(match[2], 10);
  const dia = parseInt(match[3], 10);

  // Validações básicas de intervalo
  if (mes < 1 || mes > 12) return null;
  if (dia < 1 || dia > 31) return null;

  // Usa Date para validar o calendário real.
  // Constrói a data em UTC para evitar problemas de fuso horário.
  const d = new Date(Date.UTC(ano, mes - 1, dia));

  // Verifica se a data não foi "corrigida" pelo construtor
  // (ex.: 2020-02-30 vira 2020-03-01)
  if (d.getUTCFullYear() !== ano || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) {
    return null;
  }

  return value;
}

/**
 * Valida um par de datas (início e fim), garantindo que ambas são
 * datas reais e que início ≤ fim. Retorna o par normalizado ou null.
 */
export function validarIntervaloDatas(
  inicio: unknown,
  fim: unknown,
): { inicio: string; fim: string } | null {
  const ini = parseIsoDateStrict(inicio);
  const end = parseIsoDateStrict(fim);
  if (!ini || !end) return null;
  if (ini > end) return null;
  return { inicio: ini, fim: end };
}
