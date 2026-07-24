export const SCORE_MARGIN_MULTIPLIER = 1.25;

export function getScoreMarginThreshold(minimumPoints: number): number {
  return minimumPoints * SCORE_MARGIN_MULTIPLIER;
}

export function shouldShowScoreMarginAlert(params: {
  totalPoints: number;
  minimumPoints: number;
  requiredDocumentsComplete: boolean;
  dismissed: boolean;
}): boolean {
  const {
    totalPoints,
    minimumPoints,
    requiredDocumentsComplete,
    dismissed,
  } = params;

  return (
    minimumPoints > 0 &&
    requiredDocumentsComplete &&
    !dismissed &&
    totalPoints >= getScoreMarginThreshold(minimumPoints)
  );
}

export function readDismissedScoreMarginLevels(raw: string | null): string[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((levelId): levelId is string => typeof levelId === 'string')
      : [];
  } catch {
    return [];
  }
}
