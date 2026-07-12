import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

/**
 * Mostra um spotlight sobre o botão "Dossiê Inteligente" no menu lateral.
 * A flag é por sessão: toda sessão nova (que ainda não dispensou) verá o spotlight.
 */
export default function OnboardingSpotlight({ activeSessionId }: { activeSessionId: string | null }) {
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const storageKey = activeSessionId
    ? `rsc-tae-${activeSessionId}-onboarding-seen`
    : null;

  const dismiss = useCallback(() => {
    setVisible(false);
    setRect(null);
    if (storageKey) {
      window.localStorage.setItem(storageKey, '1');
    }
  }, [storageKey]);

  useEffect(() => {
    // Reset ao trocar de sessão
    setVisible(false);
    setRect(null);

    if (!activeSessionId || !storageKey) return;
    if (window.localStorage.getItem(storageKey)) return;

    // Pequeno delay para garantir que o sidebar está renderizado
    const timer = window.setTimeout(() => {
      const el = document.querySelector('[data-onboarding="dossie"]');
      if (!el) return;
      setRect(el.getBoundingClientRect());
      setVisible(true);
    }, 600);

    return () => window.clearTimeout(timer);
  }, [activeSessionId, storageKey]);

  // Re-posiciona se a janela for redimensionada
  useEffect(() => {
    if (!visible) return;
    const onResize = () => {
      const el = document.querySelector('[data-onboarding="dossie"]');
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && rect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[200]"
          onClick={dismiss}
        >
          {/* Overlay escuro com "buraco" no botão destacado */}
          <div
            className="absolute inset-0 bg-gray-950/70"
            style={{
              clipPath: `polygon(
                0 0,
                100% 0,
                100% 100%,
                0 100%,
                0 0,
                ${rect.left - 6}px 0,
                ${rect.left - 6}px ${rect.top - 6}px,
                ${rect.right + 6}px ${rect.top - 6}px,
                ${rect.right + 6}px ${rect.bottom + 6}px,
                ${rect.left - 6}px ${rect.bottom + 6}px,
                ${rect.left - 6}px 0
              )`,
            }}
          />

          {/* Ring destacado ao redor do botão */}
          <div
            className="pointer-events-none absolute rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-transparent"
            style={{
              left: rect.left - 6,
              top: rect.top - 6,
              width: rect.width + 12,
              height: rect.height + 12,
            }}
          />

          {/* Balão de dica */}
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="absolute z-[201] w-72 rounded-2xl border border-gray-100 bg-white p-4 shadow-2xl"
            style={{
              left: rect.right + 16,
              top: rect.top,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={dismiss}
              className="absolute right-3 top-3 text-gray-400 transition-colors hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-2 flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-black text-gray-900">Não sabe por onde começar?</h3>
            </div>

            <p className="text-xs leading-relaxed text-gray-600">
              Clique aqui no <strong>Dossiê Inteligente</strong> para carregar todos os seus
              documentos de uma vez. O sistema vai ajudá-lo a classificá-los, revisar as sugestões
              e fazer a auditoria — tudo em um único fluxo guiado.
            </p>

            <button
              onClick={dismiss}
              className="mt-3 w-full rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-primary/90"
            >
              Entendi, vamos começar
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
