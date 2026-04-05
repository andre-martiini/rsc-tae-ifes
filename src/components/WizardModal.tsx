import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Wand2, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

const SPARKLE_ANGLES = Array.from({ length: 10 }, (_, i) => (i / 10) * 2 * Math.PI);

interface WizardItem {
  id: string;
  label: string;
}

interface WizardEixo {
  numero: number;
  titulo: string;
  pergunta: string;
  itens: WizardItem[];
}

const EIXOS: WizardEixo[] = [
  {
    numero: 1,
    titulo: 'Gestão, Direção e Representação Institucional',
    pergunta: 'Você ocupou cargos de gestão, coordenou setores ou participou ativamente de conselhos, representações sindicais e afins?',
    itens: [
      { id: 'item-1', label: 'Exercício do mandato como membro de Conselhos Superiores e Conselhos de Unidades Acadêmicas das Instituições Federais de Ensino.' },
      { id: 'item-2', label: 'Coordenação ou presidência de núcleos, representações, grupos de trabalho ou similares, comissões ou comitês previstos no âmbito da administração pública, regularmente instituídos.' },
      { id: 'item-3', label: 'Participação como membro de núcleos, representações, grupos de trabalho ou similares, comissões ou comitês previstos no âmbito da administração pública, regularmente instituídos.' },
      { id: 'item-7', label: 'Exercício de mandato em entidade sindical representativa da categoria dos servidores técnico-administrativos em educação.' },
      { id: 'item-9', label: 'Representação legal da instituição ou responsabilidade técnica junto a órgãos de fiscalização, controle e regulação, ou junto a qualquer outra entidade pública.' },
      { id: 'item-10', label: 'Trabalho desenvolvido em órgãos estatais e/ou paraestatais, escolas de governo, agências reguladoras, organismos internacionais.' },
      { id: 'item-32', label: 'Exercício de cargo de direção (CD) ou função de assessoramento (NE) no âmbito da IFE ou de outros órgãos públicos. A pontuação é calculada por ano completo ou fração superior a 6 meses de exercício.' },
      { id: 'item-33', label: 'Atuação como substituto eventual de cargo de direção durante ausências ou impedimentos do titular. A pontuação é calculada por ano completo ou fração superior a 6 meses de exercício da substituição.' },
      { id: 'item-34', label: 'Exercício de função gratificada (FG) no âmbito da IFE. A pontuação é calculada por ano completo ou fração superior a 6 meses de exercício.' },
      { id: 'item-35', label: 'Atuação como substituto eventual de função gratificada durante ausências ou impedimentos do titular. A pontuação é calculada por ano completo ou fração superior a 6 meses de exercício da substituição.' },
      { id: 'item-36', label: 'Atuação como responsável formal por setor, por unidade administrativa ou acadêmica, formalmente designado pela autoridade competente da IFE. A pontuação é calculada por ano completo ou fração superior a 6 meses de exercício.' },
    ],
  },
  {
    numero: 2,
    titulo: 'Atividades Específicas, Sindicâncias e Contratações',
    pergunta: 'Você participou de licitações, equipes de planejamento, fiscalização de contratos, vestibulares, processos seletivos ou sindicâncias?',
    itens: [
      { id: 'item-4', label: 'Participação como membro de equipe designada em processos de apuração de materialidade e responsabilidade, como sindicância, processo administrativo disciplinar e tomada de contas especial.' },
      { id: 'item-5', label: 'Atuação em atividades de organização e execução de exame de seleção, vestibular ou concursos.' },
      { id: 'item-6', label: 'Atuação em atividades de elaboração, revisão e/ou correção de provas de exame de seleção, vestibular ou concursos.' },
      { id: 'item-26', label: 'Elaboração de projeto básico ou de termo de referência, ou participação como membro da equipe de planejamento da contratação, conforme legislação vigente sobre contratações públicas.' },
      { id: 'item-27', label: 'Exercício de atividades de gestão ou fiscalização de contratos de aquisição, serviços, convênios e acordos ou instrumentos correlatos firmados pela IFE.' },
      { id: 'item-28', label: 'Exercício de atividades relacionadas à licitação e às suas excepcionalidades, incluindo participação em fases internas e externas de processos licitatórios. A pontuação é calculada por ano completo ou fração superior a 6 meses de exercício.' },
    ],
  },
  {
    numero: 3,
    titulo: 'Projetos, Liderança Técnica e Infraestrutura',
    pergunta: 'Você atuou ou liderou projetos institucionais, cooperação técnica, captou recursos ou gerenciou sistemas estruturantes?',
    itens: [
      { id: 'item-8', label: 'Participação como membro em programas e políticas públicas vinculadas à sua área de atuação.' },
      { id: 'item-11', label: 'Liderança de projetos institucionais nas áreas de ensino, pesquisa, extensão, gestão e inovação.' },
      { id: 'item-12', label: 'Participação em atividades técnicas e/ou especializadas em projetos, programas e/ou ações institucionais nas áreas de ensino, pesquisa, extensão, gestão e inovação.' },
      { id: 'item-14', label: 'Participação em atividade de Cooperação Técnica Interinstitucional em projetos institucionais.' },
      { id: 'item-25', label: 'Atuação em atividades de execução, operation, desenvolvimento ou colaboração nos sistemas estruturantes da Administração Pública (ex.: SIAFI, SIAPE, SIC, SUAP, SEI, sistemas de gestão de RH, patrimônio, orçamento, entre outros). A pontuação é calculada por ano completo ou fração superior a 6 meses de exercício.' },
      { id: 'item-31', label: 'Atuação em sistemas e/ou processos de trabalho institucionais no âmbito do ensino, pesquisa, extensão, gestão e inovação, com responsabilidade técnica formal pelo processo ou sistema.' },
      { id: 'item-41', label: 'Participação na implantação ou desenvolvimento de produto, projeto, processo, técnica ou tecnologia de interesse institucional, com resultado comprovado e relevância para a IFE.' },
      { id: 'item-45', label: 'Aprovação de projeto submetido a editais de fomento ou chamadas públicas para captação de recursos externos destinados à IFE.' },
    ],
  },
  {
    numero: 4,
    titulo: 'Editoração, Publicações, Ensino e Eventos',
    pergunta: 'Você publicou artigos, avaliou trabalhos, produziu materiais, organizou eventos técnicos ou orientou alunos / pares?',
    itens: [
      { id: 'item-13', label: 'Participação em comissão/conselho editorial de livros, revistas ou publicações científicas ou outras publicações acadêmicas.' },
      { id: 'item-15', label: 'Participação em atividades de orientação, tutoria, preceptoria ou supervisão de discentes, estagiários ou servidores em formação.' },
      { id: 'item-16', label: 'Participação em atividades de produção/reformulação de material acessível, técnico de referência (manuais, roteiros técnicos) e projeto político-pedagógico.' },
      { id: 'item-17', label: 'Participação em atividade de avaliação de trabalho ou atuação como jurado em eventos acadêmicos, científicos, culturais, esportivos e técnicos.' },
      { id: 'item-18', label: 'Participação em atividade de produção audiovisual, exposição, podcast ou outras formas de apresentação de conteúdo institucional.' },
      { id: 'item-19', label: 'Participação em programas de formação continuada e/ou ações de desenvolvimento de competências, desde que não utilizada para fins de aceleração da promoção na carreira (Incentivo à Qualificação).' },
      { id: 'item-21', label: 'Participação em congresso, simpósio, fórum, conferência, colóquio, mesa-redonda, workshop, seminário, mostra/feira, treinamento, atividades de apoio técnico, ações de campo ou eventos científicos, esportivos, artísticos, culturais ou sindicais, com carga horária mínima de 4 horas.' },
      { id: 'item-46', label: 'Publicação ou organização de livro com ISBN e aprovação por conselho editorial, em editora de reconhecimento acadêmico ou científico.' },
      { id: 'item-47', label: 'Autoria ou co-autoria de capítulo de livro, de artigo publicado em revista especializada, jornal científico ou periódico indexado.' },
      { id: 'item-48', label: 'Apresentação de trabalho (oral ou pôster) em congresso, seminário ou outros eventos técnicos ou científicos com publicação de anais ou atas.' },
      { id: 'item-49', label: 'Produção de material técnico, científico, metodológico ou administrativo estruturado, com relevância institucional comprovada e identificação formal de autoria.' },
      { id: 'item-50', label: 'Participação em atividade de avaliação do projeto de ensino e/ou pesquisa e/ou extensão e/ou inovação como avaliador ad hoc ou membro de comissão de avaliação.' },
      { id: 'item-51', label: 'Participação em atividade de difusão ou apoio à formação institucional na condição de expositor, facilitador ou colaborador.' },
      { id: 'item-52', label: 'Atuação como instrutor, tutor, palestrante, autor técnico ou orientador em ação formativa estruturada, como curso, treinamento, oficina ou capacitação formal.' },
      { id: 'item-53', label: 'Atuação na coordenação ou mediação de fórum, congresso, mesa-redonda, simpósio, seminário e outros eventos técnicos ou científicos.' },
      { id: 'item-54', label: 'Exercício de atividade de orientação ou coorientação de trabalho de conclusão de curso ou monografia em diferentes modalidades de ensino (graduação, especialização, MBA, mestrado ou doutorado).' },
    ],
  },
  {
    numero: 5,
    titulo: 'Pesquisa, Inovação e Propriedade Intelectual',
    pergunta: 'Você obteve patentes, transferiu tecnologia, publicou software, obras artísticas ou atua em grupos de pesquisa acadêmica?',
    itens: [
      { id: 'item-37', label: 'Obtenção de carta patente de invenção, modelo de utilidade ou certificado de adição de invenção registrado no INPI ou órgão equivalente nacional ou estrangeiro.' },
      { id: 'item-38', label: 'Participação no desenvolvimento de protótipos, depósitos e/ou registros de propriedade intelectual ou privilégio de invenção junto ao INPI ou órgão equivalente.' },
      { id: 'item-39', label: 'Participação em transferência de tecnologia, licenciamento ou exploração de ativo tecnológico, como autor ou inventor, mediante instrumento formal.' },
      { id: 'item-43', label: 'Atuação em atividade de liderança ou vice-liderança de grupo de pesquisa e/ou extensão devidamente registrado em órgão ou sistema oficial de reconhecimento institucional (ex.: Diretório de Grupos de Pesquisa do CNPq).' },
      { id: 'item-44', label: 'Participação como membro em grupo de pesquisa devidamente registrado em órgão ou sistema oficial de reconhecimento institucional.' },
      { id: 'item-55', label: 'Autoria de obra artística e/ou cultural devidamente registrada em órgão competente (ex.: Biblioteca Nacional, ECAD, INPI ou similar).' },
    ],
  },
  {
    numero: 6,
    titulo: 'Reconhecimento, Titulações e Áreas Sensíveis',
    pergunta: 'Possui certificações, educação formal extra, prêmios ou atuou em áreas de saúde, inclusão, ambientes de risco ou enfrentamento de pandemias?',
    itens: [
      { id: 'item-20', label: 'Desempenho contínuo de atividade técnica de natureza especializada, com contribuição institucional relevante na área de atuação. A pontuação é calculada por ano completo ou fração superior a 6 meses de exercício contínuo.' },
      { id: 'item-22', label: 'Recebimento de premiação ou distinção de âmbito internacional, concedida em reconhecimento a projetos implementados ou a contribuições relevantes na administração pública.' },
      { id: 'item-23', label: 'Recebimento de premiação ou distinção de âmbito nacional, concedida em reconhecimento a projetos implementados ou a contribuições relevantes na administração pública.' },
      { id: 'item-24', label: 'Recebimento de reconhecimento formal, menção honrosa ou premiação de âmbito local ou institucional, concedida em reconhecimento a projetos implementados ou a contribuições relevantes na administração pública.' },
      { id: 'item-29', label: 'Participação em atividades de apoio técnico especializado em ações na área de saúde, acessibilidade ou diversidade no âmbito da IFE. A pontuação é calculada por ano completo ou fração superior a 6 meses de exercício.' },
      { id: 'item-30', label: 'Atuação em ambientes ou processos que demandem condições especiais de segurança, cuidado ou conformidade técnica, com exigências diferenciadas em relação às atividades ordinárias do cargo. A pontuação é calculada por ano completo ou fração superior a 6 meses de exercício.' },
      { id: 'item-40', label: 'Conclusão de curso de educação formal em nível superior ao exigido para o ingresso no cargo de que é titular, e que não esteja sendo utilizado para percepção do atual nível de Incentivo à Qualificação (IQ).' },
      { id: 'item-42', label: 'Certificação profissional emitida por órgão ou entidade competente, demonstrando domínio de conhecimento técnico na área de atuação do servidor.' },
      { id: 'item-56', label: 'Atuação direta no enfrentamento de situações de surto, epidemias e pandemia, no exercício de atividades relacionadas ao controle, prevenção ou resposta ao evento de saúde pública. A pontuação é calculada em meses de atuação.' },
    ],
  },
];

interface WizardModalProps {
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
  initialIds?: string[];
}

export default function WizardModal({ onClose, onConfirm, initialIds = [] }: WizardModalProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set(initialIds));
  const [confirmed, setConfirmed] = useState(false);
  const [activeEixo, setActiveEixo] = useState(1);
  const confirmedCount = checked.size;

  const currentEixo = EIXOS.find(e => e.numero === activeEixo) || EIXOS[0];

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = (eixo: WizardEixo) => {
    setChecked((prev) => {
      const next = new Set(prev);
      eixo.itens.forEach((item) => next.add(item.id));
      return next;
    });
  };

  const deselectAll = (eixo: WizardEixo) => {
    setChecked((prev) => {
      const next = new Set(prev);
      eixo.itens.forEach((item) => next.delete(item.id));
      return next;
    });
  };

  const allInEixo = (eixo: WizardEixo) => eixo.itens.every((item) => checked.has(item.id));
  const someInEixo = (eixo: WizardEixo) => eixo.itens.some((item) => checked.has(item.id));

  const handleConfirm = () => {
    onConfirm([...checked]);
    setConfirmed(true);
  };

  useEffect(() => {
    if (!confirmed) return;
    const timer = setTimeout(() => onClose(), 2400);
    return () => clearTimeout(timer);
  }, [confirmed, onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm pt-8 pb-12"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-4xl rounded-3xl border border-gray-200 bg-white shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] overflow-hidden">
        <AnimatePresence mode="wait">
          {confirmed ? (
            /* ── Success screen ── */
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="flex flex-col items-center gap-6 px-8 py-20 text-center"
            >
              <div className="relative flex items-center justify-center">
                <motion.div
                  className="absolute h-28 w-28 rounded-full bg-violet-200"
                  initial={{ scale: 0.6, opacity: 0.7 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{ duration: 1, ease: 'easeOut', repeat: 1 }}
                />
                {SPARKLE_ANGLES.map((angle, i) => (
                  <motion.div
                    key={i}
                    className="absolute h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: i % 2 === 0 ? '#7c3aed' : '#a78bfa' }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                      x: Math.cos(angle) * 72,
                      y: Math.sin(angle) * 72,
                      opacity: 0,
                      scale: 0.4,
                    }}
                    transition={{ duration: 0.75, delay: 0.15 + i * 0.03, ease: 'easeOut' }}
                  />
                ))}
                <motion.div
                  className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-300"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.05 }}
                >
                  <CheckCircle2 className="h-10 w-10" />
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">Mapeamento concluído!</h3>
                <p className="mt-3 text-lg text-gray-500 leading-relaxed max-w-md">
                  <span className="font-black text-violet-700 underline decoration-violet-200 underline-offset-4">{confirmedCount} ite{confirmedCount !== 1 ? 'ns' : 'm'}</span>{' '}
                  destacado{confirmedCount !== 1 ? 's' : ''} no seu catálogo.
                  <br />
                  As recomendações já estão disponíveis.
                </p>
              </motion.div>
            </motion.div>
          ) : (
            /* ── Normal form ── */
            <motion.div key="form" initial={false} className="flex flex-col h-full">
              {/* Header */}
              <div className="flex flex-col gap-4 border-b border-gray-100 p-8 pb-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="inline-flex items-center gap-2 self-start rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-violet-700">
                      <Wand2 className="h-3 w-3" />
                      Inteligência de Mapeamento
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-gray-900">Quais atividades você já realizou?</h2>
                    <p className="text-sm text-gray-500 max-w-2xl">
                      Selecione as experiências que se aplicam ao seu histórico. Filtramos o catálogo automaticamente para destacar os itens onde você possui provas e pontos potenciais.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 rounded-2xl bg-gray-50 p-3 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Axis Navigation */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {EIXOS.map((eixo) => {
                    const isActive = activeEixo === eixo.numero;
                    const countInEixo = eixo.itens.filter(i => checked.has(i.id)).length;
                    return (
                      <button
                        key={eixo.numero}
                        onClick={() => setActiveEixo(eixo.numero)}
                        className={cn(
                          "relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all",
                          isActive
                            ? "bg-violet-600 text-white shadow-lg shadow-violet-200"
                            : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                        )}
                      >
                        <span>Eixo {eixo.numero}</span>
                        {countInEixo > 0 && (
                          <span className={cn(
                            "flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black leading-none",
                            isActive ? "bg-white text-violet-700" : "bg-violet-100 text-violet-700"
                          )}>
                            {countInEixo}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Questions area (Filtered by Active Axis) */}
              <div className="min-h-[400px] bg-gray-50/30 p-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeEixo}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-6"
                  >
                    <div className="flex flex-col gap-2">
                      <h3 className="text-xl font-bold text-gray-900">{currentEixo.titulo}</h3>
                      <p className="text-sm font-medium text-gray-500 italic">"{currentEixo.pergunta}"</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => (allInEixo(currentEixo) ? deselectAll(currentEixo) : selectAll(currentEixo))}
                        className="text-xs font-bold text-violet-600 hover:underline"
                      >
                        {allInEixo(currentEixo) ? 'Desmarcar todos deste eixo' : 'Marcar todos deste eixo'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {currentEixo.itens.map((item) => {
                        const isChecked = checked.has(item.id);
                        return (
                          <label
                            key={item.id}
                            className={cn(
                              "group relative flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-all duration-200",
                              isChecked
                                ? "border-violet-200 bg-white shadow-sm ring-1 ring-violet-100"
                                : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-md"
                            )}
                          >
                            <div className={cn(
                              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all",
                              isChecked ? "bg-violet-600 border-violet-600" : "bg-white border-gray-200 group-hover:border-violet-400"
                            )}>
                              {isChecked && <CheckCircle2 className="h-3 w-3 text-white" />}
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggle(item.id)}
                                className="sr-only"
                              />
                            </div>
                            <span className={cn(
                              "text-sm leading-relaxed transition-colors",
                              isChecked ? "font-bold text-gray-900" : "text-gray-600 font-medium"
                            )}>
                              {item.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-white p-8">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-bold text-gray-900">
                    {checked.size} ite{checked.size !== 1 ? 'ns' : 'm'} marcado{checked.size !== 1 ? 's' : ''} no total
                  </p>
                  <div className="flex items-center gap-1">
                    {EIXOS.map(e => (
                      <div
                        key={e.numero}
                        className={cn(
                          "h-1.5 rounded-full transition-all",
                          e.numero === activeEixo ? "w-8 bg-violet-600" : "w-3 bg-gray-100",
                          e.itens.some(i => checked.has(i.id)) && e.numero !== activeEixo ? "bg-violet-200" : ""
                        )}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-4 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 sm:flex-none border-gray-200 text-gray-700 h-12 px-8 rounded-xl font-bold"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={checked.size === 0}
                    className="flex-1 sm:flex-none bg-violet-600 text-white hover:bg-violet-700 h-12 px-8 rounded-xl font-bold shadow-lg shadow-violet-200 disabled:opacity-50"
                  >
                    Salvar Mapeamento
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
