import React, { useState, useEffect } from 'react';
import { ItemRSC, Documento } from '../data/mock';
import { useAppContext } from '../context/AppContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { differenceInDays, parseISO, isValid } from 'date-fns';
import { Lock, Unlock, UploadCloud, FileText, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { mapearUsoDocumentos, codigosItensDosUsos, type UsoDocumento } from '../lib/duplicateDetection';

interface UploadCardProps {
  key?: React.Key;
  item: ItemRSC;
  isOpen: boolean;
  onToggle: () => void;
}

export default function UploadCard({ item, isOpen, onToggle }: UploadCardProps) {
  const { addLancamento, addDocumentoFromFile, servidor, lancamentos, itensRSC } = useAppContext();
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [quantidade, setQuantidade] = useState<number>(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [justificativa, setJustificativa] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    doc: Documento;
    docId: string;
    comprovantesIds: string[];
    usos: UsoDocumento[];
  } | null>(null);

  // Auto-calculate quantity based on dates (only for items with quantidade_automatica)
  useEffect(() => {
    if (!item.quantidade_automatica || isUnlocked) return;
    if (dataInicio && dataFim) {
      const start = parseISO(dataInicio);
      const end = parseISO(dataFim);
      if (isValid(start) && isValid(end) && end >= start) {
        const days = differenceInDays(end, start) + 1;
        setQuantidade(parseFloat((days / 30).toFixed(2)));
      } else {
        setQuantidade(0);
      }
    }
  }, [dataInicio, dataFim, isUnlocked, item.quantidade_automatica]);

  const handleSave = async () => {
    if (!servidor) return;

    if (!dataInicio || !dataFim) {
      toast.error('Preencha as datas de início e fim.');
      return;
    }

    if (isUnlocked && !justificativa) {
      toast.error('A justificativa é obrigatória ao alterar a quantidade.');
      return;
    }

    if (files.length === 0) {
      toast.error('Anexe ao menos um documento.');
      return;
    }

    const uploadedIds: string[] = [];
    let firstDocId: string | undefined;
    let duplicateDocFound: Documento | undefined = undefined;

    try {
      for (const f of files) {
        const { doc, exists } = await addDocumentoFromFile({
          servidorId: servidor.id,
          file: f,
        });
        // O mesmo arquivo selecionado duas vezes retorna o mesmo doc.id —
        // sem este guard o lançamento listaria o comprovante em duplicidade.
        if (!uploadedIds.includes(doc.id)) uploadedIds.push(doc.id);
        if (!firstDocId) firstDocId = doc.id;
        if (exists && !duplicateDocFound) {
          duplicateDocFound = doc;
        }
      }
      if (duplicateDocFound) {
        // O registro existente é sempre reaproveitado (nunca é criada cópia).
        // Só pede confirmação quando o documento já pontua em algum lançamento.
        const usos = mapearUsoDocumentos(lancamentos, itensRSC).get(duplicateDocFound.id) ?? [];
        if (usos.length > 0) {
          setDuplicateWarning({ doc: duplicateDocFound, docId: firstDocId!, comprovantesIds: uploadedIds, usos });
          return;
        }
        toast.info(`O arquivo "${duplicateDocFound.nome_arquivo}" já estava no sistema — o documento existente foi reaproveitado, sem criar cópia.`);
      }
    } catch (error) {
      toast.error('Erro ao processar arquivo. Verifique o formato PDF.');
      return;
    }

    finishSave(firstDocId!, uploadedIds);
  };

  const finishSave = (docId: string, comprovantesIds: string[]) => {
    const pontosCalculados = quantidade * item.pontos_por_unidade;

    addLancamento({
      servidor_id: servidor!.id,
      item_rsc_id: item.id,
      documento_id: docId,
      comprovantes_ids: comprovantesIds,
      data_inicio: dataInicio,
      data_fim: dataFim,
      quantidade_informada: quantidade,
      justificativa_alteracao: isUnlocked ? justificativa : undefined,
      pontos_calculados: pontosCalculados,
    });

    toast.success(`Lançamento salvo! Você acumulou +${pontosCalculados} pontos no Inciso ${item.inciso}`);

    // Reset form
    setDataInicio('');
    setDataFim('');
    setQuantidade(0);
    setIsUnlocked(false);
    setJustificativa('');
    setFiles([]);
    setDuplicateWarning(null);
    onToggle(); // Close accordion
  };

  return (
    <Card className="mb-4 overflow-hidden border-gray-200">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          <div className="bg-gray-100 text-gray-500 font-mono text-xs px-2 py-1 rounded">
            Item {item.numero}
          </div>
          <h4 className="font-medium text-gray-900">{item.descricao}</h4>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{item.pontos_por_unidade} pts / {item.unidade_medida}</span>
          {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-0 pb-4 px-4 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`inicio-${item.id}`}>Data de Início</Label>
                      <Input
                        id={`inicio-${item.id}`}
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`fim-${item.id}`}>Data de Fim</Label>
                      <Input
                        id={`fim-${item.id}`}
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`qtd-${item.id}`}>Quantidade Calculada ({item.unidade_medida}s)</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-gray-500 hover:text-gray-900"
                        onClick={() => setIsUnlocked(!isUnlocked)}
                      >
                        {isUnlocked ? <Unlock className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                        {isUnlocked ? 'Bloquear' : 'Desbloquear'}
                      </Button>
                    </div>
                    <Input
                      id={`qtd-${item.id}`}
                      type="number"
                      value={quantidade}
                      onChange={(e) => setQuantidade(Number(e.target.value))}
                      disabled={!isUnlocked}
                      className={!isUnlocked ? 'bg-gray-50' : ''}
                    />
                  </div>

                  {isUnlocked && (
                    <div className="space-y-2">
                      <Label htmlFor={`just-${item.id}`} className="text-amber-700">Justificativa (Obrigatória)</Label>
                      <Input
                        id={`just-${item.id}`}
                        placeholder="Motivo da alteração manual..."
                        value={justificativa}
                        onChange={(e) => setJustificativa(e.target.value)}
                        className="border-amber-300 focus-visible:ring-amber-500"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Comprovação Documental</Label>
                    <div className="flex gap-2">
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors relative">
                    <input
                      type="file"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept=".pdf"
                      multiple
                      onChange={(e) => {
                        if (e.target.files) {
                          setFiles((prev) => [...prev, ...Array.from(e.target.files as FileList)]);
                        }
                      }}
                    />
                    <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm font-medium text-gray-900">
                      {files.length > 0 
                        ? `${files.length} arquivo(s) selecionado(s)` 
                        : 'Arraste os PDFs ou clique para buscar'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Tamanho máximo: 5MB por arquivo</p>
                  </div>

                  {files.length > 0 && (
                    <div className="space-y-1.5 rounded-lg border border-gray-100 bg-gray-50/50 p-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{files.length} arquivo(s) selecionado(s)</p>
                      {files.map((f, index) => (
                        <div key={index} className="flex items-center justify-between gap-2 rounded border border-gray-200 bg-white px-2 py-1.5 text-xs">
                          <span className="truncate font-medium text-gray-700 flex-1">{f.name}</span>
                          <button
                            type="button"
                            onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== index))}
                            className="text-red-500 hover:text-red-700 font-bold px-1"
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <Button onClick={handleSave} className="bg-green-700 hover:bg-green-800">
                  Salvar Lançamento
                </Button>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Duplicate Warning Modal */}
      <AnimatePresence>
        {duplicateWarning && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
            >
              {/* Decorative background element */}
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-50" />
              <div className="absolute -left-8 -bottom-8 h-24 w-24 rounded-full bg-blue-50" />

              <div className="relative p-8">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-inner">
                  <AlertCircle className="h-8 w-8" />
                </div>

                <h3 className="mb-3 text-xl font-black tracking-tight text-gray-900">Atenção: documento já pontua no processo</h3>

                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-gray-600">
                    O arquivo <strong className="text-gray-900">"{duplicateWarning.doc.nome_arquivo}"</strong> já está no sistema
                    e <strong className="text-gray-900">já pontua no(s) item(ns) {codigosItensDosUsos(duplicateWarning.usos).join(', ')}</strong>.
                  </p>

                  <p className="text-sm text-gray-500">
                    O mesmo documento não deve ser contado em duplicidade. Se prosseguir, o registro existente
                    será reaproveitado (não é criada cópia), mas o novo lançamento pode ser apontado como
                    dupla contagem na auditoria.
                  </p>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button
                    onClick={() => finishSave(duplicateWarning.docId, duplicateWarning.comprovantesIds)}
                    className="flex-1 bg-amber-600 font-bold text-white hover:bg-amber-700 shadow-lg shadow-amber-200"
                  >
                    Prosseguir mesmo assim
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDuplicateWarning(null);
                      setFiles([]);
                    }}
                    className="text-gray-500 hover:bg-gray-100"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Card>
  );
}
