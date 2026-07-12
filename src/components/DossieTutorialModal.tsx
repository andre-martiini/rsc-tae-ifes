import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, UploadCloud, SearchCheck, FileText, ShieldCheck } from 'lucide-react';

interface EtapaVideo {
  video: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  description: string;
}

const ETAPAS: EtapaVideo[] = [
  {
    video: '/di_documentos.mp4',
    icon: <UploadCloud className="h-5 w-5" />,
    title: 'Etapa 1 — Documentos',
    subtitle: 'Carregue todos os seus comprovantes de uma vez',
    description:
      'Arraste e solte seus PDFs, imagens ou outros arquivos na área de envio. O sistema extrai o texto automaticamente de cada documento (com OCR para imagens) para que a IA possa analisá-los depois. Você pode anexar quantos documentos quiser — todos ficam armazenados localmente no seu navegador.',
  },
  {
    video: '/di_analise_externa.mp4',
    icon: <SearchCheck className="h-5 w-5" />,
    title: 'Etapa 2 — Análise externa',
    subtitle: 'A IA classifica seus documentos nos itens do catálogo',
    description:
      'O sistema gera um prompt contendo as transcrições dos seus documentos e o catálogo completo de itens do RSC-PCCTAE. Você copia esse prompt, envia para uma IA externa (Gemini, ChatGPT, Claude etc.) e cola a resposta de volta. A IA sugere em quais itens cada documento se encaixa, com nível de confiança e justificativa.',
  },
  {
    video: '/di_revisao.mp4',
    icon: <FileText className="h-5 w-5" />,
    title: 'Etapa 3 — Revisão',
    subtitle: 'Confirme, edite ou descarte as sugestões da IA',
    description:
      'Aqui você revisa cada sugestão de classificação. Pode confirmar, editar o item ou a quantidade, ou descartar sugestões que não fazem sentido. As confirmações viram lançamentos com pontuação calculada automaticamente. Você está no controle — nada é registrado sem sua aprovação.',
  },
  {
    video: '/di_auditoria_ia.mp4',
    icon: <ShieldCheck className="h-5 w-5" />,
    title: 'Etapa 4 — Auditoria de IA',
    subtitle: 'Uma segunda rodada de IA para auditar os lançamentos',
    description:
      'O sistema gera um novo prompt com todos os lançamentos confirmados e suas transcrições. A IA de auditoria identifica duplicações, classificações incorretas, períodos ou quantidades erradas, e propõe correções estruturadas (remover, reclassificar, ajustar). Você aprova ou rejeita cada operação individualmente antes de aplicá-las.',
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function DossieTutorialModal({ open, onClose }: Props) {
  const [step, setStep] = useState(0);

  const next = useCallback(() => {
    setStep((prev) => Math.min(prev + 1, ETAPAS.length - 1));
  }, []);

  const prev = useCallback(() => {
    setStep((prev) => Math.max(prev - 1, 0));
  }, []);

  // Reset para a etapa 0 ao abrir
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  // Navegação por teclado
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, next, prev, onClose]);

  if (!open) return null;

  const etapa = ETAPAS[step];
  const isFirst = step === 0;
  const isLast = step === ETAPAS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
              {etapa.icon}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">{etapa.title}</h3>
              <p className="mt-0.5 text-xs text-gray-500">{etapa.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Fechar tutorial"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1.5 px-5 pt-3">
          {ETAPAS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === step ? 'w-8 bg-primary' : 'w-4 bg-gray-200 hover:bg-gray-300',
              )}
              aria-label={`Ir para etapa ${i + 1}`}
            />
          ))}
        </div>

        {/* Video + description */}
        <div className="space-y-4 p-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <video
                key={etapa.video}
                className="aspect-video w-full rounded-lg border border-gray-200 bg-gray-950 object-contain"
                src={etapa.video}
                autoPlay
                loop
                muted
                playsInline
                controls
              />
              <p className="mt-3 text-sm leading-relaxed text-gray-700">
                {etapa.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer: navigation */}
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
          <button
            type="button"
            onClick={prev}
            disabled={isFirst}
            className={cn(
              'flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
              isFirst
                ? 'cursor-not-allowed text-gray-300'
                : 'text-gray-600 hover:bg-gray-100',
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          <span className="text-xs font-medium text-gray-400">
            {step + 1} de {ETAPAS.length}
          </span>

          {isLast ? (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary/90"
            >
              Concluir
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary/90"
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Minimal cn to avoid extra import dependency
function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
