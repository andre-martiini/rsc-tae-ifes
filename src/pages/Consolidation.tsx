import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Download, FileText, Send, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import AppHeader from '../components/AppHeader';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useAppContext } from '../context/AppContext';
import { getEligibleRscLevel } from '../lib/rsc';

export default function Consolidation() {
  const { servidor, itensRSC, documentos, lancamentos, processo, submitProcess, logout } = useAppContext();
  const navigate = useNavigate();

  if (!servidor) {
    return null;
  }

  const nivelElegivel = getEligibleRscLevel(servidor.escolaridade_atual);
  const lancamentosDoServidor = useMemo(
    () => lancamentos.filter((lancamento) => lancamento.servidor_id === servidor.id),
    [lancamentos, servidor.id],
  );
  const totalPontos = useMemo(
    () => lancamentosDoServidor.reduce((acc, lancamento) => acc + lancamento.pontos_calculados, 0),
    [lancamentosDoServidor],
  );
  const itensDistintos = useMemo(
    () => new Set(lancamentosDoServidor.map((lancamento) => lancamento.item_rsc_id)).size,
    [lancamentosDoServidor],
  );

  const resumoItens = useMemo(() => {
    const itemMap = new Map<
      string,
      {
        itemId: string;
        numero: number;
        descricao: string;
        pontos: number;
        documentosIds: Set<string>;
      }
    >();

    lancamentosDoServidor.forEach((lancamento) => {
      const item = itensRSC.find((candidate) => candidate.id === lancamento.item_rsc_id);

      if (!item) {
        return;
      }

      const current = itemMap.get(item.id);
      const nextDocumentos = current?.documentosIds ?? new Set<string>();
      nextDocumentos.add(lancamento.documento_id);

      itemMap.set(item.id, {
        itemId: item.id,
        numero: item.numero,
        descricao: item.descricao,
        pontos: Number(((current?.pontos ?? 0) + lancamento.pontos_calculados).toFixed(2)),
        documentosIds: nextDocumentos,
      });
    });

    return Array.from(itemMap.values()).sort((a, b) => a.numero - b.numero);
  }, [itensRSC, lancamentosDoServidor]);

  const documentosUtilizados = useMemo(() => {
    const documentosIds = new Set(lancamentosDoServidor.map((lancamento) => lancamento.documento_id));
    return documentos
      .filter((documento) => documentosIds.has(documento.id))
      .sort((a, b) => (a.data_upload < b.data_upload ? 1 : -1));
  }, [documentos, lancamentosDoServidor]);

  const pendencias = useMemo(() => {
    const issues: string[] = [];

    if (!nivelElegivel) {
      issues.push('Nao foi possivel determinar o nivel pleiteavel pela escolaridade atual.');
    }

    if (lancamentosDoServidor.length === 0) {
      issues.push('Nenhum lancamento foi registrado ainda.');
    }

    if (nivelElegivel && totalPontos < nivelElegivel.pontosMinimos) {
      issues.push(
        `Ainda faltam ${Number((nivelElegivel.pontosMinimos - totalPontos).toFixed(2))} pontos para liberar o envio.`,
      );
    }

    if (nivelElegivel && itensDistintos < nivelElegivel.itensMinimos) {
      issues.push(`Ainda faltam ${nivelElegivel.itensMinimos - itensDistintos} itens distintos para liberar o envio.`);
    }

    if (documentosUtilizados.length === 0) {
      issues.push('Nenhum documento vinculado foi encontrado para a consolidacao.');
    }

    return issues;
  }, [documentosUtilizados.length, itensDistintos, lancamentosDoServidor.length, nivelElegivel, totalPontos]);

  const canSubmit = pendencias.length === 0 && processo.status !== 'Enviado';

  const handleExport = () => {
    window.print();
  };

  const handleSubmit = () => {
    if (!nivelElegivel || !canSubmit) {
      toast.error('Revise as pendencias antes de enviar o processo.');
      return;
    }

    submitProcess({
      nivel_pleiteado_id: nivelElegivel.id,
      pontos_total_submissao: totalPontos,
      itens_distintos_submissao: itensDistintos,
    });

    toast.success(`Processo enviado para analise no nivel ${nivelElegivel.label}.`);
  };

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <AppHeader
        activeView="consolidate"
        onNavigateDashboard={() => navigate('/dashboard')}
        onNavigateCatalog={() => navigate('/itens')}
        onNavigateWorkspace={() => navigate('/workspace')}
        onNavigateConsolidate={() => undefined}
        onLogout={() => {
          logout();
          navigate('/');
        }}
        secondaryContent={
          <>
            <div className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600">
              <span className="font-semibold text-gray-900">Status:</span> {processo.status}
            </div>
            <div className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600">
              <span className="font-semibold text-gray-900">Total:</span> {totalPontos.toFixed(2)} pts
            </div>
            <div className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600">
              <span className="font-semibold text-gray-900">Nivel pleiteavel:</span>{' '}
              {nivelElegivel ? nivelElegivel.label : 'Nao mapeado'}
            </div>
          </>
        }
      />

      <main className="mx-auto max-w-7xl space-y-6 p-6 print:p-0">
        <Card className="border-gray-200 bg-white shadow-sm print:border-0 print:shadow-none">
          <CardContent className="space-y-6 p-6 print:px-0">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Consolidacao do Processo</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Revise os dados consolidados do pedido antes do envio definitivo.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 print:hidden">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExport}
                  className="border-gray-200 text-gray-700"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar ficha
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="bg-primary text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {processo.status === 'Enviado' ? 'Processo enviado' : 'Enviar processo'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Servidor</p>
                <p className="mt-2 text-lg font-bold text-gray-900">{servidor.nome_completo}</p>
                <p className="text-xs text-gray-500">SIAPE {servidor.siape}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nivel pleiteavel</p>
                <p className="mt-2 text-lg font-bold text-gray-900">
                  {nivelElegivel ? nivelElegivel.label : 'Nao mapeado'}
                </p>
                <p className="text-xs text-gray-500">
                  {nivelElegivel ? nivelElegivel.equivalencia : 'Sem correspondencia'}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Pontuacao total</p>
                <p className="mt-2 text-3xl font-black text-gray-900">{totalPontos.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Itens distintos</p>
                <p className="mt-2 text-3xl font-black text-gray-900">{itensDistintos}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_360px]">
              <Card className="border-gray-200 shadow-none">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <h2 className="text-base font-bold text-gray-900">Itens consolidados</h2>
                  </div>
                  <div className="mt-4 space-y-3">
                    {resumoItens.length > 0 ? (
                      resumoItens.map((item) => (
                        <button
                          key={item.itemId}
                          type="button"
                          onClick={() => navigate(`/workspace?item=${item.itemId}`)}
                          className="flex w-full items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-left transition-all hover:border-primary/30 hover:bg-white hover:shadow-sm"
                        >
                          <div className="min-w-0">
                            <div className="mb-1 flex items-center gap-2">
                              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                                Item {item.numero}
                              </span>
                              <span className="text-[11px] text-gray-500">
                                {item.documentosIds.size} documento(s)
                              </span>
                            </div>
                            <p className="line-clamp-2 text-sm font-medium text-gray-800">{item.descricao}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-lg font-black text-gray-900">{item.pontos.toFixed(2)}</p>
                            <p className="text-[11px] text-gray-500">pts</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                        Nenhum item foi consolidado ate o momento.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="border-gray-200 shadow-none">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-amber-500" />
                      <h2 className="text-base font-bold text-gray-900">Pendencias</h2>
                    </div>
                    <div className="mt-4 space-y-3">
                      {pendencias.length > 0 ? (
                        pendencias.map((pendencia) => (
                          <div
                            key={pendencia}
                            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
                          >
                            {pendencia}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
                          <div className="flex items-center gap-2 font-semibold">
                            <CheckCircle2 className="h-4 w-4" />
                            Processo pronto para envio
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-gray-200 shadow-none">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <h2 className="text-base font-bold text-gray-900">Documentos vinculados</h2>
                    </div>
                    <div className="mt-4 space-y-3">
                      {documentosUtilizados.length > 0 ? (
                        documentosUtilizados.map((documento) => (
                          <div key={documento.id} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                            <p className="text-sm font-semibold text-gray-900">{documento.nome_arquivo}</p>
                            <p className="mt-1 text-[11px] text-gray-500">
                              Hash {documento.hash_arquivo?.slice(0, 12) ?? 'nao informado'}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              Enviado em {new Date(documento.data_upload).toLocaleString()}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-500">
                          Nenhum documento vinculado ainda.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
