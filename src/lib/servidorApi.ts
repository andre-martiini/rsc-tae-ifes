// Cloud Function no projeto comissao-rsc-tae (functions/servidor.ts); sem chave na Vercel.
const SERVIDOR_API = 'https://us-central1-comissao-rsc-tae.cloudfunctions.net/consultarServidorBase';

export interface ServidorBase {
  id: string;
  nome: string;
  matricula: string; // prefixo do SIAPE, já mascarado na fonte
  descricao_cargo: string;
  classe_cargo: string;
  cod_org_lotacao: string;
  org_lotacao: string;
  tipo_vinculo: string;
  situacao_vinculo: string;
}

/** Consulta no backend um servidor pelo nome completo exato. Devolve [] se não achar ou se o serviço falhar. */
export async function buscarServidorPorNome(nome: string, signal?: AbortSignal): Promise<ServidorBase[]> {
  try {
    const res = await fetch(`${SERVIDOR_API}?nome=${encodeURIComponent(nome)}`, { signal });
    if (!res.ok) return [];
    const data = (await res.json()) as { matches?: ServidorBase[] };
    return data.matches ?? [];
  } catch {
    return [];
  }
}
