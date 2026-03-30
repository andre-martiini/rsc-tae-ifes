import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Wand2, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';

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
    titulo: 'Gestão e Liderança',
    pergunta: 'Você atuou em cargos de gestão, chefia, ou coordenou projetos e acordos institucionais?',
    itens: [
      { id: 'item-33', label: 'Titular ou substituto de Cargo de Direção (CD)' },
      { id: 'item-34', label: 'Titular ou substituto de Função Gratificada (FG)' },
      { id: 'item-35', label: 'Responsável por setor, unidade ou equipe' },
      { id: 'item-32', label: 'Coordenação/presidência de comissões, comitês ou GTs' },
      { id: 'item-47', label: 'Coordenação de acordos ou convênios de cooperação' },
      { id: 'item-57', label: 'Coordenador de implantação de unidades de ensino' },
      { id: 'item-58', label: 'Coordenador em projetos de desenvolvimento, ensino ou pesquisa' },
      { id: 'item-60', label: 'Membro de equipe de implantação de unidades de ensino' },
      { id: 'item-64', label: 'Coordenação de elaboração/reformulação de Projetos Pedagógicos' },
    ],
  },
  {
    numero: 2,
    titulo: 'Comissões, Conselhos e Representações',
    pergunta: 'Você participou de comissões, conselhos, grupos de trabalho ou representações sindicais?',
    itens: [
      { id: 'item-3',  label: 'Corregedoria ou correição' },
      { id: 'item-9',  label: 'Organização de processo seletivo, vestibular ou concurso' },
      { id: 'item-10', label: 'Membro de comissão de processo seletivo, vestibular ou concurso' },
      { id: 'item-11', label: 'Políticas afirmativas (cotas, heteroidentificação, PCD)' },
      { id: 'item-12', label: 'Comissões em organizações externas (privadas, ONGs)' },
      { id: 'item-13', label: 'Membro titular em comissões/GTs da administração pública' },
      { id: 'item-14', label: 'Membro suplente em comissões/GTs da administração pública' },
      { id: 'item-16', label: 'Saúde e segurança no trabalho' },
      { id: 'item-17', label: 'Conselhos superiores e órgãos colegiados da IFE' },
      { id: 'item-25', label: 'Gestão, conselho fiscal ou comissão sindical' },
      { id: 'item-26', label: 'Comissões permanentes instituídas por lei' },
      { id: 'item-27', label: 'Comissão eleitoral ou de consulta' },
      { id: 'item-28', label: 'Conselho profissional' },
      { id: 'item-29', label: 'Comissão Interna de Supervisão (CIS)' },
      { id: 'item-31', label: 'Representação institucional em conselhos externos' },
      { id: 'item-62', label: 'Comissão de projetos pedagógicos' },
      { id: 'item-63', label: 'Conselhos editoriais' },
    ],
  },
  {
    numero: 3,
    titulo: 'Processos Administrativos e Operacionais',
    pergunta: 'Você atuou com contratos, licitações, editais, avaliações do MEC ou sistemas do Governo?',
    itens: [
      { id: 'item-1',  label: 'Gestor/fiscal de contratos e convênios' },
      { id: 'item-2',  label: 'Suplente na gestão/fiscalização de contratos' },
      { id: 'item-4',  label: 'Atuação em processo licitatório' },
      { id: 'item-6',  label: 'Elaboração de editais' },
      { id: 'item-7',  label: 'Notas técnicas, pareceres ou manuais institucionais' },
      { id: 'item-18', label: 'Consultoria e Assessoria Técnica Especializada' },
      { id: 'item-20', label: 'Fiscalização e logística de concursos públicos' },
      { id: 'item-74', label: 'Avaliador de curso pelo INEP/MEC' },
      { id: 'item-75', label: 'Elaboração/revisão de provas de concursos ou vestibulares' },
      { id: 'item-88', label: 'Operação/treinamento em sistemas estruturadores do Governo Federal' },
    ],
  },
  {
    numero: 4,
    titulo: 'Produção Intelectual, Inovação e Tecnologia',
    pergunta: 'Você desenvolveu sistemas, publicou livros/artigos, criou artes ou inovações institucionais?',
    itens: [
      { id: 'item-5',  label: 'Desenvolvimento de soluções práticas com impacto institucional' },
      { id: 'item-42', label: 'Obras artísticas e culturais registradas' },
      { id: 'item-45', label: 'Carta Patente' },
      { id: 'item-46', label: 'Contratos de transferência de tecnologia' },
      { id: 'item-49', label: 'Projeto gráfico, diagramação ou identidade visual' },
      { id: 'item-50', label: 'Desenvolvimento de software e sistemas digitais' },
      { id: 'item-51', label: 'Edição de mídias para jornais, revistas ou sites' },
      { id: 'item-52', label: 'Roteiros para rádio, TV ou eventos' },
      { id: 'item-53', label: 'Edição, revisão ou tradução de publicações' },
      { id: 'item-69', label: 'Protótipos e registros de propriedade intelectual' },
      { id: 'item-71', label: 'Produção de material audiovisual' },
      { id: 'item-72', label: 'Artigos ou capítulos de livro (com ISBN/ISSN)' },
      { id: 'item-73', label: 'Publicação de livro (com ISBN)' },
      { id: 'item-89', label: 'Produção/tradução de materiais acessíveis (ex: Libras)' },
    ],
  },
  {
    numero: 5,
    titulo: 'Atividades Acadêmicas, Eventos e Pesquisa',
    pergunta: 'Você organizou eventos, atuou em pesquisas, orientou alunos ou avaliou trabalhos?',
    itens: [
      { id: 'item-30', label: 'Organização de eventos (pedagógicos, científicos, etc.)' },
      { id: 'item-43', label: 'Autor de projeto de pesquisa/extensão aprovado' },
      { id: 'item-44', label: 'Captação de recursos para projetos institucionais' },
      { id: 'item-48', label: 'Coordenação de elaboração de Projetos Pedagógicos (novos cursos)' },
      { id: 'item-54', label: 'Liderança/vice-liderança de grupo de pesquisa' },
      { id: 'item-55', label: 'Avaliador em eventos (bancas, TCC, congressos)' },
      { id: 'item-56', label: 'Avaliador/parecerista de projetos' },
      { id: 'item-59', label: 'Palestrante, mediador ou apresentador em eventos' },
      { id: 'item-61', label: 'Ouvinte ou assistente em eventos' },
      { id: 'item-65', label: 'Participação em grupo de pesquisa' },
      { id: 'item-66', label: 'Implantação de laboratórios, oficinas ou estúdios' },
      { id: 'item-67', label: 'Participação em projetos institucionais, pesquisa ou extensão' },
      { id: 'item-68', label: 'Organização de congressos, simpósios, feiras' },
      { id: 'item-76', label: 'Jurado na área de atuação' },
      { id: 'item-77', label: 'Orientador de monitorias' },
      { id: 'item-78', label: 'Orientador de bolsistas' },
      { id: 'item-79', label: 'Orientador/supervisor de estágios' },
      { id: 'item-80', label: 'Preceptor em residências acadêmicas' },
      { id: 'item-81', label: 'Apoio a atividades de preceptoria' },
      { id: 'item-86', label: 'Atividades de campo e saídas pedagógicas' },
    ],
  },
  {
    numero: 6,
    titulo: 'Qualificação, Reconhecimento e Tempo de Serviço',
    pergunta: 'Você possui tempo de serviço, titulações extras, certificações, prêmios ou atuou como instrutor?',
    itens: [
      { id: 'item-8',  label: 'Elogio profissional registrado em assentamento' },
      { id: 'item-21', label: 'Tempo de efetivo exercício na carreira (IFE)' },
      { id: 'item-22', label: 'Tempo de serviço em outras instituições (públicas/privadas)' },
      { id: 'item-23', label: 'Trabalho em órgãos estatais, agências reguladoras ou internacionais' },
      { id: 'item-24', label: 'Trabalho no MEC ou entidades vinculadas (cessão)' },
      { id: 'item-36', label: 'Proficiência ou curso em LIBRAS/língua estrangeira' },
      { id: 'item-37', label: 'Certificação profissional na área de atuação' },
      { id: 'item-38', label: 'Instrutor ou conteudista em capacitações' },
      { id: 'item-39', label: 'Tutor, monitor ou mentor em capacitações' },
      { id: 'item-40', label: 'Participação em capacitações ou disciplinas isoladas' },
      { id: 'item-41', label: 'Títulos de educação formal (além do exigido para o cargo)' },
      { id: 'item-70', label: 'Prêmio de mérito, comenda ou homenagem' },
    ],
  },
  {
    numero: 7,
    titulo: 'Saúde, Inclusão e Ações Sociais',
    pergunta: 'Você atuou na área da saúde, ações voluntárias, inclusão ou diversidade?',
    itens: [
      { id: 'item-15', label: 'Brigadas voluntárias de incêndio ou ações voluntárias' },
      { id: 'item-19', label: 'Participação em políticas públicas externas' },
      { id: 'item-82', label: 'Atuação em surtos, epidemias e pandemias' },
      { id: 'item-83', label: 'Programas e ações de promoção da saúde' },
      { id: 'item-84', label: 'Acolhimento em Saúde Mental e Humanização do Atendimento' },
      { id: 'item-85', label: 'Atuação em áreas hospitalares críticas/semicríticas' },
      { id: 'item-87', label: 'Ações de promoção da inclusão, acessibilidade e diversidade' },
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
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [confirmed, setConfirmed] = useState(false);
  const confirmedCount = checked.size;

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

  const toggleEixo = (numero: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(numero)) {
        next.delete(numero);
      } else {
        next.add(numero);
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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-8 pb-12"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
        <AnimatePresence mode="wait">
        {confirmed ? (
          /* ── Success screen ── */
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex flex-col items-center gap-6 px-8 py-16 text-center"
          >
            {/* Animated checkmark with sparkles */}
            <div className="relative flex items-center justify-center">
              {/* ping ring */}
              <motion.div
                className="absolute h-28 w-28 rounded-full bg-violet-200"
                initial={{ scale: 0.6, opacity: 0.7 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 1, ease: 'easeOut', repeat: 1 }}
              />
              {/* sparkle dots */}
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
              {/* icon circle */}
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
              <h3 className="text-2xl font-bold text-gray-900">Mapeamento concluído!</h3>
              <p className="mt-2 text-gray-500">
                <span className="font-bold text-violet-700">{confirmedCount} ite{confirmedCount !== 1 ? 'ns' : 'm'}</span>{' '}
                destacado{confirmedCount !== 1 ? 's' : ''} no seu perfil.
                <br />
                Veja as recomendações na página de Itens.
              </p>
            </motion.div>
          </motion.div>
        ) : (
          /* ── Normal form ── */
          <motion.div key="form" initial={false}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6">
          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
              <Wand2 className="h-3.5 w-3.5" />
              Wizard de Mapeamento
            </div>
            <h2 className="text-xl font-bold text-gray-900">Quais atividades você já realizou?</h2>
            <p className="mt-1 text-sm text-gray-500">
              Marque tudo que se aplica ao seu histórico. O sistema irá destacar os itens aderentes ao seu perfil na página de Itens.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Eixos */}
        <div className="divide-y divide-gray-100">
          {EIXOS.map((eixo) => {
            const isCollapsed = collapsed.has(eixo.numero);
            const countChecked = eixo.itens.filter((item) => checked.has(item.id)).length;

            return (
              <div key={eixo.numero} className="px-6 py-4">
                {/* Eixo header */}
                <button
                  type="button"
                  onClick={() => toggleEixo(eixo.numero)}
                  className="flex w-full items-start justify-between gap-3 text-left"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 rounded-lg bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700">
                        Eixo {eixo.numero}
                      </span>
                      <span className="font-semibold text-gray-900">{eixo.titulo}</span>
                      {countChecked > 0 && (
                        <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                          {countChecked} marcado{countChecked !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[13px] text-gray-500">{eixo.pergunta}</p>
                  </div>
                  <div className="shrink-0 text-gray-400">
                    {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </div>
                </button>

                {/* Checkboxes */}
                {!isCollapsed && (
                  <div className="mt-3 space-y-1.5">
                    {/* Select/deselect all */}
                    <div className="flex gap-3 pb-1">
                      <button
                        type="button"
                        onClick={() => (allInEixo(eixo) ? deselectAll(eixo) : selectAll(eixo))}
                        className="text-[11px] font-semibold text-violet-600 hover:text-violet-800 underline"
                      >
                        {allInEixo(eixo) ? 'Desmarcar todos' : someInEixo(eixo) ? 'Marcar todos' : 'Marcar todos'}
                      </button>
                    </div>

                    {eixo.itens.map((item) => {
                      const isChecked = checked.has(item.id);
                      return (
                        <label
                          key={item.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                            isChecked
                              ? 'border-violet-200 bg-violet-50'
                              : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggle(item.id)}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-violet-600"
                          />
                          <span className={`text-[13px] leading-snug ${isChecked ? 'font-medium text-violet-900' : 'text-gray-700'}`}>
                            {item.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 border-t border-gray-100 p-6">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{checked.size}</span> ite{checked.size !== 1 ? 'ns' : 'm'} selecionado{checked.size !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="border-gray-200 text-gray-700">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={checked.size === 0}
              className="bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
            >
              <Wand2 className="mr-2 h-4 w-4" />
              Aplicar recomendações ({checked.size})
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
