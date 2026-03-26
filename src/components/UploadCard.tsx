import React, { useState, useEffect } from 'react';
import { ItemRSC, Documento } from '../data/mock';
import { useAppContext } from '../context/AppContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { differenceInDays, parseISO, isValid } from 'date-fns';
import { Lock, Unlock, UploadCloud, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadCardProps {
  key?: React.Key;
  item: ItemRSC;
  isOpen: boolean;
  onToggle: () => void;
}

export default function UploadCard({ item, isOpen, onToggle }: UploadCardProps) {
  const { addLancamento, addDocumento, documentos, servidor } = useAppContext();
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [quantidade, setQuantidade] = useState<number>(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [justificativa, setJustificativa] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);

  // Auto-calculate quantity based on dates
  useEffect(() => {
    if (dataInicio && dataFim && !isUnlocked) {
      const start = parseISO(dataInicio);
      const end = parseISO(dataFim);
      if (isValid(start) && isValid(end) && end >= start) {
        const days = differenceInDays(end, start) + 1;
        // Regra de 1 mês = 30 dias
        if (item.unidade_medida === 'mês') {
          setQuantidade(Math.floor(days / 30));
        } else {
          setQuantidade(1); // Default para outras unidades
        }
      } else {
        setQuantidade(0);
      }
    }
  }, [dataInicio, dataFim, isUnlocked, item.unidade_medida]);

  const handleSave = () => {
    if (!servidor) return;
    
    if (!dataInicio || !dataFim) {
      toast.error('Preencha as datas de início e fim.');
      return;
    }

    if (isUnlocked && !justificativa) {
      toast.error('A justificativa é obrigatória ao alterar a quantidade.');
      return;
    }

    if (!file && !selectedDocId) {
      toast.error('Anexe um documento ou selecione um existente.');
      return;
    }

    let docId = selectedDocId;

    if (file && !selectedDocId) {
      const newDoc = addDocumento({
        servidor_id: servidor.id,
        nome_arquivo: file.name,
      });
      docId = newDoc.id;
    }

    const pontosCalculados = quantidade * item.pontos_por_unidade;

    addLancamento({
      servidor_id: servidor.id,
      item_rsc_id: item.id,
      documento_id: docId,
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
    setFile(null);
    setSelectedDocId('');
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
              <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-sm italic rounded-md border border-blue-100 mb-6">
                <strong>Regra de Aceite:</strong> {item.regra_aceite}
              </div>

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
                  <Label>Comprovação Documental</Label>
                  
                  {!selectedDocId && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors relative">
                      <input 
                        type="file" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept=".pdf"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                      />
                      <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm font-medium text-gray-900">
                        {file ? file.name : 'Arraste o PDF ou clique para buscar'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Tamanho máximo: 5MB</p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 my-2">
                    <div className="h-px bg-gray-200 flex-1"></div>
                    <span className="text-xs text-gray-400 uppercase font-semibold">OU</span>
                    <div className="h-px bg-gray-200 flex-1"></div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Reutilizar Documento</Label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:opacity-50"
                      value={selectedDocId}
                      onChange={(e) => {
                        setSelectedDocId(e.target.value);
                        if (e.target.value) setFile(null);
                      }}
                      disabled={!!file}
                    >
                      <option value="">Selecione um documento enviado...</option>
                      {documentos.map(doc => (
                        <option key={doc.id} value={doc.id}>{doc.nome_arquivo}</option>
                      ))}
                    </select>
                  </div>
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
    </Card>
  );
}
