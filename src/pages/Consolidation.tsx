import React, { useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { CheckCircle2, Download, FileText, Send, ShieldAlert, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import AppHeader from '../components/AppHeader';
import { Button } from '../components/ui/button';
import { useAppContext } from '../context/AppContext';
import { getEligibleRscLevel } from '../lib/rsc';

export default function Consolidation() {
  const { servidor, itensRSC, documentos, lancamentos, processo, submitProcess, logout } = useAppContext();
  const navigate = useNavigate();

  if (!servidor) {
    return <Navigate to="/" replace />;
  }

  const nivelElegivel = getEligibleRscLevel(servidor.escolaridade_atual);
  const lancamentosDoServidor = useMemo(
    () => lancamentos.filter((l) => l.servidor_id === servidor.id),
    [lancamentos, servidor.id],
  );
  const totalPontos = useMemo(
    () => lancamentosDoServidor.reduce((acc, l) => acc + l.pontos_calculados, 0),
    [lancamentosDoServidor],
  );
  const itensDistintos = useMemo(
    () => new Set(lancamentosDoServidor.map((l) => l.item_rsc_id)).size,
    [lancamentosDoServidor],
  );

  const resumoItens = useMemo(() => {
    const map = new Map<string, { itemId: string; numero: number; inciso: string; descricao: string; pontos: number; docCount: number }>();
    lancamentosDoServidor.forEach((l) => {
      const item = itensRSC.find((i) => i.id === l.item_rsc_id);
      if (!item) return;
      const cur = map.get(item.id);
      map.set(item.id, {
        itemId: item.id,
        numero: item.numero,
        inciso: item.inciso,
        descricao: item.descricao,
        pontos: Number(((cur?.pontos ?? 0) + l.pontos_calculados).toFixed(2)),
        docCount: (cur?.docCount ?? 0) + 1,
      });
    });
    return Array.from(map.values()).sort((a, b) => a.numero - b.numero);
  }, [itensRSC, lancamentosDoServidor]);

  const documentosUtilizados = useMemo(() => {
    const ids = new Set(lancamentosDoServidor.map((l) => l.documento_id));
    return documentos
      .filter((d) => ids.has(d.id))
      .sort((a, b) => (a.data_upload < b.data_upload ? 1 : -1));
  }, [documentos, lancamentosDoServidor]);

  const pendencias = useMemo(() => {
    const issues: string[] = [];
    if (!nivelElegivel) issues.push('Nao foi possivel determinar o nivel pleiteavel pela escolaridade atual.');
    if (lancamentosDoServidor.length === 0) issues.push('Nenhum lancamento foi registrado ainda.');
    if (nivelElegivel && totalPontos < nivelElegivel.pontosMinimos)
      issues.push(`Ainda faltam ${Number((nivelElegivel.pontosMinimos - totalPontos).toFixed(2))} pontos para liberar o envio.`);
    if (nivelElegivel && itensDistintos < nivelElegivel.itensMinimos)
      issues.push(`Ainda faltam ${nivelElegivel.itensMinimos - itensDistintos} itens distintos para liberar o envio.`);
    if (documentosUtilizados.length === 0) issues.push('Nenhum documento vinculado foi encontrado para a consolidacao.');
    return issues;
  }, [documentosUtilizados.length, itensDistintos, lancamentosDoServidor.length, nivelElegivel, totalPontos]);

  const canSubmit = pendencias.length === 0 && processo.status !== 'Em triagem';
  const today = new Date().toLocaleDateString('pt-BR');

  const handleExport = () => window.print();

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
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* App header — hidden on print */}
      <div className="print:hidden">
        <AppHeader
          activeView="consolidate"
          onNavigateDashboard={() => navigate('/dashboard')}
          onNavigateCatalog={() => navigate('/itens')}
          onNavigateWorkspace={() => navigate('/workspace')}
          onNavigateConsolidate={() => undefined}
          onLogout={() => { logout(); navigate('/'); }}
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
      </div>

      <main className="mx-auto max-w-4xl px-4 py-8 print:p-0 print:max-w-none">

        {/* Action toolbar — hidden on print */}
        <div className="mb-4 flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Consolidacao do Processo</h1>
            <p className="text-sm text-gray-500">Revise a ficha antes do envio definitivo.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} className="border-gray-300 text-gray-700 text-sm">
              <Download className="mr-2 h-4 w-4" />
              Exportar ficha
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="bg-primary text-white hover:bg-primary/90 disabled:opacity-60 text-sm"
            >
              <Send className="mr-2 h-4 w-4" />
              {processo.status === 'Em triagem' ? 'Em triagem' : 'Enviar processo'}
            </Button>
          </div>
        </div>

        {/* ── Document / Ficha ── */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">

          {/* Document header */}
          <div className="flex items-stretch border-b-2 border-gray-800 print:border-gray-900">
            {/* Logo block */}
            <div className="flex shrink-0 flex-col items-center justify-center border-r border-gray-300 px-4 py-3">
              <img src="/logo_ifes.png" alt="Logo IFES" className="h-9 w-9 object-contain" />
            </div>
            {/* Title block */}
            <div className="flex flex-col justify-center px-5 py-3 flex-1">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-500">
                Instituto Federal do Espírito Santo
              </p>
              <h1 className="text-sm font-black text-gray-900 leading-tight">
                Ficha de Consolidação — RSC-TAE
              </h1>
              <p className="text-[10px] text-gray-400">
                Reconhecimento de Saberes e Competências — Técnico-Administrativos em Educação
              </p>
            </div>
            {/* Date / status block */}
            <div className="flex shrink-0 flex-col items-end justify-center border-l border-gray-200 px-5 py-3 text-right">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Data</p>
              <p className="text-xs font-bold text-gray-900">{today}</p>
              <span className={`mt-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                processo.status === 'Em triagem'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {processo.status}
              </span>
            </div>
          </div>

          {/* ── Section 1: Identificação ── */}
          <div className="border-b border-gray-200">
            <div className="bg-gray-50 px-5 py-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">1. Identificação do Servidor</p>
            </div>
            <div className="grid grid-cols-2 gap-0 divide-x divide-gray-100 sm:grid-cols-4">
              <div className="px-4 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">Nome</p>
                <p className="mt-0.5 truncate text-xs font-semibold text-gray-900">{servidor.nome_completo}</p>
              </div>
              <div className="px-4 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">SIAPE</p>
                <p className="mt-0.5 text-xs font-semibold text-gray-900">{servidor.siape}</p>
              </div>
              <div className="px-4 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">Lotação</p>
                <p className="mt-0.5 truncate text-xs font-semibold text-gray-900">{servidor.lotacao}</p>
              </div>
              <div className="px-4 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">Escolaridade atual</p>
                <p className="mt-0.5 text-xs font-semibold text-gray-900">{servidor.escolaridade_atual}</p>
              </div>
            </div>
          </div>

          {/* ── Section 2: Dados do Pedido ── */}
          <div className="border-b border-gray-200">
            <div className="bg-gray-50 px-5 py-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">2. Dados do Pedido</p>
            </div>
            <div className="grid grid-cols-2 gap-0 divide-x divide-gray-100 sm:grid-cols-4">
              <div className="px-4 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">Nível pleiteável</p>
                <p className="mt-0.5 text-xs font-bold text-gray-900">
                  {nivelElegivel ? nivelElegivel.label : 'Não mapeado'}
                </p>
              </div>
              <div className="px-4 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">Equivalência</p>
                <p className="mt-0.5 text-xs font-semibold text-gray-900">
                  {nivelElegivel ? nivelElegivel.equivalencia : '—'}
                </p>
              </div>
              <div className="px-4 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">Pontuação total</p>
                <p className="mt-0.5 text-base font-black text-gray-900">{totalPontos.toFixed(2)} <span className="text-[10px] font-normal text-gray-500">pts</span></p>
                {nivelElegivel && (
                  <p className="text-[9px] text-gray-400">mín. {nivelElegivel.pontosMinimos} pts</p>
                )}
              </div>
              <div className="px-4 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">Itens distintos</p>
                <p className="mt-0.5 text-base font-black text-gray-900">{itensDistintos} <span className="text-[10px] font-normal text-gray-500">iten{itensDistintos !== 1 ? 's' : ''}</span></p>
                {nivelElegivel && (
                  <p className="text-[9px] text-gray-400">mín. {nivelElegivel.itensMinimos} itens</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Section 3: Pendências ── */}
          {pendencias.length > 0 && (
            <div className="border-b border-gray-200">
              <div className="bg-gray-50 px-5 py-1">
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">3. Pendências para envio</p>
              </div>
              <div className="px-5 py-2 space-y-1">
                {pendencias.map((p) => (
                  <div key={p} className="flex items-start gap-2 text-xs text-gray-700">
                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-gray-400" />
                    {p}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ready-to-send banner */}
          {pendencias.length === 0 && (
            <div className="border-b border-gray-200 bg-gray-50 px-5 py-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Todas as exigências foram atendidas — processo pronto para envio.
              </div>
            </div>
          )}

          {/* ── Section 4: Itens consolidados ── */}
          <div className="border-b border-gray-200">
            <div className="bg-gray-50 px-5 py-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
                {pendencias.length > 0 ? '4' : '3'}. Itens Consolidados
              </p>
            </div>

            {resumoItens.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-4 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-gray-400 w-10">Nº</th>
                    <th className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-gray-400 w-14">Inciso</th>
                    <th className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-gray-400">Descrição</th>
                    <th className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-gray-400 text-center w-12">Docs</th>
                    <th className="px-4 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-gray-400 text-right w-20">Pontos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {resumoItens.map((item) => (
                    <tr
                      key={item.itemId}
                      onClick={() => navigate(`/workspace?item=${item.itemId}`)}
                      className="cursor-pointer transition-colors hover:bg-primary/5 print:cursor-default print:hover:bg-transparent"
                    >
                      <td className="px-4 py-1.5">
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                          {item.numero}
                        </span>
                      </td>
                      <td className="px-3 py-1.5">
                        <span className="text-[10px] font-semibold text-gray-500">Inc. {item.inciso}</span>
                      </td>
                      <td className="px-3 py-1.5 text-xs text-gray-800">{item.descricao}</td>
                      <td className="px-3 py-1.5 text-center text-[10px] text-gray-500">{item.docCount}</td>
                      <td className="px-4 py-1.5 text-right text-xs font-black text-gray-900 tabular-nums">
                        {item.pontos.toFixed(2)}
                        <span className="ml-1 text-[9px] font-normal text-gray-400">pts</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td colSpan={4} className="px-4 py-1.5 text-[9px] font-bold text-gray-600 uppercase tracking-wide">
                      Total
                    </td>
                    <td className="px-4 py-1.5 text-right text-xs font-black text-gray-900 tabular-nums">
                      {totalPontos.toFixed(2)}
                      <span className="ml-1 text-[9px] font-normal text-gray-400">pts</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <div className="px-5 py-5 text-center text-xs text-gray-400">
                Nenhum item consolidado até o momento.
              </div>
            )}
          </div>

          {/* ── Section 5: Documentos vinculados ── */}
          <div>
            <div className="bg-gray-50 px-5 py-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
                {pendencias.length > 0 ? '5' : '4'}. Documentos Comprobatórios
              </p>
            </div>

            {documentosUtilizados.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-4 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-gray-400">Arquivo</th>
                    <th className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-gray-400 w-32">Hash (SHA-256)</th>
                    <th className="px-4 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-gray-400 text-right w-36">Data de upload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {documentosUtilizados.map((doc) => (
                    <tr key={doc.id}>
                      <td className="px-4 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3 w-3 shrink-0 text-gray-300" />
                          <span className="text-xs font-medium text-gray-800">{doc.nome_arquivo}</span>
                        </div>
                        {doc.gedoc_links && doc.gedoc_links.length > 0 && (
                          <p className="mt-0.5 pl-4.5 text-[9px] text-gray-400">
                            {doc.gedoc_links.length} link(s) GeDoc mesclado(s)
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        <span className="font-mono text-[9px] text-gray-400">
                          {doc.hash_arquivo ? doc.hash_arquivo.slice(0, 16) + '…' : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-1.5 text-right text-[10px] text-gray-500">
                        {new Date(doc.data_upload).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-5 py-5 text-center text-xs text-gray-400">
                Nenhum documento vinculado ainda.
              </div>
            )}
          </div>

          {/* Document footer */}
          <div className="border-t-2 border-gray-200 px-5 py-3 print:border-gray-400">
            <div className="flex items-center justify-between text-[9px] text-gray-400">
              <span>RSC-TAE — IFES · Ficha gerada em {today}</span>
              <span className="font-mono">
                {servidor.siape} · {nivelElegivel?.label ?? '—'}
              </span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
