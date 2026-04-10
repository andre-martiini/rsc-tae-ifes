export interface InstitutionDocumentLinksConfig {
  enabled: boolean;
  label: string;
  labelPlural: string;
  inputLabel: string;
  helperText: string;
  inputPlaceholder: string;
  referenceFileBaseName: string;
}

export interface InstitutionConfig {
  appName: string;
  appSubtitle: string;
  shortName: string;
  networkName: string;
  logoPath: string;
  logoAlt: string;
  emailPlaceholder: string;
  unitsLabel: string;
  units: string[];
  locationFallback: string;
  designComment: string;
  documentLinks: InstitutionDocumentLinksConfig;
}

export const institutionConfig: InstitutionConfig = {
  appName: 'Assistente RSC-TAE',
  appSubtitle: 'Reconhecimento de Saberes e Competências para Técnicos Administrativos em Educação',
  shortName: 'RSC-TAE',
  networkName: 'Rede Federal de Educação Profissional, Científica e Tecnológica',
  logoPath: '/logo_rede_federal.png',
  logoAlt: 'Marca genérica da Rede Federal',
  emailPlaceholder: 'Ex.: nome.sobrenome@instituicao.edu.br',
  unitsLabel: 'Unidade/Lotação',
  units: [
    'Reitoria',
    'Campus Sede',
    'Campus Avançado',
    'Pró-Reitoria',
    'Diretoria Sistêmica',
    'Outro setor institucional',
  ],
  locationFallback: 'Cidade/UF',
  designComment: 'Sistema visual institucional genérico da Rede Federal',
  documentLinks: {
    enabled: true,
    label: 'link institucional',
    labelPlural: 'links institucionais',
    inputLabel: 'Links institucionais',
    helperText:
      'Cole referências públicas ou internas do repositório documental da sua instituição. Os links devem direcionar para um arquivo PDF válido e serão registrados no memorial e no dossiê exportado.',
    inputPlaceholder: 'https://documentos.instituicao.edu.br/documento/identificador',
    referenceFileBaseName: 'referencias-institucionais',
  },
};

export function isValidInstitutionDocumentLink(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

export function normalizeInstitutionDocumentLink(url: string): string {
  try {
    const parsed = new URL(url.trim());

    // GEDOC/IFES sometimes appends a transient ;jsessionid path parameter that
    // breaks automated fetches even though the canonical document URL works.
    if (parsed.hostname.toLowerCase() === 'gedoc.ifes.edu.br') {
      parsed.pathname = parsed.pathname.replace(/;jsessionid=[^/?#]+/i, '');
    }

    return parsed.toString();
  } catch {
    return url.trim();
  }
}

export function buildInstitutionReferenceFileName(linkCount: number): string {
  const suffix = linkCount <= 1 ? '' : `-${linkCount}`;
  return `${institutionConfig.documentLinks.referenceFileBaseName}${suffix}.ref`;
}
