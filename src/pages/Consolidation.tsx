import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { CheckCircle2, Download, FileText, Send, AlertCircle, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import AppLogo from '../components/AppLogo';
import AppHeader from '../components/AppHeader';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { institutionConfig } from '../config/institution';
import { useAppContext } from '../context/AppContext';
import { exportPacoteRSC } from '../lib/pacoteExport';
import { addPointValues, formatPointValue, sumPointValues } from '../lib/points';
import { getEligibleRscLevel, getEligibleRscLevels, validateLevelConstraints } from '../lib/rsc';

export default function Consolidation() {
  const { servidor, itensRSC, documentos, lancamentos, processo, updateProcesso } = useAppContext();
  const navigate = useNavigate();

  if (!servidor) {
    return <Navigate to="/perfil" replace />;
  }

  const nivelElegivel = getEligibleRscLevel(servidor.escolaridade_atual);
  const lancamentosDoServidor = useMemo(
    () => lancamentos.filter((l) => l.servidor_id === servidor.id),
    [lancamentos, servidor.id],
  );
  const totalPontos = useMemo(
    () => sumPointValues(lancamentosDoServidor.map((entry) => entry.pontos_calculados)),
    [lancamentosDoServidor],
  );
  const docUtilizadosSet = useMemo(
    () => new Set(lancamentosDoServidor.map((l) => l.documento_id).filter(Boolean)),
    [lancamentosDoServidor],
  );

  const itensDistintos = useMemo(
    () => new Set(lancamentosDoServidor.map((l) => l.item_rsc_id)).size,
    [lancamentosDoServidor],
  );

  const [autodeclaracaoGeral, setAutodeclaracaoGeral] = useState(false);
  const niveisPleiteaveis = useMemo(
    () => getEligibleRscLevels(servidor.escolaridade_atual),
    [servidor.escolaridade_atual],
  );
  const [nivelPleiteadoId, setNivelPleiteadoId] = useState(
    processo.nivel_pleiteado_id ?? nivelElegivel?.id ?? '',
  );
  const [saldoConcessaoAnterior, setSaldoConcessaoAnterior] = useState(
    processo.saldo_concessao_anterior?.toString() ?? '',
  );
  const [numeroProcessoAnterior, setNumeroProcessoAnterior] = useState(
    processo.numero_processo_anterior ?? '',
  );
  const [dataUltimaConcessao, setDataUltimaConcessao] = useState(
    processo.data_ultima_concessao ?? '',
  );
  const nivelPleiteado = useMemo(
    () => niveisPleiteaveis.find((nivel) => nivel.id === nivelPleiteadoId) ?? null,
    [nivelPleiteadoId, niveisPleiteaveis],
  );
  const incisoViolations = useMemo(
    () =>
      nivelPleiteado
        ? validateLevelConstraints(nivelPleiteado.id as string, lancamentosDoServidor, itensRSC)
        : [],
    [nivelPleiteado, lancamentosDoServidor, itensRSC],
  );

  const metasAtingidas =
    !!nivelPleiteado &&
    totalPontos >= nivelPleiteado.pontosMinimos &&
    itensDistintos >= nivelPleiteado.itensMinimos &&
    incisoViolations.length === 0;

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
        pontos: addPointValues(cur?.pontos ?? 0, l.pontos_calculados),
        docCount: (cur?.docCount ?? 0) + 1,
      });
    });
    return Array.from(map.values()).sort((a, b) => a.numero - b.numero);
  }, [itensRSC, lancamentosDoServidor]);

  const resumoByInciso = useMemo(() => {
    const groups = new Map<string, typeof resumoItens>();
    for (const row of resumoItens) {
      const group = groups.get(row.inciso) ?? [];
      group.push(row);
      groups.set(row.inciso, group);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [resumoItens]);

  const documentosUtilizados = useMemo(() => {
    const ids = new Set(lancamentosDoServidor.map((l) => l.documento_id));
    return documentos
      .filter((d) => ids.has(d.id))
      .sort((a, b) => (a.data_upload < b.data_upload ? 1 : -1));
  }, [documentos, lancamentosDoServidor]);

  useEffect(() => {
    if (!nivelPleiteadoId && nivelElegivel?.id) {
      setNivelPleiteadoId(nivelElegivel.id);
    }
  }, [nivelElegivel?.id, nivelPleiteadoId]);

  useEffect(() => {
    updateProcesso({
      nivel_pleiteado_id: nivelPleiteadoId || undefined,
      saldo_concessao_anterior:
        saldoConcessaoAnterior.trim() === ''
          ? undefined
          : Number.parseFloat(saldoConcessaoAnterior),
      numero_processo_anterior: numeroProcessoAnterior.trim() || undefined,
      data_ultima_concessao: dataUltimaConcessao || undefined,
    });
  }, [
    dataUltimaConcessao,
    nivelPleiteadoId,
    numeroProcessoAnterior,
    saldoConcessaoAnterior,
    updateProcesso,
  ]);

  const possuiDadosConcessaoAnterior =
    !!numeroProcessoAnterior.trim() ||
    !!saldoConcessaoAnterior.trim() ||
    !!dataUltimaConcessao;

  const intersticioOk = useMemo(() => {
    if (!dataUltimaConcessao) return true;
    const ultimaConcessao = new Date(`${dataUltimaConcessao}T00:00:00`);
    if (Number.isNaN(ultimaConcessao.getTime())) return false;
    const hoje = new Date();
    const dataLimite = new Date(ultimaConcessao);
    dataLimite.setFullYear(dataLimite.getFullYear() + 3);
    return hoje >= dataLimite;
  }, [dataUltimaConcessao]);

  const checks = useMemo(() => {
    const profileOk =
      !!servidor.email_institucional?.trim() &&
      !!servidor.lotacao?.trim() &&
      !!servidor.cargo?.trim() &&
      !!servidor.nivel_classificacao &&
      !!servidor.data_ingresso_ife;
    const nivelOk = !!nivelPleiteado;
    const lancamentosOk = lancamentosDoServidor.length > 0;
    const pontosOk = nivelPleiteado ? totalPontos >= nivelPleiteado.pontosMinimos : false;
    const itensOk = nivelPleiteado ? itensDistintos >= nivelPleiteado.itensMinimos : false;

    return [
      {
        ok: profileOk,
        label: 'Perfil completo',
        detail: profileOk
          ? 'Dados do servidor suficientes para preencher o memorial e o requerimento.'
          : 'Faltam dados obrigatórios do perfil para fechar a documentação.',
        action: profileOk ? undefined : { label: 'Completar perfil', href: '/perfil' },
      },
      {
        ok: nivelOk,
        label: 'Nível pleiteado definido',
        detail: nivelOk
          ? `${nivelPleiteado!.label} (${nivelPleiteado!.equivalencia})`
          : 'Selecione o nível que será levado para o requerimento.',
      },
      {
        ok: lancamentosOk,
        label: 'Lançamentos registrados',
        detail: lancamentosOk
          ? `${lancamentosDoServidor.length} lançamento(s) registrado(s).`
          : 'Nenhum lançamento registrado ainda.',
        action: lancamentosOk ? undefined : { label: 'Lançar documentos', href: '/workspace' },
      },
      {
        ok: pontosOk,
        label: 'Pontuação mínima atingida',
        detail: nivelPleiteado
          ? pontosOk
            ? `${formatPointValue(totalPontos)} pts — meta de ${formatPointValue(nivelPleiteado.pontosMinimos)} pts atingida.`
            : `${formatPointValue(totalPontos)} / ${formatPointValue(nivelPleiteado.pontosMinimos)} pts — faltam ${formatPointValue(nivelPleiteado.pontosMinimos - totalPontos)} pts.`
          : 'Nível não definido.',
      },
      {
        ok: itensOk,
        label: 'Itens distintos mínimos',
        detail: nivelPleiteado
          ? itensOk
            ? `${itensDistintos} itens — meta de ${nivelPleiteado.itensMinimos} atingida.`
            : `${itensDistintos} / ${nivelPleiteado.itensMinimos} itens — faltam ${nivelPleiteado.itensMinimos - itensDistintos}.`
          : 'Nível não definido.',
      },
      {
        ok: incisoViolations.length === 0,
        label: 'Incisos obrigatórios atendidos',
        detail:
          incisoViolations.length === 0
            ? 'Lançamentos presentes nos incisos exigidos para o nível.'
            : incisoViolations
                .map((v) => `Falta item dos Incisos ${[...v.requiredIncisos].join('/')}`)
                .join(' · '),
      },
      {
        ok: intersticioOk,
        label: 'Interstício de 3 anos',
        detail: dataUltimaConcessao
          ? intersticioOk
            ? 'Data da última concessão compatível com novo requerimento.'
            : 'A data informada da última concessão ainda não completa 3 anos.'
          : 'Sem concessão anterior informada.',
      },
      {
        ok: autodeclaracaoGeral,
        label: 'Veracidade das Informações',
        detail: autodeclaracaoGeral
          ? 'Declaração de veracidade registrada nesta preparação do dossiê.'
          : 'Falta concordar com a Autodeclaração Geral atestando a veracidade das informações.',
      },
    ];
  }, [autodeclaracaoGeral, dataUltimaConcessao, incisoViolations, intersticioOk, itensDistintos, lancamentosDoServidor, nivelPleiteado, servidor, totalPontos]);

  const pendencias = useMemo(() => {
    const issues: string[] = [];
    if (!nivelPleiteado) issues.push('Selecione o nível que será levado para o requerimento.');
    if (lancamentosDoServidor.length === 0) issues.push('Nenhum lançamento foi registrado ainda.');
    if (nivelPleiteado && totalPontos < nivelPleiteado.pontosMinimos)
      issues.push(`Ainda faltam ${formatPointValue(nivelPleiteado.pontosMinimos - totalPontos)} pontos para liberar o envio.`);
    if (nivelPleiteado && itensDistintos < nivelPleiteado.itensMinimos)
      issues.push(`Ainda faltam ${nivelPleiteado.itensMinimos - itensDistintos} itens distintos para liberar o envio.`);
    for (const v of incisoViolations)
      issues.push(`Falta ao menos um lançamento em algum dos Incisos: ${[...v.requiredIncisos].join('/')}.`);
    if (!intersticioOk)
      issues.push('A data informada da última concessão ainda não completa o interstício de 3 anos.');
    if (!autodeclaracaoGeral)
      issues.push('Você precisa concordar com a Autodeclaração de veracidade das informações.');
    return issues;
  }, [autodeclaracaoGeral, incisoViolations, intersticioOk, itensDistintos, lancamentosDoServidor.length, nivelPleiteado, totalPontos]);

  const canGenerate = checks.every((c) => c.ok);
  const today = new Date().toLocaleDateString('pt-BR');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = () => window.print();

  const handleGenerate = async () => {
    if (!canGenerate) {
      toast.error('Revise as pendências antes de gerar o pacote.');
      return;
    }
    setIsGenerating(true);
    try {
      await exportPacoteRSC({
        servidor,
        nivelElegivel: nivelPleiteado,
        lancamentos: lancamentosDoServidor,
        itensRSC,
        documentos,
        processo: {
          ...processo,
          nivel_pleiteado_id: nivelPleiteado?.id,
          saldo_concessao_anterior:
            saldoConcessaoAnterior.trim() === ''
              ? undefined
              : Number.parseFloat(saldoConcessaoAnterior),
          numero_processo_anterior: numeroProcessoAnterior.trim() || undefined,
          data_ultima_concessao: dataUltimaConcessao || undefined,
        },
      });
      updateProcesso({
        nivel_pleiteado_id: nivelPleiteado?.id,
        pontos_total_submissao: totalPontos,
        itens_distintos_submissao: itensDistintos,
        submitted_at: new Date().toISOString(),
      });
      toast.success('Pacote RSC gerado e baixado com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar pacote:', err);
      toast.error('Erro ao gerar o pacote. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* App header — hidden on print */}
      <div className="print:hidden">
        <AppHeader
          activeView="consolidate"
          onNavigateDashboard={() => navigate('/dashboard')}
          onNavigateHome={() => navigate('/')}
          onNavigateCatalog={() => navigate('/itens')}
          onNavigateWorkspace={() => navigate('/workspace')}
          onNavigateConsolidate={() => undefined}
          onNavigateProfile={() => navigate('/perfil')}
          secondaryContent={
            <>
              <div className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600">
              <span className="font-semibold text-gray-900">Total:</span> {formatPointValue(totalPontos)} pts
              </div>
              <div className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600">
                <span className="font-semibold text-gray-900">Itens:</span> {itensDistintos}
              </div>
              {metasAtingidas && (
                <div className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm">
                  <CheckCircle2 className="h-3 w-3" />
                  Metas atingidas
                </div>
              )}
              <div className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600">
                <span className="font-semibold text-gray-900">Nível pleiteado:</span>{' '}
                {nivelPleiteado ? nivelPleiteado.label : 'Não definido'}
              </div>
            </>
          }
        />
      </div>

      <main className="mx-auto max-w-4xl px-4 py-8 print:p-0 print:max-w-none">

        {/* Pre-flight checklist — hidden on print */}
        <div className="mb-4 print:hidden">
          <div className={`rounded-xl border bg-white shadow-sm ${canGenerate ? 'border-emerald-200' : 'border-amber-200'}`}>
            <div className={`flex items-center gap-2 rounded-t-xl px-5 py-3 ${canGenerate ? 'bg-emerald-50' : 'bg-amber-50'}`}>
              {canGenerate ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600" />
              )}
              <p className={`text-sm font-bold ${canGenerate ? 'text-emerald-800' : 'text-amber-800'}`}>
                {canGenerate ? 'Tudo pronto para gerar o pacote RSC' : 'Pendências antes de gerar o pacote RSC'}
              </p>
              <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${canGenerate ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {checks.filter((c) => c.ok).length}/{checks.length}
              </span>
            </div>
            <ul className="divide-y divide-gray-100 px-5">
              {checks.map((check) => (
                <li key={check.label} className="flex items-center gap-3 py-2.5">
                  {check.ok ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-amber-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <span className={`text-sm font-semibold ${check.ok ? 'text-gray-700' : 'text-gray-900'}`}>
                      {check.label}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">{check.detail}</span>
                  </div>
                  {check.action && (
                    <button
                      type="button"
                      onClick={() => navigate(check.action!.href)}
                      className="shrink-0 rounded-lg border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50"
                    >
                      {check.action.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mb-4 print:hidden">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-sm font-bold text-gray-900">Dados do Requerimento</p>
              <p className="text-sm text-gray-500">
                Esses dados entram no requerimento e no memorial exportados pelo sistema.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nivel-pleiteado">Nível pleiteado</Label>
                <select
                  id="nivel-pleiteado"
                  value={nivelPleiteadoId}
                  onChange={(e) => setNivelPleiteadoId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Selecione...</option>
                  {niveisPleiteaveis.map((nivel) => (
                    <option key={nivel.id} value={nivel.id}>
                      {nivel.label} ({nivel.equivalencia})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="saldo-anterior">Saldo de pontos da concessão anterior</Label>
                <Input
                  id="saldo-anterior"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex.: 4.5"
                  value={saldoConcessaoAnterior}
                  onChange={(e) => setSaldoConcessaoAnterior(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="processo-anterior">Número do processo anterior</Label>
                <Input
                  id="processo-anterior"
                  placeholder="Ex.: 23000.000000/2024-00"
                  value={numeroProcessoAnterior}
                  onChange={(e) => setNumeroProcessoAnterior(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ultima-concessao">Data da última concessão</Label>
                <Input
                  id="ultima-concessao"
                  type="date"
                  value={dataUltimaConcessao}
                  onChange={(e) => setDataUltimaConcessao(e.target.value)}
                />
              </div>
            </div>

            {possuiDadosConcessaoAnterior && (
              <p className={`mt-4 text-xs ${intersticioOk ? 'text-gray-500' : 'text-amber-700'}`}>
                {intersticioOk
                  ? 'Os dados de concessão anterior serão incluídos no pacote exportado.'
                  : 'Revise a data da última concessão: o sistema identificou que o interstício de 3 anos ainda não foi cumprido.'}
              </p>
            )}
          </div>
        </div>

        <div className="mb-4 print:hidden">
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
            <p className="mb-2 text-sm font-bold text-amber-900">Autodeclaração / Veracidade das Informações</p>
            <p className="mb-4 text-sm text-amber-800">
              Para prosseguir e gerar o pacote RSC definitivo, você precisa declarar
              oficialmente que todas as informações registradas conferem com a realidade.
            </p>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-white p-4 transition-colors hover:bg-amber-50/50">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                checked={autodeclaracaoGeral}
                onChange={(e) => setAutodeclaracaoGeral(e.target.checked)}
              />
              <span className="text-sm leading-relaxed text-gray-800">
                Declaro, para todos os fins de direito, sob as penas da lei, que realizei todas as atividades descritas nos itens consolidados, que a documentação comprobatória correspondente fornecida no pacote é autêntica e que as informações prestadas de modo geral no sistema são absolutamente verdadeiras.
              </span>
            </label>
          </div>
        </div>

        {/* Action toolbar — hidden on print */}
        <div className="mb-4 flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Consolidação do Processo</h1>
            <p className="text-sm text-gray-500">Revise a ficha antes do envio definitivo.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} className="border-gray-300 text-gray-700 text-sm">
              <Download className="mr-2 h-4 w-4" />
              Exportar ficha
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
              className="bg-primary text-white hover:bg-primary/90 disabled:opacity-60 text-sm"
            >
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {isGenerating ? 'Gerando...' : 'Gerar Pacote RSC'}
            </Button>
          </div>
        </div>

        {/* ── Document / Ficha ── */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">

          {/* Document header */}
          <div className="flex items-stretch border-b-2 border-gray-800 print:border-gray-900">
            {/* Logo block */}
            <div className="flex shrink-0 flex-col items-center justify-center border-r border-gray-300 px-4 py-3">
              <AppLogo className="h-9 w-9 object-contain" />
            </div>
            {/* Title block */}
            <div className="flex flex-col justify-center px-5 py-3 flex-1">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-500">
                {institutionConfig.networkName}
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
              <span className="mt-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-600">
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
                <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">Nível pleiteado</p>
                <p className="mt-0.5 text-xs font-bold text-gray-900">
                  {nivelPleiteado ? nivelPleiteado.label : 'Não definido'}
                </p>
              </div>
              <div className="px-4 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">Equivalência</p>
                <p className="mt-0.5 text-xs font-semibold text-gray-900">
                  {nivelPleiteado ? nivelPleiteado.equivalencia : '—'}
                </p>
              </div>
              <div className="px-4 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">Pontuação total</p>
                <p className="mt-0.5 text-base font-black text-gray-900">{formatPointValue(totalPontos)} <span className="text-[10px] font-normal text-gray-500">pts</span></p>
                {nivelPleiteado && (
                  <p className="text-[9px] text-gray-400">mín. {nivelPleiteado.pontosMinimos} pts</p>
                )}
              </div>
              <div className="px-4 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">Itens distintos</p>
                <p className="mt-0.5 text-base font-black text-gray-900">{itensDistintos} <span className="text-[10px] font-normal text-gray-500">iten{itensDistintos !== 1 ? 's' : ''}</span></p>
                {nivelPleiteado && (
                  <p className="text-[9px] text-gray-400">mín. {nivelPleiteado.itensMinimos} itens</p>
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

            {resumoByInciso.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="w-10 px-4 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-gray-400">Nº</th>
                    <th className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-gray-400">Descrição</th>
                    <th className="w-12 px-3 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wide text-gray-400">Docs</th>
                    <th className="w-20 px-4 py-1.5 text-right text-[9px] font-semibold uppercase tracking-wide text-gray-400">Pontos</th>
                  </tr>
                </thead>
                <tbody>
                  {resumoByInciso.map(([inciso, items]) => {
                    const incisoSubtotal = sumPointValues(items.map((i) => i.pontos));
                    return (
                      <React.Fragment key={inciso}>
                        <tr className="border-t border-gray-100 bg-gray-50/80">
                          <td colSpan={4} className="px-4 py-1 text-[9px] font-bold uppercase tracking-wider text-gray-500">
                            Inciso {inciso}
                          </td>
                        </tr>
                        {items.map((item) => (
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
                            <td className="px-3 py-1.5 text-xs text-gray-800">{item.descricao}</td>
                            <td className="px-3 py-1.5 text-center text-[10px] text-gray-500">{item.docCount}</td>
                            <td className="px-4 py-1.5 text-right text-xs font-black text-gray-900 tabular-nums">
                              {formatPointValue(item.pontos)}
                              <span className="ml-1 text-[9px] font-normal text-gray-400">pts</span>
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t border-gray-100/60 bg-gray-50/40">
                          <td colSpan={3} className="px-4 py-1 text-right text-[9px] font-semibold text-gray-400">
                            Subtotal Inciso {inciso}
                          </td>
                          <td className="px-4 py-1 text-right text-[10px] font-bold text-gray-600 tabular-nums">
                            {formatPointValue(incisoSubtotal)}
                            <span className="ml-1 text-[9px] font-normal text-gray-400">pts</span>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td colSpan={3} className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-wide text-gray-600">
                      Total
                    </td>
                    <td className="px-4 py-1.5 text-right text-xs font-black text-gray-900 tabular-nums">
                      {formatPointValue(totalPontos)}
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
                        <div className="flex items-start gap-1.5">
                          <FileText className="mt-0.5 h-3 w-3 shrink-0 text-gray-300" />
                          <span className="text-xs font-medium text-gray-800 break-all">{doc.nome_arquivo}</span>
                        </div>
                        {doc.gedoc_links && doc.gedoc_links.length > 0 && (
                          <p className="mt-0.5 pl-4.5 text-[9px] text-gray-400">
                            {doc.gedoc_links.length} link(s) de referência registrado(s)
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
              <span>{institutionConfig.shortName} · Ficha gerada em {today}</span>
              <span className="font-mono">
                {servidor.siape} · {nivelPleiteado?.label ?? '—'}
              </span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
