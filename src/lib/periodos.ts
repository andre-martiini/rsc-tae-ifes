import { differenceInDays, isValid, parseISO } from 'date-fns';

export interface Periodo {
  inicio: string;
  fim: string;
}

export function periodoValido(periodo: Periodo): boolean {
  if (!periodo.inicio || !periodo.fim) return false;
  const start = parseISO(periodo.inicio);
  const end = parseISO(periodo.fim);
  return isValid(start) && isValid(end) && end >= start;
}

/**
 * Mescla períodos sobrepostos para que dias coincidentes entre duas
 * designações não sejam contados em duplicidade. Datas em ISO (yyyy-MM-dd),
 * portanto a comparação lexicográfica é segura.
 */
export function mesclarPeriodos(periodos: Periodo[]): Periodo[] {
  const ordenados = periodos
    .filter(periodoValido)
    .slice()
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  const mesclados: Periodo[] = [];
  for (const periodo of ordenados) {
    const ultimo = mesclados[mesclados.length - 1];
    if (ultimo && periodo.inicio <= ultimo.fim) {
      if (periodo.fim > ultimo.fim) ultimo.fim = periodo.fim;
    } else {
      mesclados.push({ ...periodo });
    }
  }
  return mesclados;
}

/** Total de dias (contagem inclusiva) dos períodos, sem sobreposição. */
export function totalDiasPeriodos(periodos: Periodo[]): number {
  return mesclarPeriodos(periodos).reduce(
    (total, periodo) => total + differenceInDays(parseISO(periodo.fim), parseISO(periodo.inicio)) + 1,
    0,
  );
}

/**
 * Interseção entre dois conjuntos de períodos — os trechos cobertos por ambos.
 * Usada para detectar quando uma sugestão repete tempo já contabilizado em um
 * lançamento existente do mesmo item.
 */
export function intersecaoPeriodos(a: Periodo[], b: Periodo[]): Periodo[] {
  const resultado: Periodo[] = [];
  for (const pa of mesclarPeriodos(a)) {
    for (const pb of mesclarPeriodos(b)) {
      const inicio = pa.inicio > pb.inicio ? pa.inicio : pb.inicio;
      const fim = pa.fim < pb.fim ? pa.fim : pb.fim;
      if (inicio <= fim) resultado.push({ inicio, fim });
    }
  }
  return mesclarPeriodos(resultado);
}

/** Soma bruta de dias, contando sobreposições em dobro (para detectar sobreposição). */
export function totalDiasBrutos(periodos: Periodo[]): number {
  return periodos
    .filter(periodoValido)
    .reduce((total, periodo) => total + differenceInDays(parseISO(periodo.fim), parseISO(periodo.inicio)) + 1, 0);
}

/**
 * "Por ano ou fração acima de seis meses" aplicado ao tempo TOTAL de exercício
 * (art. 5º e Anexos): anos completos + 1 unidade se a fração restante exceder
 * seis meses. Períodos de até 6 meses no total não pontuam.
 */
export function unidadesAnoFracao(totalDias: number): number {
  const totalMeses = totalDias / 30;
  const anosCompletos = Math.floor(totalMeses / 12);
  const fracaoMeses = totalMeses - anosCompletos * 12;
  return anosCompletos + (fracaoMeses > 6 ? 1 : 0);
}

/** Unidade "por mês": total de dias / 30, com duas casas decimais. */
export function unidadesMes(totalDias: number): number {
  return Number((totalDias / 30).toFixed(2));
}

/** Menor início e maior fim do conjunto — usado como abrangência geral do lançamento. */
export function abrangenciaPeriodos(periodos: Periodo[]): Periodo | null {
  const validos = periodos.filter(periodoValido);
  if (validos.length === 0) return null;
  return {
    inicio: validos.reduce((min, p) => (p.inicio < min ? p.inicio : min), validos[0].inicio),
    fim: validos.reduce((max, p) => (p.fim > max ? p.fim : max), validos[0].fim),
  };
}

/**
 * Períodos efetivos de um lançamento: usa a lista `periodos` quando presente e,
 * para lançamentos antigos, recai no par data_inicio/data_fim.
 */
export function periodosDoLancamento(lancamento: {
  periodos?: Periodo[];
  data_inicio?: string;
  data_fim?: string;
}): Periodo[] {
  if (lancamento.periodos && lancamento.periodos.length > 0) return lancamento.periodos;
  if (lancamento.data_inicio && lancamento.data_fim) {
    return [{ inicio: lancamento.data_inicio, fim: lancamento.data_fim }];
  }
  return [];
}
