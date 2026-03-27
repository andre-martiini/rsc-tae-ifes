import React, { useState, useEffect } from 'react';
import { ItemRSC, Documento } from '../data/mock';
import { useAppContext } from '../context/AppContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { differenceInDays, parseISO, isValid } from 'date-fns';
import { Lock, Unlock, UploadCloud, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface ItemDetailPanelProps {
  item: ItemRSC;
  onSaved: () => void;
}

export default function ItemDetailPanel({ item, onSaved }: ItemDetailPanelProps) {
  const { addLancamento, addDocumento, documentos, servidor, lancamentos } = useAppContext();
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [quantidade, setQuantidade] = useState<number>(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [justificativa, setJustificativa] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);

  // Get existing launches for this item
  const itemLancamentos = lancamentos.filter(l => l.item_rsc_id === item.id);

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

    toast.success(`Lançamento salvo! Você acumulou +${pontosCalculados} pontos.`);
    
    // Reset form
    setDataInicio('');
    setDataFim('');
    setQuantidade(0);
    setIsUnlocked(false);
    setJustificativa('');
    setFile(null);
    setSelectedDocId('');
    onSaved();
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Detail Header */}
      <div className="px-8 py-6 border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-primary/10 text-primary font-mono text-xs px-2 py-1 rounded-md border border-primary/20">
            Item {item.numero}
          </span>
          <span className="text-sm font-medium text-gray-400">• Inciso {item.inciso}</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 leading-tight max-w-4xl">
          {item.descricao}
        </h2>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
            <span className="font-bold text-gray-900">{item.pontos_por_unidade} pts</span> por {item.unidade_medida}
          </div>
          {item.limite_pontos && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
              <AlertCircle className="w-4 h-4" />
              Limite: {item.limite_pontos} pts
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8 space-y-8">
          {/* Rules Section */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 hover:bg-blue-50 transition-colors">
              <h4 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Regra de Aceite
              </h4>
              <p className="text-sm text-blue-800 leading-relaxed italic">
                "{item.regra_aceite}"
              </p>
            </div>
            {item.documentos_comprobatorios && (
              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100 hover:bg-amber-50 transition-colors">
                <h4 className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Comprovação
                </h4>
                <p className="text-sm text-amber-800 leading-relaxed">
                  {item.documentos_comprobatorios}
                </p>
              </div>
            )}
          </section>

          {/* Form Section */}
          <section className="bg-gray-50/50 rounded-2xl p-8 border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-primary/10 transition-colors duration-500"></div>
            
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <div className="w-2 h-6 bg-primary rounded-full"></div>
              Novo Registro
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Dates and Quantity */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="data-inicio" className="text-xs font-bold uppercase tracking-wider text-gray-500">Data de Início</Label>
                    <Input 
                      id="data-inicio" 
                      type="date" 
                      className="bg-white border-gray-200 focus:ring-primary focus:border-primary transition-all h-11"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="data-fim" className="text-xs font-bold uppercase tracking-wider text-gray-500">Data de Fim</Label>
                    <Input 
                      id="data-fim" 
                      type="date" 
                      className="bg-white border-gray-200 focus:ring-primary focus:border-primary transition-all h-11"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="quantidade" className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Quantidade ({item.unidade_medida}s)
                    </Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`h-7 px-3 text-xs flex items-center gap-1.5 transition-colors ${
                        isUnlocked ? 'text-amber-600 bg-amber-50' : 'text-gray-400 hover:text-gray-600'
                      }`}
                      onClick={() => setIsUnlocked(!isUnlocked)}
                    >
                      {isUnlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      {isUnlocked ? 'Bloqueado Manualmente' : 'Desbloquear Edição'}
                    </Button>
                  </div>
                  <div className="relative">
                    <Input 
                      id="quantidade" 
                      type="number" 
                      className={`bg-white h-12 text-lg font-bold border-gray-200 focus:ring-primary transition-all ${
                        !isUnlocked ? 'bg-gray-50/80 cursor-not-allowed opacity-80' : ''
                      }`}
                      value={quantidade}
                      onChange={(e) => setQuantidade(Number(e.target.value))}
                      disabled={!isUnlocked}
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {isUnlocked && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <Label htmlFor="justificativa" className="text-xs font-bold uppercase tracking-wider text-amber-600">Justificativa da Alteração</Label>
                      <Input 
                        id="justificativa" 
                        placeholder="Explique o motivo do ajuste manual..."
                        className="bg-white border-amber-200 focus:ring-amber-500 focus:border-amber-500 h-11"
                        value={justificativa}
                        onChange={(e) => setJustificativa(e.target.value)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Right Column: Documents */}
              <div className="space-y-6">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">Comprovação Documental</Label>
                
                {!selectedDocId && (
                  <div className="relative group/upload h-32 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-center hover:border-primary hover:bg-primary/[0.02] transition-all cursor-pointer">
                    <input 
                      type="file" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      accept=".pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <div className="bg-gray-50 p-2.5 rounded-full group-hover/upload:bg-primary/10 transition-colors mb-3">
                      <UploadCloud className="w-6 h-6 text-gray-400 group-hover/upload:text-primary transition-colors" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700 group-hover/upload:text-primary transition-colors">
                      {file ? file.name : 'Clique para enviar PDF'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-bold">Máximo 5MB</p>
                  </div>
                )}

                <div className="flex items-center gap-4 py-2">
                  <div className="h-[1px] bg-gray-200 flex-1"></div>
                  <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest px-2">Ou selecione</span>
                  <div className="h-[1px] bg-gray-200 flex-1"></div>
                </div>

                <div className="space-y-2">
                  <select 
                    className="flex h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-50 transition-all appearance-none bg-[url('data:image/svg+xml;basis64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSJncmF5Ij48cGF0aCBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTE5IDlsLTcgNy03LTciLz48L3N2Zz4=')] bg-[length:20px] bg-[position:calc(100%-12px)_center] bg-no-repeat pr-10"
                    value={selectedDocId}
                    onChange={(e) => {
                      setSelectedDocId(e.target.value);
                      if (e.target.value) setFile(null);
                    }}
                    disabled={!!file}
                  >
                    <option value="">Buscar em documentos salvos...</option>
                    {documentos.map(doc => (
                      <option key={doc.id} value={doc.id}>{doc.nome_arquivo}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-10 flex justify-end">
              <Button 
                onClick={handleSave} 
                className="bg-primary hover:bg-primary/90 text-white px-10 h-12 rounded-xl font-bold text-base shadow-lg shadow-primary/20 transition-all hover:translate-y-[-2px] active:translate-y-[0px] flex items-center gap-2"
              >
                Salvar Lançamento
                <CheckCircle2 className="w-5 h-5" />
              </Button>
            </div>
          </section>

          {/* Previous History Section */}
          {itemLancamentos.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                Histórico neste Item ({itemLancamentos.length})
              </h3>
              <div className="space-y-2">
                {itemLancamentos.map((lanc) => (
                  <div key={lanc.id} className="bg-white border border-gray-100 p-4 rounded-xl flex items-center justify-between hover:border-gray-200 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="bg-green-50 text-green-700 p-2 rounded-lg">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {lanc.quantidade_informada} {item.unidade_medida}s
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(lanc.data_inicio).toLocaleDateString()} a {new Date(lanc.data_fim).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-gray-900">+{lanc.pontos_calculados} pts</span>
                      <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">{lanc.status_auditoria}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
