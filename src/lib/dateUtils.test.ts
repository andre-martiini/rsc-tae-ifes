import { describe, it, expect } from 'vitest';
import { parseIsoDateStrict, validarIntervaloDatas } from './dateUtils';

describe('parseIsoDateStrict', () => {
  it('aceita data válida', () => {
    expect(parseIsoDateStrict('2020-03-15')).toBe('2020-03-15');
  });

  it('aceita 29 de fevereiro em ano bissexto', () => {
    expect(parseIsoDateStrict('2020-02-29')).toBe('2020-02-29');
  });

  it('rejeita 29 de fevereiro em ano não bissexto', () => {
    expect(parseIsoDateStrict('2021-02-29')).toBeNull();
  });

  it('rejeita 30 de fevereiro', () => {
    expect(parseIsoDateStrict('2020-02-30')).toBeNull();
  });

  it('rejeita 31 de abril', () => {
    expect(parseIsoDateStrict('2020-04-31')).toBeNull();
  });

  it('rejeita mês 13', () => {
    expect(parseIsoDateStrict('2020-13-01')).toBeNull();
  });

  it('rejeita mês 0', () => {
    expect(parseIsoDateStrict('2020-00-15')).toBeNull();
  });

  it('rejeita dia 0', () => {
    expect(parseIsoDateStrict('2020-01-00')).toBeNull();
  });

  it('rejeita formato sem hífens', () => {
    expect(parseIsoDateStrict('20200101')).toBeNull();
  });

  it('rejeita formato com barras', () => {
    expect(parseIsoDateStrict('2020/01/01')).toBeNull();
  });

  it('rejeita string vazia', () => {
    expect(parseIsoDateStrict('')).toBeNull();
  });

  it('rejeita não-string', () => {
    expect(parseIsoDateStrict(null)).toBeNull();
    expect(parseIsoDateStrict(undefined)).toBeNull();
    expect(parseIsoDateStrict(20200101)).toBeNull();
  });
});

describe('validarIntervaloDatas', () => {
  it('aceita intervalo válido', () => {
    const result = validarIntervaloDatas('2020-01-01', '2020-12-31');
    expect(result).toEqual({ inicio: '2020-01-01', fim: '2020-12-31' });
  });

  it('aceita início igual ao fim', () => {
    const result = validarIntervaloDatas('2020-06-15', '2020-06-15');
    expect(result).toEqual({ inicio: '2020-06-15', fim: '2020-06-15' });
  });

  it('rejeita início após fim', () => {
    expect(validarIntervaloDatas('2020-12-31', '2020-01-01')).toBeNull();
  });

  it('rejeita início inválido', () => {
    expect(validarIntervaloDatas('2020-02-30', '2020-12-31')).toBeNull();
  });

  it('rejeita fim inválido', () => {
    expect(validarIntervaloDatas('2020-01-01', '2020-13-01')).toBeNull();
  });
});
