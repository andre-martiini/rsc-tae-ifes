import { describe, expect, it } from 'vitest';
import {
  getScoreMarginThreshold,
  readDismissedScoreMarginLevels,
  shouldShowScoreMarginAlert,
} from './scoreMarginAlert';

describe('score margin alert', () => {
  it('calcula a margem de 25% sobre a pontuação mínima', () => {
    expect(getScoreMarginThreshold(52)).toBe(65);
  });

  it('é exibido ao atingir exatamente 125% da pontuação mínima', () => {
    expect(shouldShowScoreMarginAlert({
      totalPoints: 37.5,
      minimumPoints: 30,
      requiredDocumentsComplete: true,
      dismissed: false,
    })).toBe(true);
  });

  it('não é exibido antes do limiar, com documentos pendentes ou após dispensa', () => {
    expect(shouldShowScoreMarginAlert({
      totalPoints: 37.4,
      minimumPoints: 30,
      requiredDocumentsComplete: true,
      dismissed: false,
    })).toBe(false);
    expect(shouldShowScoreMarginAlert({
      totalPoints: 40,
      minimumPoints: 30,
      requiredDocumentsComplete: false,
      dismissed: false,
    })).toBe(false);
    expect(shouldShowScoreMarginAlert({
      totalPoints: 40,
      minimumPoints: 30,
      requiredDocumentsComplete: true,
      dismissed: true,
    })).toBe(false);
  });

  it('lê somente identificadores válidos persistidos', () => {
    expect(readDismissedScoreMarginLevels('["RSC-IV", 1, null, "RSC-V"]')).toEqual([
      'RSC-IV',
      'RSC-V',
    ]);
    expect(readDismissedScoreMarginLevels('inválido')).toEqual([]);
  });
});
