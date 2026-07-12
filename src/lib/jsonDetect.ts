/**
 * Detecção determinística e leve de estrutura JSON.
 *
 * Retorna `true` se o texto parece conter JSON válido (mesmo cercado por
 * texto ou cercas de código). A checagem é intencionalmente tolerante —
 * serve apenas como aviso visual para o usuário, não como validação real.
 */
export function pareceJson(texto: string): boolean {
  const t = texto.trim();
  if (t.length === 0) return false;

  // Remove cercas ```json ... ``` ou ``` ... ```
  const semCerca = t.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();

  // Deve conter pelo menos uma chave e um valor
  if (!semCerca.includes('{')) return false;
  if (!semCerca.includes(':')) return false;
  if (!semCerca.includes('}')) return false;

  // Tentar parse direto
  try {
    JSON.parse(semCerca);
    return true;
  } catch {
    // Falhou parse direto — pode ter texto em volta
  }

  // Procurar primeiro { e último } balanceados
  const inicio = semCerca.indexOf('{');
  const fim = semCerca.lastIndexOf('}');
  if (inicio < 0 || fim <= inicio) return false;

  const candidato = semCerca.slice(inicio, fim + 1);

  // Verificar balanceamento básico de chaves
  let profundidade = 0;
  let emString = false;
  let escape = false;
  for (let i = 0; i < candidato.length; i++) {
    const c = candidato[i];
    if (escape) { escape = false; continue; }
    if (c === '\\' && emString) { escape = true; continue; }
    if (c === '"') { emString = !emString; continue; }
    if (emString) continue;
    if (c === '{') profundidade++;
    if (c === '}') profundidade--;
  }
  if (profundidade !== 0) return false;

  // Deve conter pelo menos uma "chave": valor
  return /"[^"]+"\s*:/.test(candidato);
}
