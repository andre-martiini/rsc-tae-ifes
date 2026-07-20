import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clipboard, X, ChevronLeft, Sparkles, AlertCircle, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { ItemRSC, Lancamento, Servidor } from '../data/mock';
import { parseResultadoAuditoria } from '../lib/auditoriaParser';
import { pareceSerPrompt } from '../lib/jsonDetect';
import { useAppContext } from '../context/AppContext';
import { Button } from './ui/button';
import { copyTextToClipboard } from '../lib/clipboard';

type Props = {
  open: boolean;
  onClose: () => void;
  servidor: Servidor | null | undefined;
  item: ItemRSC;
  lancamento: Lancamento;
  prompt: string;
};

export default function SingleAuditPromptModal({
  open,
  onClose,
  servidor,
  item,
  lancamento,
  prompt,
}: Props) {
  const navigate = useNavigate();
  const { itensRSC, importarOperacoesAvulsas } = useAppContext();
  
  const [fase, setFase] = useState<'prompt' | 'resposta'>('prompt');
  const [respostaIA, setRespostaIA] = useState('');
  const [errosResposta, setErrosResposta] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Reset states upon opening
  useEffect(() => {
    if (open) {
      setFase('prompt');
      setRespostaIA('');
      setErrosResposta([]);
    }
  }, [open]);

  const handleCopyPrompt = async () => {
    const copied = await copyTextToClipboard(prompt);
    if (!copied) {
      toast.error('Não foi possível copiar o prompt completo.');
      return;
    }
    toast.success(`Prompt copiado por completo (${prompt.length.toLocaleString('pt-BR')} caracteres).`);
  };

  const handleProcessarResposta = useCallback(() => {
    if (!respostaIA.trim()) {
      toast.error('Cole a resposta da IA primeiro.');
      return;
    }

    // Usamos o parser de auditoria existente passando apenas o lançamento atual no contexto
    const resultado = parseResultadoAuditoria(respostaIA, {
      lancamentos: [lancamento],
      itensRSC,
    });

    if (resultado.erros.length > 0) {
      setErrosResposta(resultado.erros);
      toast.warning(`${resultado.erros.length} aviso(s) na validação.`);
      return;
    }

    // Importamos as operações avulsas geradas para este lançamento específico.
    // Isso substituirá qualquer pendência anterior deste mesmo lançamento no módulo.
    importarOperacoesAvulsas(resultado.operacoes, resultado.erros);

    if (resultado.operacoes.length > 0) {
      toast.success(`${resultado.operacoes.length} operação(ões) enviada(s) para o módulo Auditoria.`);
      onClose();
      navigate('/auditoria');
    } else {
      toast.success('Validação concluída: IA classificou o lançamento como adequado e sem inconformidades!');
      onClose();
    }
  }, [respostaIA, lancamento, itensRSC, importarOperacoesAvulsas, onClose, navigate]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-violet-50 px-5 py-4 sm:px-6">
          <div>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-black tracking-tight text-gray-900">
              Validação com IA (Lançamento Individual)
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-gray-600">
              Audite este lançamento enviando a sua transcrição e dados para uma IA. Cole o JSON de retorno e os ajustes propostos irão automaticamente para o módulo Auditoria.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Fase indicator */}
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-2.5 sm:px-6">
          <div className="flex items-center gap-2">
            {[
              { key: 'prompt', label: '1. Copiar prompt', num: 1 },
              { key: 'resposta', label: '2. Colar resposta', num: 2 },
            ].map((s, idx) => (
              <div key={s.key} className="flex items-center gap-2">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${fase === s.key ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {s.num}
                </span>
                <span className={`text-xs font-bold ${fase === s.key ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</span>
                {idx < 1 && <span className="text-gray-200">→</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {/* Fase: PROMPT */}
          {fase === 'prompt' && (
            <>
              <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                <div className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    O prompt abaixo contém os dados declarados e a transcrição dos comprovantes deste lançamento. Copie-o, envie para a IA externa (como Gemini, Claude ou ChatGPT) e anexe o arquivo PDF original se desejar uma análise cruzada.
                  </p>
                </div>
              </div>

              <div className="mb-3 rounded-xl border border-violet-50 bg-violet-50/30 p-3 text-xs">
                <p className="font-bold text-violet-800">Lançamento selecionado:</p>
                <p className="mt-1 font-semibold text-gray-800">{item.descricao}</p>
                <p className="text-gray-500">ID: {lancamento.id || 'Sem ID'}</p>
              </div>

              <textarea
                ref={textareaRef}
                readOnly
                value={prompt}
                className="h-[35vh] min-h-[220px] w-full resize-none rounded-xl border border-gray-200 bg-gray-950 p-4 font-mono text-xs leading-relaxed text-gray-100 shadow-inner focus:outline-none focus:ring-4 focus:ring-violet-100"
                onClick={(event) => event.currentTarget.select()}
              />
            </>
          )}

          {/* Fase: RESPOSTA */}
          {fase === 'resposta' && (
            <>
              <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-900">
                <div className="flex gap-2">
                  <Clipboard className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Cole abaixo a resposta em formato JSON gerada pela IA. O sistema validará a estrutura do arquivo e enviará os ajustes propostos para revisão no módulo Auditoria.
                  </p>
                </div>
              </div>

              <textarea
                value={respostaIA}
                onChange={(e) => setRespostaIA(e.target.value)}
                placeholder='{"schema_version": 1, "operacoes": [...] }'
                className="h-[35vh] min-h-[220px] w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-4 font-mono text-xs leading-relaxed text-gray-800 shadow-inner focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-100"
              />

              {respostaIA.trim() && pareceSerPrompt(respostaIA, prompt) && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
                  <p className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Isso é o <strong>prompt</strong>, não a resposta da IA. Copie o prompt na etapa 1, cole na IA, aguarde e depois cole a resposta em JSON gerada por ela aqui.</span>
                  </p>
                </div>
              )}

              {errosResposta.length > 0 && (
                <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  <p className="font-bold">Avisos na validação da resposta:</p>
                  <ul className="mt-2 list-disc space-y-0.5 pl-5">
                    {errosResposta.map((erro, i) => (
                      <li key={i}>{erro}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-5 py-4 sm:px-6">
          <div className="text-[10px] text-gray-400">
            {fase === 'prompt'
              ? 'Etapa 1: Copie o prompt e mande para a IA'
              : 'Etapa 2: Cole o JSON de resposta da IA'}
          </div>

          <div className="flex gap-2">
            {fase === 'prompt' ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyPrompt}
                >
                  <Clipboard className="mr-1.5 h-3.5 w-3.5" />
                  Copiar Prompt
                </Button>
                <Button
                  type="button"
                  onClick={() => setFase('resposta')}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                  size="sm"
                >
                  Ir para Colar Resposta
                  <ChevronLeft className="ml-1.5 h-3.5 w-3.5 rotate-180" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFase('prompt')}
                >
                  <ChevronLeft className="mr-1.5 h-3.5 w-3.5" />
                  Voltar ao Prompt
                </Button>
                <Button
                  type="button"
                  onClick={handleProcessarResposta}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                  size="sm"
                  disabled={!respostaIA.trim()}
                >
                  <FileCheck className="mr-1.5 h-3.5 w-3.5" />
                  Enviar à Auditoria
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
