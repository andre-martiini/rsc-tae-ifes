import React, { useEffect, useRef, useState } from 'react';
import { differenceInDays, format, isValid, parseISO } from 'date-fns';
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Lock,
  ShieldAlert,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';
import { ItemRSC } from '../data/mock';
import { useAppContext } from '../context/AppContext';
import { isItemJuridicallyFragile } from '../lib/rsc';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface ItemDetailPanelProps {
  item: ItemRSC;
  onSaved: () => void;
}

export default function ItemDetailPanel({ item, onSaved }: ItemDetailPanelProps) {
  const { addDocumentoFromFile, addLancamento, removeLancamento, documentos, servidor, lancamentos, processo } =
    useAppContext();
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [isOngoing, setIsOngoing] = useState(false);
  const [quantidade, setQuantidade] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fragilityConfirmed, setFragilityConfirmed] = useState(false);
  const [showGuidance, setShowGuidance] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isSubmitted = processo.status === 'Enviado';
  const isFragile = isItemJuridicallyFragile(item);
  const itemLancamentos = lancamentos.filter(
    (lancamento) => lancamento.servidor_id === servidor?.id && lancamento.item_rsc_id === item.id,
  );
  const itemPontosAcumulados = itemLancamentos.reduce(
    (total, lancamento) => total + lancamento.pontos_calculados,
    0,
  );
  const documentosDoServidor = documentos.filter((doc) => doc.servidor_id === servidor?.id);
  const today = format(new Date(), 'yyyy-MM-dd');
  const effectiveEndDate = isOngoing ? today : dataFim;

  const handleAutoCalculateQuantity = () => {
    if (!item.quantidade_automatica) {
      return;
    }

    if (!dataInicio || !effectiveEndDate) {
      toast.error('Preencha as datas de início e fim antes de calcular a quantidade.');
      return;
    }

    const start = parseISO(dataInicio);
    const end = parseISO(effectiveEndDate);

    if (!isValid(start) || !isValid(end) || end < start) {
      toast.error('Informe um período válido para calcular a quantidade.');
      return;
    }

    const days = differenceInDays(end, start) + 1;
    const calculatedQuantity = (days / 30).toFixed(2);
    setQuantidade(calculatedQuantity);
    toast.success('Quantidade calculada automaticamente a partir do período informado.');
  };

  useEffect(() => {
    setFragilityConfirmed(!isFragile);
  }, [isFragile, item.id]);

  useEffect(() => {
    setQuantidade('');
    setActiveTab('form');
    setPendingDeleteId(null);
    setShowGuidance(true);
  }, [item.id]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (selectedDocId || isSubmitted) {
        return;
      }

      const items = Array.from(event.clipboardData?.items ?? []);
      const pastedFile = items
        .map((clipboardItem) => clipboardItem.getAsFile())
        .find((candidate): candidate is File => !!candidate);

      if (!pastedFile) {
        return;
      }

      if (pastedFile.type !== 'application/pdf' && !pastedFile.name.toLowerCase().endsWith('.pdf')) {
        setUploadFeedback('Cole um arquivo PDF para usar como comprovação.');
        return;
      }

      event.preventDefault();
      setFile(pastedFile);
      setUploadFeedback(`PDF colado: ${pastedFile.name}`);
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [selectedDocId, isSubmitted]);

  const resetForm = () => {
    setDataInicio('');
    setDataFim('');
    setIsOngoing(false);
    setQuantidade('');
    setFile(null);
    setSelectedDocId('');
    setUploadFeedback(null);
    setFragilityConfirmed(!isFragile);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setUploadFeedback('Arquivo removido. Você pode enviar, colar ou arrastar outro PDF.');
  };

  const acceptPdfFile = (incomingFile: File | null) => {
    if (!incomingFile) {
      return;
    }

    if (incomingFile.type !== 'application/pdf' && !incomingFile.name.toLowerCase().endsWith('.pdf')) {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setUploadFeedback('Formato inválido. Envie um arquivo PDF.');
      return;
    }

    if (incomingFile.size > 5 * 1024 * 1024) {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setUploadFeedback('O arquivo excede 5MB. Envie um PDF menor.');
      return;
    }

    setFile(incomingFile);
    setUploadFeedback(`PDF pronto para envio: ${incomingFile.name}`);
  };

  const handleSave = async () => {
    if (!servidor || saving) {
      return;
    }

    if (isSubmitted) {
      toast.error('Este processo já foi enviado. Novos lançamentos estão bloqueados.');
      return;
    }

    if (!dataInicio || !effectiveEndDate) {
      toast.error('Preencha as datas de início e fim.');
      return;
    }

    const quantidadeNumerica = Number.parseFloat(quantidade);

    if (!quantidade.trim() || Number.isNaN(quantidadeNumerica) || quantidadeNumerica <= 0) {
      toast.error('Informe uma quantidade maior que zero para calcular os pontos.');
      return;
    }

    if (isFragile && !fragilityConfirmed) {
      toast.error('Confirme que você está ciente do enquadramento jurídico sensível deste item.');
      return;
    }

    if (!file && !selectedDocId) {
      toast.error('Anexe um documento ou selecione um existente.');
      return;
    }

    try {
      setSaving(true);

      let docId = selectedDocId;

      if (file && !selectedDocId) {
        const newDoc = await addDocumentoFromFile({
          servidorId: servidor.id,
          file,
        });
        docId = newDoc.id;
      }

      const pontosCalculados = Number((quantidadeNumerica * item.pontos_por_unidade).toFixed(2));

      const saved = addLancamento({
        servidor_id: servidor.id,
        item_rsc_id: item.id,
        documento_id: docId,
        data_inicio: dataInicio,
        data_fim: effectiveEndDate,
        quantidade_informada: quantidadeNumerica,
        pontos_calculados: pontosCalculados,
      });

      if (!saved) {
        toast.error('O processo já foi enviado. Não é possível salvar novos lançamentos.');
        return;
      }

      toast.success(`Lançamento salvo! Você acumulou +${pontosCalculados} pontos.`);
      resetForm();
      setActiveTab('history');
      onSaved();
    } catch {
      toast.error('Não foi possível persistir o documento com hash. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLancamento = (lancamentoId: string) => {
    if (isSubmitted) {
      toast.error('Este processo já foi enviado. O histórico não pode mais ser alterado.');
      return;
    }

    if (pendingDeleteId !== lancamentoId) {
      setPendingDeleteId(lancamentoId);
      toast.warning('Clique novamente para confirmar a exclusão deste lançamento.');
      return;
    }

    const removed = removeLancamento(lancamentoId);

    if (!removed) {
      toast.error('Não foi possível remover este lançamento.');
      return;
    }

    setPendingDeleteId(null);
    toast.success('Lançamento removido deste item.');
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-8 py-6">
        <div className="mb-2 flex items-center gap-3">
          <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-1 font-mono text-xs text-primary">
            Item {item.numero}
          </span>
          <span className="text-sm font-medium text-gray-400">• Inciso {item.inciso}</span>
          {isFragile && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
              Enquadramento sensível
            </span>
          )}
        </div>
        <h2 className="max-w-4xl text-3xl font-bold leading-tight text-gray-900">{item.descricao}</h2>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 rounded-full border border-gray-100 bg-gray-50 px-3 py-1.5 text-sm text-gray-500">
            <span className="font-bold text-gray-900">{item.pontos_por_unidade} pts</span>
            por {item.unidade_medida}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
            <span className="font-bold text-emerald-900">{itemPontosAcumulados.toFixed(2)} pts</span>
            já contabilizados neste item
          </div>
          {isSubmitted && (
            <div className="flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-sm text-sky-700">
              <Lock className="h-4 w-4" />
              Processo enviado em modo somente leitura
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1400px] space-y-8 p-8">
          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Orientações do item</h3>
                <p className="text-xs text-gray-500">Regra de aceite e documentação comprobatória</p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuidance((current) => !current)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600 transition-colors hover:bg-white"
                aria-label={showGuidance ? 'Retrair orientações do item' : 'Expandir orientações do item'}
                title={showGuidance ? 'Retrair orientações do item' : 'Expandir orientações do item'}
              >
                {showGuidance ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            {showGuidance && (
              <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 transition-colors hover:bg-blue-100/70">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-blue-950">
                    <FileText className="h-4 w-4" />
                    Regra de aceite
                  </h4>
                  <p className="text-sm italic leading-relaxed text-blue-900">"{item.regra_aceite}"</p>
                </div>

                {item.documentos_comprobatorios && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 transition-colors hover:bg-amber-100/70">
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-950">
                      <CheckCircle2 className="h-4 w-4" />
                      Comprovação
                    </h4>
                    <p className="text-sm leading-relaxed text-amber-900">{item.documentos_comprobatorios}</p>
                  </div>
                )}
              </div>
            )}
          </section>

          {isFragile && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-amber-900">
                    Este item tem enquadramento jurídico sensível no próprio rol.
                  </p>
                  <label className="flex items-start gap-2 text-sm text-amber-800">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-amber-300 text-amber-700 focus:ring-amber-500"
                      checked={fragilityConfirmed}
                      onChange={(event) => setFragilityConfirmed(event.target.checked)}
                      disabled={isSubmitted}
                    />
                    Estou ciente de que este lançamento pode exigir comprovação mais robusta na análise.
                  </label>
                </div>
              </div>
            </section>
          )}

          <section className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-gray-50/50 p-8 shadow-sm">
              <div className="absolute right-0 top-0 h-32 w-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-2xl transition-colors duration-500 group-hover:bg-primary/10"></div>

              <div className="mb-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('form')}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                    activeTab === 'form'
                      ? 'bg-primary text-white shadow-sm'
                      : 'border border-gray-200 bg-white text-gray-600 hover:border-primary/30 hover:text-primary',
                  )}
                >
                  Novo registro
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                    activeTab === 'history'
                      ? 'bg-primary text-white shadow-sm'
                      : 'border border-gray-200 bg-white text-gray-600 hover:border-primary/30 hover:text-primary',
                  )}
                >
                  Lançamentos
                  {itemLancamentos.length > 0 ? ` (${itemLancamentos.length})` : ''}
                </button>
              </div>

              {activeTab === 'form' ? (
                <div className={cn('space-y-8', isSubmitted && 'pointer-events-none opacity-60')}>
                <section className="space-y-4">
                  <div>
                    <Label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
                      Comprovação documental
                    </Label>
                    <p className="text-sm text-gray-600">
                      Primeiro, anexe a comprovação: envie um novo PDF ou reutilize um documento já salvo.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-100/70 p-4 md:p-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(260px,1fr)] md:items-start">
                      <div className="space-y-3">
                        {!selectedDocId && (
                          <div
                            className={`group/upload relative flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-all ${
                              file
                                ? 'border-emerald-400 bg-emerald-50 shadow-sm shadow-emerald-100'
                                : isDragActive
                                  ? 'border-primary bg-primary/5'
                                  : 'border-gray-300 bg-white hover:border-primary hover:bg-primary/[0.02]'
                            }`}
                            onDragOver={(event) => {
                              event.preventDefault();
                              setIsDragActive(true);
                            }}
                            onDragEnter={(event) => {
                              event.preventDefault();
                              setIsDragActive(true);
                            }}
                            onDragLeave={(event) => {
                              event.preventDefault();
                              const relatedTarget = event.relatedTarget as Node | null;
                              if (!relatedTarget || !event.currentTarget.contains(relatedTarget)) {
                                setIsDragActive(false);
                              }
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              setIsDragActive(false);
                              acceptPdfFile(event.dataTransfer.files?.[0] ?? null);
                            }}
                          >
                            <input
                              ref={fileInputRef}
                              type="file"
                              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                              accept=".pdf"
                              onChange={(e) => acceptPdfFile(e.target.files?.[0] ?? null)}
                            />
                            {file && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  clearFile();
                                }}
                                className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700 shadow-sm transition-colors hover:bg-emerald-50"
                                aria-label="Remover arquivo carregado"
                                title="Remover arquivo"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                            <div
                              className={`mb-3 rounded-full p-2.5 transition-colors ${
                                file ? 'bg-emerald-100' : 'bg-gray-50 group-hover/upload:bg-primary/10'
                              }`}
                            >
                              <UploadCloud
                                className={`h-6 w-6 transition-colors ${
                                  file ? 'text-emerald-700' : 'text-gray-400 group-hover/upload:text-primary'
                                }`}
                              />
                            </div>
                            <p
                              className={`px-4 text-sm font-semibold transition-colors ${
                                file ? 'text-emerald-900' : 'text-gray-700 group-hover/upload:text-primary'
                              }`}
                            >
                              {file
                                ? file.name
                                : isDragActive
                                  ? 'Solte o PDF aqui'
                                  : 'Clique, arraste ou cole um PDF'}
                            </p>
                            <p
                              className={`mt-1 text-[10px] font-bold uppercase tracking-widest ${
                                file ? 'text-emerald-700' : 'text-gray-500'
                              }`}
                            >
                              {file ? 'Arquivo pronto para persistir com hash' : 'Máximo 5MB'}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 px-4">
                              <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-medium text-gray-600 ring-1 ring-gray-200">
                                Arraste e solte
                              </span>
                              <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-medium text-gray-600 ring-1 ring-gray-200">
                                Ctrl+V para colar
                              </span>
                            </div>
                          </div>
                        )}

                        {uploadFeedback && !selectedDocId && (
                          <p className={`text-xs ${file ? 'text-emerald-700' : 'text-gray-500'}`}>
                            {uploadFeedback}
                          </p>
                        )}
                      </div>

                      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                          <div className="h-px flex-1 bg-gray-200"></div>
                          ou
                          <div className="h-px flex-1 bg-gray-200"></div>
                        </div>
                        <p className="text-sm text-gray-600">
                          Se preferir, reutilize um documento que já foi enviado anteriormente.
                        </p>
                        <select
                          className="h-11 w-full appearance-none rounded-lg border border-gray-200 bg-white bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSJncmF5Ij48cGF0aCBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTE5IDlsLTcgNy03LTciLz48L3N2Zz4=')] bg-[length:20px] bg-[position:calc(100%-12px)_center] bg-no-repeat px-3 py-2 pr-10 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                          value={selectedDocId}
                          onChange={(e) => {
                            setSelectedDocId(e.target.value);
                            if (e.target.value) {
                              setFile(null);
                              setUploadFeedback(null);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                            }
                          }}
                          disabled={!!file}
                        >
                          <option value="">Buscar em documentos salvos...</option>
                          {documentosDoServidor.map((doc) => (
                            <option key={doc.id} value={doc.id}>
                              {doc.nome_arquivo}
                              {doc.hash_arquivo ? ` • hash ${doc.hash_arquivo.slice(0, 8)}` : ''}
                            </option>
                          ))}
                        </select>

                        {(file || selectedDocId) && (
                          <p className="text-xs text-gray-500">
                            {file
                              ? 'O envio manual está ativo. Para reutilizar um documento salvo, remova este arquivo.'
                              : 'Um documento salvo foi selecionado. O envio de novo arquivo fica desativado.'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div>
                    <Label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
                      Período e quantidade
                    </Label>
                    <p className="text-sm text-gray-600">
                      Informe o período de referência e a quantidade comprovada para este item.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="data-inicio" className="text-xs font-bold uppercase tracking-wider text-gray-500">
                          Data de início
                        </Label>
                        <Input
                          id="data-inicio"
                          type="date"
                          className="h-11 border-gray-200 bg-white transition-all focus:border-primary focus:ring-primary"
                          value={dataInicio}
                          onChange={(e) => setDataInicio(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="data-fim" className="text-xs font-bold uppercase tracking-wider text-gray-500">
                          Data de fim
                        </Label>
                        <Input
                          id="data-fim"
                          type="date"
                          className="h-11 border-gray-200 bg-white transition-all focus:border-primary focus:ring-primary"
                          value={isOngoing ? today : dataFim}
                          onChange={(e) => setDataFim(e.target.value)}
                          disabled={isOngoing}
                        />
                        <label className="flex items-center gap-2 pt-1 text-xs text-gray-600">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={isOngoing}
                            onChange={(e) => setIsOngoing(e.target.checked)}
                          />
                          Ainda em vigor
                        </label>
                        {isOngoing && (
                          <p className="text-xs text-gray-500">
                            A data de fim passa a considerar automaticamente a data atual.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="quantidade" className="text-xs font-bold uppercase tracking-wider text-gray-500">
                          Quantidade
                        </Label>
                        <div className="flex max-w-sm items-center gap-2">
                          <Input
                            id="quantidade"
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            className="h-11 border-gray-200 bg-white text-center text-lg font-bold tabular-nums transition-all focus:border-primary focus:ring-primary"
                            value={quantidade}
                            onChange={(e) => setQuantidade(e.target.value)}
                            placeholder="0"
                          />
                          {item.quantidade_automatica && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleAutoCalculateQuantity}
                              className="h-11 shrink-0 border-gray-200 px-3 text-sm font-semibold text-gray-700"
                            >
                              <Calculator className="mr-2 h-4 w-4" />
                              Calcular
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-gray-200 bg-white p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          Esta quantidade se refere a
                        </p>
                        <p className="mt-1 text-sm text-gray-700">{item.unidade_medida}</p>
                        {item.quantidade_automatica && (
                          <p className="mt-2 text-xs text-gray-500">
                            Use o botão ao lado para calcular automaticamente a partir do período informado.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
                </div>
              ) : (
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <h3 className="flex items-center gap-2 text-base font-bold text-gray-900">
                    <FileText className="h-4 w-4 text-gray-400" />
                    Lançamentos neste item ({itemLancamentos.length})
                  </h3>

                  {itemLancamentos.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {itemLancamentos.map((lancamento) => (
                        <div
                          key={lancamento.id}
                          className="group rounded-xl border border-gray-100 bg-gray-50/70 p-4 transition-colors hover:border-gray-200"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className="rounded-lg bg-green-50 p-2 text-green-700">
                                <CheckCircle2 className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-900">
                                  {lancamento.quantidade_informada} {item.unidade_medida}s
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(lancamento.data_inicio).toLocaleDateString()} a{' '}
                                  {new Date(lancamento.data_fim).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="pt-1 text-sm font-black text-gray-900">
                                +{lancamento.pontos_calculados} pts
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteLancamento(lancamento.id)}
                                disabled={isSubmitted}
                                aria-label="Apagar lançamento"
                                title="Apagar lançamento"
                                className={cn(
                                  'flex h-8 w-8 items-center justify-center rounded-full border bg-white shadow-sm transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-30',
                                  pendingDeleteId === lancamento.id
                                    ? 'border-amber-200 text-amber-600 opacity-100 hover:bg-amber-50 hover:text-amber-700'
                                    : 'border-red-200 text-red-500 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100',
                                )}
                              >
                                {pendingDeleteId === lancamento.id ? (
                                  <AlertCircle className="h-4 w-4" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                          <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-green-600">
                            {lancamento.status_auditoria}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/70 p-6 text-center">
                      <p className="text-sm font-medium text-gray-700">Nenhum lançamento neste item ainda.</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Use a aba de novo registro para adicionar a primeira comprovação.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'form' && (
                <div className="mt-10 flex justify-start">
                  <Button
                    onClick={handleSave}
                    disabled={isSubmitted || saving}
                    className="flex h-12 items-center gap-2 rounded-xl bg-primary px-10 text-base font-bold text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-[2px] hover:bg-primary/90 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {saving ? 'Persistindo documento...' : 'Salvar lançamento'}
                    <CheckCircle2 className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </section>
        </div>
      </div>
    </div>
  );
}
