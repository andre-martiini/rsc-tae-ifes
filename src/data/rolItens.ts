import type { Inciso, ItemRSC } from './mock';

export const rolItensRSC: ItemRSC[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // ANEXO I — INCISO I
  // Grupos de trabalho, comissões, comitês, núcleos e representações
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'item-1',
    numero: 1,
    inciso: 'I',
    descricao: 'Membro de Conselho Superior ou de Unidade Acadêmica',
    unidade_medida: 'Por mandato',
    pontos_por_unidade: 15,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Exercício do mandato como membro de Conselhos Superiores e Conselhos de Unidades Acadêmicas das Instituições Federais de Ensino.',
    documentos_comprobatorios:
      'Portaria ou resolução de designação para o mandato, editada pela IFE; ata de posse ou declaração emitida pelo órgão colegiado atestando o exercício do mandato com indicação do período.',
  },
  {
    id: 'item-2',
    numero: 2,
    inciso: 'I',
    descricao: 'Coordenação ou presidência de núcleo, GT, comissão ou comitê',
    unidade_medida: 'Por designação',
    pontos_por_unidade: 4.5,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Coordenação ou presidência de núcleos, representações, grupos de trabalho ou similares, comissões ou comitês previstos no âmbito da administração pública, regularmente instituídos.',
    documentos_comprobatorios:
      'Portaria ou ato normativo de designação emitido pela IFE ou órgão competente, indicando o servidor como coordenador ou presidente do colegiado, com identificação do colegiado e período de atuação.',
  },
  {
    id: 'item-3',
    numero: 3,
    inciso: 'I',
    descricao: 'Membro de núcleo, GT, comissão ou comitê',
    unidade_medida: 'Por designação',
    pontos_por_unidade: 3,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Participação como membro de núcleos, representações, grupos de trabalho ou similares, comissões ou comitês previstos no âmbito da administração pública, regularmente instituídos.',
    documentos_comprobatorios:
      'Portaria ou ato normativo de designação emitido pela IFE ou órgão competente, indicando o servidor como membro do colegiado, com identificação do colegiado e período de atuação.',
  },
  {
    id: 'item-4',
    numero: 4,
    inciso: 'I',
    descricao: 'Membro de equipe em processos de apuração (sindicância, PAD, TCE)',
    unidade_medida: 'Por designação',
    pontos_por_unidade: 15,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Participação como membro de equipe designada em processos de apuração de materialidade e responsabilidade, como sindicância, processo administrativo disciplinar e tomada de contas especial.',
    documentos_comprobatorios:
      'Portaria de designação para a comissão ou equipe de apuração, emitida pela autoridade competente da IFE, com identificação da natureza do processo e do período de atuação.',
  },
  {
    id: 'item-5',
    numero: 5,
    inciso: 'I',
    descricao: 'Organização ou execução de processo seletivo, vestibular ou concurso',
    unidade_medida: 'Por edital',
    pontos_por_unidade: 4.5,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Atuação em atividades de organização e execução de exame de seleção, vestibular ou concursos.',
    documentos_comprobatorios:
      'Portaria de designação ou declaração emitida pela IFE atestando a atuação do servidor na organização ou execução do certame, com identificação do edital correspondente.',
  },
  {
    id: 'item-6',
    numero: 6,
    inciso: 'I',
    descricao: 'Elaboração, revisão ou correção de provas de seleção, vestibular ou concurso',
    unidade_medida: 'Por edital',
    pontos_por_unidade: 3,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Atuação em atividades de elaboração, revisão e/ou correção de provas de exame de seleção, vestibular ou concursos.',
    documentos_comprobatorios:
      'Portaria de designação ou declaração emitida pela IFE atestando a atuação do servidor na elaboração, revisão ou correção das provas, com identificação do edital correspondente.',
  },
  {
    id: 'item-7',
    numero: 7,
    inciso: 'I',
    descricao: 'Mandato em entidade sindical representativa da categoria',
    unidade_medida: 'Por mandato',
    pontos_por_unidade: 7.5,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Exercício de mandato em entidade sindical representativa da categoria dos servidores técnico-administrativos em educação.',
    documentos_comprobatorios:
      'Documento oficial da entidade sindical comprovando a eleição e o exercício do mandato, com indicação do cargo e do período; ou declaração da diretoria da entidade com reconhecimento institucional.',
  },
  {
    id: 'item-8',
    numero: 8,
    inciso: 'I',
    descricao: 'Membro em programa ou política pública na área de atuação',
    unidade_medida: 'Por designação',
    pontos_por_unidade: 3,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Participação como membro em programas e políticas públicas vinculadas à sua área de atuação.',
    documentos_comprobatorios:
      'Portaria ou ato de designação emitido por órgão competente indicando a participação do servidor no programa ou política pública, com identificação do programa e período de atuação.',
  },
  {
    id: 'item-9',
    numero: 9,
    inciso: 'I',
    descricao: 'Representação legal ou responsabilidade técnica junto a órgãos externos',
    unidade_medida: 'Por designação',
    pontos_por_unidade: 7.5,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Representação legal da instituição ou responsabilidade técnica junto a órgãos de fiscalização, controle e regulação, ou junto a qualquer outra entidade pública.',
    documentos_comprobatorios:
      'Portaria ou ato de designação formal emitido pela autoridade máxima da IFE, indicando o servidor como representante legal ou responsável técnico perante o órgão externo, com identificação do órgão e do objeto da representação.',
  },
  {
    id: 'item-10',
    numero: 10,
    inciso: 'I',
    descricao: 'Trabalho em órgão estatal, paraestatal, escola de governo ou organismo internacional',
    unidade_medida: 'Por produto',
    pontos_por_unidade: 4.5,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Trabalho desenvolvido em órgãos estatais e/ou paraestatais, escolas de governo, agências reguladoras, organismos internacionais.',
    documentos_comprobatorios:
      'Relatório técnico, parecer, nota técnica, projeto ou outro produto resultante da atuação, acompanhado de declaração do órgão receptor atestando a participação do servidor e a entrega do produto.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ANEXO II — INCISO II
  // Projetos institucionais, ensino, pesquisa, extensão e inovação
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'item-11',
    numero: 11,
    inciso: 'II',
    descricao: 'Liderança de projeto institucional',
    unidade_medida: 'Por projeto',
    pontos_por_unidade: 7.5,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Liderança de projetos institucionais nas áreas de ensino, pesquisa, extensão, gestão e inovação.',
    documentos_comprobatorios:
      'Portaria ou ato de designação como coordenador ou líder do projeto; relatório técnico de execução do projeto assinado pelo servidor e pela chefia imediata, com indicação dos resultados alcançados.',
  },
  {
    id: 'item-12',
    numero: 12,
    inciso: 'II',
    descricao: 'Participação técnica ou especializada em projeto, programa ou ação institucional',
    unidade_medida: 'Por projeto',
    pontos_por_unidade: 4.5,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Participação em atividades técnicas e/ou especializadas em projetos, programas e/ou ações institucionais nas áreas de ensino, pesquisa, extensão, gestão e inovação.',
    documentos_comprobatorios:
      'Portaria ou ato de designação para o projeto ou programa; declaração da coordenação do projeto atestando a participação do servidor, com identificação das atividades desempenhadas e do período de participação.',
  },
  {
    id: 'item-13',
    numero: 13,
    inciso: 'II',
    descricao: 'Membro de comissão ou conselho editorial',
    unidade_medida: 'Por mandato',
    pontos_por_unidade: 7.5,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Participação em comissão/conselho editorial de livros, revistas ou publicações científicas ou outras publicações acadêmicas.',
    documentos_comprobatorios:
      'Portaria de designação ou carta de nomeação emitida pelo órgão responsável pela publicação, atestando a participação do servidor na comissão ou conselho editorial, com indicação do veículo e período do mandato.',
  },
  {
    id: 'item-14',
    numero: 14,
    inciso: 'II',
    descricao: 'Cooperação Técnica Interinstitucional em projeto',
    unidade_medida: 'Por projeto',
    pontos_por_unidade: 3,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Participação em atividade de Cooperação Técnica Interinstitucional em projetos institucionais.',
    documentos_comprobatorios:
      'Instrumento formal de cooperação técnica (convênio, acordo, termo de cooperação) com identificação das instituições envolvidas; declaração da coordenação do projeto atestando a participação do servidor e as atividades desempenhadas.',
  },
  {
    id: 'item-15',
    numero: 15,
    inciso: 'II',
    descricao: 'Orientação, tutoria, preceptoria ou supervisão',
    unidade_medida: 'Por designação',
    pontos_por_unidade: 3,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Participação em atividades de orientação, tutoria, preceptoria ou supervisão de discentes, estagiários ou servidores em formação.',
    documentos_comprobatorios:
      'Declaração ou certificado emitido pela IFE atestando a atuação do servidor como orientador, tutor, preceptor ou supervisor, com identificação do orientando, da modalidade e do período; ou portaria de designação para a função.',
  },
  {
    id: 'item-16',
    numero: 16,
    inciso: 'II',
    descricao: 'Produção ou reformulação de material técnico de referência ou PPP',
    unidade_medida: 'Por produto',
    pontos_por_unidade: 3,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Participação em atividades de produção/reformulação de material acessível, técnico de referência (manuais, roteiros técnicos) e projeto político-pedagógico.',
    documentos_comprobatorios:
      'Cópia do material produzido (manual, roteiro técnico, PPP ou similar) com identificação da autoria do servidor; declaração da chefia imediata ou da unidade responsável atestando a participação na elaboração.',
  },
  {
    id: 'item-17',
    numero: 17,
    inciso: 'II',
    descricao: 'Jurado ou avaliador em evento acadêmico, científico, cultural, esportivo ou técnico',
    unidade_medida: 'Por evento',
    pontos_por_unidade: 3,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Participação em atividade de avaliação de trabalho ou atuação como jurado em eventos acadêmicos, científicos, culturais, esportivos e técnicos.',
    documentos_comprobatorios:
      'Declaração ou certificado emitido pela organização do evento atestando a atuação do servidor como avaliador ou jurado, com identificação do evento, da modalidade e da data.',
  },
  {
    id: 'item-18',
    numero: 18,
    inciso: 'II',
    descricao: 'Produção audiovisual, exposição, podcast ou outras formas de apresentação',
    unidade_medida: 'Por projeto',
    pontos_por_unidade: 3,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Participação em atividade de produção audiovisual, exposição, podcast ou outras formas de apresentação de conteúdo institucional.',
    documentos_comprobatorios:
      'Link ou cópia do produto audiovisual, exposição ou episódio publicado, com identificação da autoria ou participação do servidor; declaração da unidade responsável pela produção atestando o envolvimento do servidor.',
  },
  {
    id: 'item-19',
    numero: 19,
    inciso: 'II',
    descricao: 'Formação continuada ou ação de desenvolvimento de competências',
    unidade_medida: 'Por capacitação',
    pontos_por_unidade: 3,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Participação em programas de formação continuada e/ou ações de desenvolvimento de competências, desde que não utilizada para fins de aceleração da promoção na carreira (Incentivo à Qualificação).',
    documentos_comprobatorios:
      'Diploma, certificado ou declaração de conclusão emitido pela instituição promotora da capacitação, com identificação do programa, carga horária e período de realização.',
  },
  {
    id: 'item-20',
    numero: 20,
    inciso: 'II',
    descricao: 'Atividade técnica especializada contínua com contribuição institucional relevante',
    unidade_medida: 'Por ano ou fração acima de 6 meses',
    pontos_por_unidade: 1,
    quantidade_automatica: true,
    modo_calculo: 'auto_ano_fracao',
    regra_aceite:
      'Desempenho contínuo de atividade técnica de natureza especializada, com contribuição institucional relevante na área de atuação. A pontuação é calculada por ano completo ou fração superior a 6 meses de exercício contínuo.',
    documentos_comprobatorios:
      'Declaração da chefia imediata atestando o desempenho contínuo da atividade técnica especializada, com identificação das atividades realizadas, da relevância institucional e do período de exercício; relatório de atividades ou portaria de designação para a função especializada.',
  },
  {
    id: 'item-21',
    numero: 21,
    inciso: 'II',
    descricao: 'Participação em evento técnico, científico, cultural, esportivo ou sindical',
    unidade_medida: 'Por evento',
    pontos_por_unidade: 1,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Participação em congresso, simpósio, fórum, conferência, colóquio, mesa-redonda, workshop, seminário, mostra/feira, treinamento, atividades de apoio técnico, ações de campo ou eventos científicos, esportivos, artísticos, culturais ou sindicais, com carga horária mínima de 4 horas.',
    documentos_comprobatorios:
      'Certificado de participação ou declaração emitido pela organização do evento, com identificação do evento, modalidade de participação, carga horária e data de realização.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ANEXO III — INCISO III
  // Premiações e reconhecimentos públicos
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'item-22',
    numero: 22,
    inciso: 'III',
    descricao: 'Premiação ou distinção de âmbito internacional',
    unidade_medida: 'Por prêmio',
    pontos_por_unidade: 20,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Recebimento de premiação ou distinção de âmbito internacional, concedida em reconhecimento a projetos implementados ou a contribuições relevantes na administração pública.',
    documentos_comprobatorios:
      'Certificado, diploma ou comprovante de premiação emitido pela entidade promotora de âmbito internacional; publicação institucional ou edital do prêmio com identificação do servidor como premiado.',
  },
  {
    id: 'item-23',
    numero: 23,
    inciso: 'III',
    descricao: 'Premiação ou distinção de âmbito nacional',
    unidade_medida: 'Por prêmio',
    pontos_por_unidade: 15,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Recebimento de premiação ou distinção de âmbito nacional, concedida em reconhecimento a projetos implementados ou a contribuições relevantes na administração pública.',
    documentos_comprobatorios:
      'Certificado, diploma ou comprovante de premiação emitido pela entidade promotora de âmbito nacional; publicação institucional ou edital do prêmio com identificação do servidor como premiado.',
  },
  {
    id: 'item-24',
    numero: 24,
    inciso: 'III',
    descricao: 'Reconhecimento, menção honrosa ou premiação local ou institucional',
    unidade_medida: 'Por prêmio',
    pontos_por_unidade: 7.5,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Recebimento de reconhecimento formal, menção honrosa ou premiação de âmbito local ou institucional, concedida em reconhecimento a projetos implementados ou a contribuições relevantes na administração pública.',
    documentos_comprobatorios:
      'Portaria, certificado ou comprovante de premiação ou reconhecimento emitido pela IFE ou órgão competente local; publicação institucional com identificação do servidor como premiado ou homenageado.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ANEXO IV — INCISO IV
  // Responsabilidades técnico-administrativas e especializadas
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'item-25',
    numero: 25,
    inciso: 'IV',
    descricao: 'Atuação nos sistemas estruturantes da Administração Pública',
    unidade_medida: 'Por ano ou fração acima de 6 meses',
    pontos_por_unidade: 3,
    quantidade_automatica: true,
    modo_calculo: 'auto_ano_fracao',
    regra_aceite:
      'Atuação em atividades de execução, operação, desenvolvimento ou colaboração nos sistemas estruturantes da Administração Pública (ex.: SIAFI, SIAPE, SIC, SUAP, SEI, sistemas de gestão de RH, patrimônio, orçamento, entre outros). A pontuação é calculada por ano completo ou fração superior a 6 meses de exercício.',
    documentos_comprobatorios:
      'Portaria de designação ou declaração da chefia imediata atestando a atuação do servidor no sistema estruturante, com identificação do sistema, das atividades desempenhadas e do período de exercício.',
  },
  {
    id: 'item-26',
    numero: 26,
    inciso: 'IV',
    descricao: 'Elaboração de projeto básico, termo de referência ou equipe de planejamento de contratação',
    unidade_medida: 'Por designação',
    pontos_por_unidade: 3,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Elaboração de projeto básico ou de termo de referência, ou participação como membro da equipe de planejamento da contratação, conforme legislação vigente sobre contratações públicas.',
    documentos_comprobatorios:
      'Portaria de designação para a equipe de planejamento da contratação ou cópia do projeto básico/termo de referência com identificação da autoria ou participação do servidor; declaração da chefia ou do ordenador de despesas atestando a participação.',
  },
  {
    id: 'item-27',
    numero: 27,
    inciso: 'IV',
    descricao: 'Gestão ou fiscalização de contratos, convênios, acordos ou instrumentos correlatos',
    unidade_medida: 'Por designação',
    pontos_por_unidade: 4.5,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Exercício de atividades de gestão ou fiscalização de contratos de aquisição, serviços, convênios e acordos ou instrumentos correlatos firmados pela IFE.',
    documentos_comprobatorios:
      'Portaria de designação como gestor ou fiscal de contrato, convênio ou acordo, emitida pela IFE, com identificação do objeto gerido e do período de vigência da designação.',
  },
  {
    id: 'item-28',
    numero: 28,
    inciso: 'IV',
    descricao: 'Atividades relacionadas à licitação e suas excepcionalidades',
    unidade_medida: 'Por ano ou fração acima de 6 meses',
    pontos_por_unidade: 3,
    quantidade_automatica: true,
    modo_calculo: 'auto_ano_fracao',
    regra_aceite:
      'Exercício de atividades relacionadas à licitação e às suas excepcionalidades, incluindo participação em fases internas e externas de processos licitatórios. A pontuação é calculada por ano completo ou fração superior a 6 meses de exercício.',
    documentos_comprobatorios:
      'Portaria de designação para equipe de licitação ou declaração da chefia atestando a atuação do servidor em processos licitatórios, com identificação das atividades desempenhadas e do período de exercício.',
  },
  {
    id: 'item-29',
    numero: 29,
    inciso: 'IV',
    descricao: 'Apoio técnico especializado em saúde, acessibilidade ou diversidade',
    unidade_medida: 'Por ano ou fração acima de 6 meses',
    pontos_por_unidade: 3,
    quantidade_automatica: true,
    modo_calculo: 'auto_ano_fracao',
    regra_aceite:
      'Participação em atividades de apoio técnico especializado em ações na área de saúde, acessibilidade ou diversidade no âmbito da IFE. A pontuação é calculada por ano completo ou fração superior a 6 meses de exercício.',
    documentos_comprobatorios:
      'Portaria de designação ou declaração da chefia imediata atestando a atuação do servidor nas atividades especializadas, com identificação da área (saúde, acessibilidade ou diversidade), das atividades desempenhadas e do período de exercício.',
  },
  {
    id: 'item-30',
    numero: 30,
    inciso: 'IV',
    descricao: 'Atuação em ambiente com condições especiais de segurança, cuidado ou conformidade',
    unidade_medida: 'Por ano ou fração acima de 6 meses',
    pontos_por_unidade: 3,
    quantidade_automatica: true,
    modo_calculo: 'auto_ano_fracao',
    regra_aceite:
      'Atuação em ambientes ou processos que demandem condições especiais de segurança, cuidado ou conformidade técnica, com exigências diferenciadas em relação às atividades ordinárias do cargo. A pontuação é calculada por ano completo ou fração superior a 6 meses de exercício.',
    documentos_comprobatorios:
      'Declaração da chefia imediata ou da unidade responsável pela área, atestando a atuação do servidor em ambiente com condições especiais, com descrição das condições diferenciadas e do período de exercício; portaria de designação, quando existente.',
  },
  {
    id: 'item-31',
    numero: 31,
    inciso: 'IV',
    descricao: 'Atuação em sistemas ou processos de trabalho institucionais (ensino, pesquisa, extensão, gestão ou inovação)',
    unidade_medida: 'Por designação',
    pontos_por_unidade: 3,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Atuação em sistemas e/ou processos de trabalho institucionais no âmbito do ensino, pesquisa, extensão, gestão e inovação, com responsabilidade técnica formal pelo processo ou sistema.',
    documentos_comprobatorios:
      'Portaria de designação ou declaração da chefia imediata atestando a atuação do servidor no sistema ou processo institucional, com identificação do sistema/processo e das responsabilidades técnicas exercidas.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ANEXO V — INCISO V
  // Direção e assessoramento institucional
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'item-32',
    numero: 32,
    inciso: 'V',
    descricao: 'Exercício de cargo de direção ou assessoramento',
    unidade_medida: 'Por ano ou fração acima de 6 meses',
    pontos_por_unidade: 7.5,
    quantidade_automatica: true,
    modo_calculo: 'auto_ano_fracao',
    regra_aceite:
      'Exercício de cargo de direção (CD) ou função de assessoramento (NE) no âmbito da IFE ou de outros órgãos públicos. A pontuação é calculada por ano completo ou fração superior a 6 meses de exercício.',
    documentos_comprobatorios:
      'Portaria ou ato de nomeação ou designação para o cargo de direção ou assessoramento, publicada no Diário Oficial ou emitida pela IFE, com identificação do cargo e do período de exercício; portaria de exoneração ou dispensa, quando aplicável.',
  },
  {
    id: 'item-33',
    numero: 33,
    inciso: 'V',
    descricao: 'Substituição eventual de cargo de direção',
    unidade_medida: 'Por ano ou fração acima de 6 meses',
    pontos_por_unidade: 4.5,
    quantidade_automatica: true,
    modo_calculo: 'auto_ano_fracao',
    regra_aceite:
      'Atuação como substituto eventual de cargo de direção durante ausências ou impedimentos do titular. A pontuação é calculada por ano completo ou fração superior a 6 meses de exercício da substituição.',
    documentos_comprobatorios:
      'Portaria de designação como substituto eventual do cargo de direção, emitida pela IFE, com identificação do cargo substituído e do período de substituição; ou declaração da chefia superior atestando os períodos de substituição efetiva.',
  },
  {
    id: 'item-34',
    numero: 34,
    inciso: 'V',
    descricao: 'Exercício de função gratificada',
    unidade_medida: 'Por ano ou fração acima de 6 meses',
    pontos_por_unidade: 4.5,
    quantidade_automatica: true,
    modo_calculo: 'auto_ano_fracao',
    regra_aceite:
      'Exercício de função gratificada (FG) no âmbito da IFE. A pontuação é calculada por ano completo ou fração superior a 6 meses de exercício.',
    documentos_comprobatorios:
      'Portaria ou ato de designação para a função gratificada, emitida pela IFE, com identificação da função e do período de exercício; portaria de dispensa da função, quando aplicável.',
  },
  {
    id: 'item-35',
    numero: 35,
    inciso: 'V',
    descricao: 'Substituição eventual de função gratificada',
    unidade_medida: 'Por ano ou fração acima de 6 meses',
    pontos_por_unidade: 3,
    quantidade_automatica: true,
    modo_calculo: 'auto_ano_fracao',
    regra_aceite:
      'Atuação como substituto eventual de função gratificada durante ausências ou impedimentos do titular. A pontuação é calculada por ano completo ou fração superior a 6 meses de exercício da substituição.',
    documentos_comprobatorios:
      'Portaria de designação como substituto eventual da função gratificada, emitida pela IFE, com identificação da função substituída e do período; ou declaração da chefia superior atestando os períodos de substituição efetiva.',
  },
  {
    id: 'item-36',
    numero: 36,
    inciso: 'V',
    descricao: 'Responsável formal por setor ou unidade',
    unidade_medida: 'Por ano ou fração acima de 6 meses',
    pontos_por_unidade: 4.5,
    quantidade_automatica: true,
    modo_calculo: 'auto_ano_fracao',
    regra_aceite:
      'Atuação como responsável formal por setor, por unidade administrativa ou acadêmica, formalmente designado pela autoridade competente da IFE. A pontuação é calculada por ano completo ou fração superior a 6 meses de exercício.',
    documentos_comprobatorios:
      'Portaria de designação como responsável pelo setor ou unidade, emitida pela autoridade competente da IFE, com identificação da unidade e do período de responsabilidade.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ANEXO VI — INCISO VI
  // Produção, prospecção e difusão de conhecimento científico ou técnico
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'item-37',
    numero: 37,
    inciso: 'VI',
    descricao: 'Carta Patente',
    unidade_medida: 'Por patente',
    pontos_por_unidade: 30,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Obtenção de carta patente de invenção, modelo de utilidade ou certificado de adição de invenção registrado no INPI ou órgão equivalente nacional ou estrangeiro.',
    documentos_comprobatorios:
      'Carta patente emitida pelo INPI ou órgão equivalente, com identificação do servidor como inventor ou co-inventor; ou comprovante de concessão da patente com a publicação oficial correspondente.',
  },
  {
    id: 'item-38',
    numero: 38,
    inciso: 'VI',
    descricao: 'Desenvolvimento de protótipo ou registro de propriedade intelectual',
    unidade_medida: 'Por projeto',
    pontos_por_unidade: 25,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Participação no desenvolvimento de protótipos, depósitos e/ou registros de propriedade intelectual ou privilégio de invenção junto ao INPI ou órgão equivalente.',
    documentos_comprobatorios:
      'Comprovante de depósito ou registro de propriedade intelectual junto ao INPI ou órgão equivalente, com identificação do servidor como participante; relatório técnico do protótipo com atestado de participação emitido pela IFE.',
  },
  {
    id: 'item-39',
    numero: 39,
    inciso: 'VI',
    descricao: 'Transferência de tecnologia, licenciamento ou exploração de ativo tecnológico',
    unidade_medida: 'Por produto',
    pontos_por_unidade: 20,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Participação em transferência de tecnologia, licenciamento ou exploração de ativo tecnológico, como autor ou inventor, mediante instrumento formal.',
    documentos_comprobatorios:
      'Contrato ou instrumento formal de transferência de tecnologia, licenciamento ou exploração do ativo tecnológico, com identificação do servidor como autor ou inventor participante.',
  },
  {
    id: 'item-40',
    numero: 40,
    inciso: 'VI',
    descricao: 'Curso de educação formal superior ao exigido para o cargo (não utilizado no IQ)',
    unidade_medida: 'Por curso',
    pontos_por_unidade: 15,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Conclusão de curso de educação formal em nível superior ao exigido para o ingresso no cargo de que é titular, e que não esteja sendo utilizado para percepção do atual nível de Incentivo à Qualificação (IQ).',
    documentos_comprobatorios:
      'Diploma ou certificado de conclusão do curso de educação formal emitido por instituição de ensino reconhecida pelo MEC; declaração do servidor de que o título não está sendo utilizado para fins de Incentivo à Qualificação (IQ).',
  },
  {
    id: 'item-41',
    numero: 41,
    inciso: 'VI',
    descricao: 'Implantação ou desenvolvimento de produto, processo, técnica ou tecnologia institucional',
    unidade_medida: 'Por produto',
    pontos_por_unidade: 15,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Participação na implantação ou desenvolvimento de produto, projeto, processo, técnica ou tecnologia de interesse institucional, com resultado comprovado e relevância para a IFE.',
    documentos_comprobatorios:
      'Relatório técnico detalhado da implantação ou desenvolvimento, assinado pelo servidor e pela chefia da unidade impactada, com descrição do produto/processo/tecnologia desenvolvido e dos resultados institucionais obtidos; portaria ou ato de implementação, quando existente.',
  },
  {
    id: 'item-42',
    numero: 42,
    inciso: 'VI',
    descricao: 'Certificação profissional por órgão ou entidade competente',
    unidade_medida: 'Por certificado',
    pontos_por_unidade: 15,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Certificação profissional emitida por órgão ou entidade competente, demonstrando domínio de conhecimento técnico na área de atuação do servidor.',
    documentos_comprobatorios:
      'Certificado de certificação profissional emitido por órgão ou entidade competente, com identificação do conhecimento técnico certificado, da entidade certificadora e da validade da certificação.',
  },
  {
    id: 'item-43',
    numero: 43,
    inciso: 'VI',
    descricao: 'Liderança ou vice-liderança de grupo de pesquisa ou extensão registrado',
    unidade_medida: 'Por grupo de pesquisa',
    pontos_por_unidade: 7.5,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Atuação em atividade de liderança ou vice-liderança de grupo de pesquisa e/ou extensão devidamente registrado em órgão ou sistema oficial de reconhecimento institucional (ex.: Diretório de Grupos de Pesquisa do CNPq).',
    documentos_comprobatorios:
      'Certificado ou declaração de liderança emitido pelo sistema oficial de registro do grupo de pesquisa (ex.: CNPq); comprovante de registro do grupo com identificação do servidor como líder ou vice-líder.',
  },
  {
    id: 'item-44',
    numero: 44,
    inciso: 'VI',
    descricao: 'Membro de grupo de pesquisa registrado',
    unidade_medida: 'Por projeto',
    pontos_por_unidade: 3,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Participação como membro em grupo de pesquisa devidamente registrado em órgão ou sistema oficial de reconhecimento institucional.',
    documentos_comprobatorios:
      'Declaração do líder do grupo de pesquisa ou comprovante do sistema oficial de registro (ex.: CNPq) atestando a participação do servidor como membro, com identificação do grupo, da linha de pesquisa e do período de participação.',
  },
  {
    id: 'item-45',
    numero: 45,
    inciso: 'VI',
    descricao: 'Aprovação de projeto para captação de recursos',
    unidade_medida: 'Por projeto',
    pontos_por_unidade: 7.5,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Aprovação de projeto submetido a editais de fomento ou chamadas públicas para captação de recursos externos destinados à IFE.',
    documentos_comprobatorios:
      'Comprovante de aprovação do projeto pelo órgão financiador, com identificação do servidor como proponente ou participante; contrato, convênio ou termo de concessão do recurso, quando disponível.',
  },
  {
    id: 'item-46',
    numero: 46,
    inciso: 'VI',
    descricao: 'Publicação ou organização de livro (com ISBN e Conselho Editorial)',
    unidade_medida: 'Por produto',
    pontos_por_unidade: 20,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Publicação ou organização de livro com ISBN e aprovação por conselho editorial, em editora de reconhecimento acadêmico ou científico.',
    documentos_comprobatorios:
      'Comprovante de publicação com ISBN; página de rosto e ficha catalográfica do livro com identificação do servidor como autor ou organizador; declaração da editora ou do conselho editorial, quando necessário.',
  },
  {
    id: 'item-47',
    numero: 47,
    inciso: 'VI',
    descricao: 'Autoria ou co-autoria de capítulo de livro, artigo em revista especializada ou periódico',
    unidade_medida: 'Por publicação',
    pontos_por_unidade: 7.5,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Autoria ou co-autoria de capítulo de livro, de artigo publicado em revista especializada, jornal científico ou periódico indexado.',
    documentos_comprobatorios:
      'Comprovante de publicação do artigo ou capítulo com identificação do servidor como autor ou co-autor (DOI, link da publicação, cópia da página com dados bibliográficos completos); certificado ou declaração da editora ou periódico, quando necessário.',
  },
  {
    id: 'item-48',
    numero: 48,
    inciso: 'VI',
    descricao: 'Apresentação de trabalho em congresso, seminário ou outros eventos',
    unidade_medida: 'Por produto',
    pontos_por_unidade: 4.5,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Apresentação de trabalho (oral ou pôster) em congresso, seminário ou outros eventos técnicos ou científicos com publicação de anais ou atas.',
    documentos_comprobatorios:
      'Certificado de apresentação do trabalho emitido pela organização do evento, com identificação do evento, do trabalho apresentado e da modalidade de apresentação; cópia da publicação nos anais ou atas do evento, quando disponível.',
  },
  {
    id: 'item-49',
    numero: 49,
    inciso: 'VI',
    descricao: 'Produção de material técnico, científico, metodológico ou administrativo estruturado',
    unidade_medida: 'Por produto',
    pontos_por_unidade: 4.5,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Produção de material técnico, científico, metodológico ou administrativo estruturado, com relevância institucional comprovada e identificação formal de autoria.',
    documentos_comprobatorios:
      'Cópia do material produzido (relatório, manual, metodologia, instrução normativa, procedimento operacional, etc.) com identificação da autoria do servidor; declaração da chefia ou da unidade responsável atestando a relevância e o uso institucional do material.',
  },
  {
    id: 'item-50',
    numero: 50,
    inciso: 'VI',
    descricao: 'Avaliação de projeto de ensino, pesquisa, extensão ou inovação',
    unidade_medida: 'Por projeto',
    pontos_por_unidade: 4.5,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Participação em atividade de avaliação do projeto de ensino e/ou pesquisa e/ou extensão e/ou inovação como avaliador ad hoc ou membro de comissão de avaliação.',
    documentos_comprobatorios:
      'Declaração ou certificado emitido pelo órgão promotor da avaliação, atestando a participação do servidor como avaliador, com identificação do projeto avaliado e da data de avaliação.',
  },
  {
    id: 'item-51',
    numero: 51,
    inciso: 'VI',
    descricao: 'Difusão ou apoio à formação institucional (expositor, facilitador, colaborador)',
    unidade_medida: 'Por evento',
    pontos_por_unidade: 3,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Participação em atividade de difusão ou apoio à formação institucional na condição de expositor, facilitador ou colaborador.',
    documentos_comprobatorios:
      'Certificado ou declaração emitido pela organização do evento, atestando a atuação do servidor como expositor, facilitador ou colaborador, com identificação do evento, da modalidade de participação, carga horária e data.',
  },
  {
    id: 'item-52',
    numero: 52,
    inciso: 'VI',
    descricao: 'Instrutor, tutor, palestrante, autor técnico ou orientador em ação formativa estruturada',
    unidade_medida: 'Por curso',
    pontos_por_unidade: 4.5,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Atuação como instrutor, tutor, palestrante, autor técnico ou orientador em ação formativa estruturada, como curso, treinamento, oficina ou capacitação formal.',
    documentos_comprobatorios:
      'Declaração ou certificado de instrutoria, tutoria ou autoria emitido pela organização da ação formativa, com identificação do curso, da carga horária, do período de realização e da função desempenhada pelo servidor.',
  },
  {
    id: 'item-53',
    numero: 53,
    inciso: 'VI',
    descricao: 'Coordenação ou mediação de fórum, congresso, mesa-redonda, simpósio ou seminário',
    unidade_medida: 'Por evento',
    pontos_por_unidade: 4.5,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Atuação na coordenação ou mediação de fórum, congresso, mesa-redonda, simpósio, seminário e outros eventos técnicos ou científicos.',
    documentos_comprobatorios:
      'Declaração ou certificado emitido pela organização do evento, atestando a atuação do servidor como coordenador ou mediador, com identificação do evento, da sessão ou mesa e da data.',
  },
  {
    id: 'item-54',
    numero: 54,
    inciso: 'VI',
    descricao: 'Orientação ou coorientação de TCC ou monografia',
    unidade_medida: 'Por evento',
    pontos_por_unidade: 7.5,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Exercício de atividade de orientação ou coorientação de trabalho de conclusão de curso ou monografia em diferentes modalidades de ensino (graduação, especialização, MBA, mestrado ou doutorado).',
    documentos_comprobatorios:
      'Declaração ou certificado de orientação emitido pela IFE ou pela coordenação do programa, com identificação do orientando, do trabalho, da modalidade de ensino e da data de defesa; capa e folha de aprovação do trabalho com identificação do orientador.',
  },
  {
    id: 'item-55',
    numero: 55,
    inciso: 'VI',
    descricao: 'Autoria de obra artística ou cultural registrada',
    unidade_medida: 'Por produto',
    pontos_por_unidade: 3,
    quantidade_automatica: false,
    modo_calculo: 'manual',
    regra_aceite:
      'Autoria de obra artística e/ou cultural devidamente registrada em órgão competente (ex.: Biblioteca Nacional, ECAD, INPI ou similar).',
    documentos_comprobatorios:
      'Comprovante de registro da obra junto ao órgão competente (Biblioteca Nacional, ECAD, INPI ou similar), com identificação do servidor como autor; cópia da obra ou publicação com identificação da autoria.',
  },
  {
    id: 'item-56',
    numero: 56,
    inciso: 'VI',
    descricao: 'Atuação no enfrentamento de surto, epidemia ou pandemia',
    unidade_medida: 'Por mês',
    pontos_por_unidade: 1,
    quantidade_automatica: true,
    modo_calculo: 'auto_mes',
    regra_aceite:
      'Atuação direta no enfrentamento de situações de surto, epidemias e pandemia, no exercício de atividades relacionadas ao controle, prevenção ou resposta ao evento de saúde pública. A pontuação é calculada em meses de atuação.',
    documentos_comprobatorios:
      'Declaração da chefia imediata ou da unidade de saúde responsável, atestando a atuação do servidor nas ações de enfrentamento, com identificação do evento de saúde pública, das atividades desempenhadas e do período de atuação; portaria de designação para força-tarefa ou comitê de crise, quando existente.',
  },
];
