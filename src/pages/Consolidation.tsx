import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { CheckCircle2, Download, FileText, Send, AlertCircle, Loader2, XCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import AppLogo from '../components/AppLogo';
import MainLayout from '../components/MainLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { institutionConfig } from '../config/institution';
import { useAppContext } from '../context/AppContext';
import { exportPacoteRSC } from '../lib/pacoteExport';
import { addPointValues, formatPointValue, sumPointValues } from '../lib/points';
import { getEligibleRscLevel, getEligibleRscLevels, validateLevelConstraints } from '../lib/rsc';
import { cn } from '../lib/utils';

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
  const [declaracaoNaoDuplicidade, setDeclaracaoNaoDuplicidade] = useState(false);
  const [declaracaoExcedeAtribuicoes, setDeclaracaoExcedeAtribuicoes] = useState(false);
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
        action: lancamentosOk ? undefined : { label: 'Lançar documentos', href: '/itens' },
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
      {
        ok: declaracaoNaoDuplicidade,
        label: 'Não-duplicidade de itens',
        detail: declaracaoNaoDuplicidade
          ? 'Confirmação de não-duplicidade registrada.'
          : 'Falta confirmar que itens/fatos não estão sendo duplicados no sistema.',
      },
      {
        ok: declaracaoExcedeAtribuicoes,
        label: 'Atividade Extraordinária',
        detail: declaracaoExcedeAtribuicoes
          ? 'Confirmação de atividade extraordinária registrada.'
          : 'Falta confirmar que atividades excedem as atribuições ordinárias.',
      },
    ];
  }, [autodeclaracaoGeral, declaracaoNaoDuplicidade, declaracaoExcedeAtribuicoes, dataUltimaConcessao, incisoViolations, intersticioOk, itensDistintos, lancamentosDoServidor, nivelPleiteado, servidor, totalPontos]);

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
    if (!declaracaoNaoDuplicidade)
      issues.push('Você precisa confirmar a declaração de não-duplicidade de itens.');
    if (!declaracaoExcedeAtribuicoes)
      issues.push('Você precisa confirmar a declaração de atividade extraordinária.');
    return issues;
  }, [autodeclaracaoGeral, declaracaoNaoDuplicidade, declaracaoExcedeAtribuicoes, incisoViolations, intersticioOk, itensDistintos, lancamentosDoServidor.length, nivelPleiteado, totalPontos]);

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

  const [activeTab, setActiveTab] = useState<'requerimento' | 'memorial'>('requerimento');

  return (
    <MainLayout activeView="consolidate">
      <main className="mx-auto max-w-4xl px-4 py-8 print:p-0 print:max-w-none">
        {/* Pre-flight checklist — hidden on print */}
        <div className="mb-6 print:hidden">
          <div className={cn(
            "rounded-2xl border bg-white shadow-sm overflow-hidden",
            canGenerate ? "border-emerald-100" : "border-amber-100"
          )}>
            <div className={cn(
              "flex items-center gap-3 px-6 py-4",
              canGenerate ? "bg-emerald-50/50" : "bg-amber-50/50"
            )}>
              <div className={cn(
                "rounded-full p-1.5",
                canGenerate ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
              )}>
                {canGenerate ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <p className={cn("text-sm font-black tracking-tight", canGenerate ? "text-emerald-900" : "text-amber-900")}>
                  {canGenerate ? 'Tudo pronto para gerar o pacote RSC' : 'Pendências identificadas no dossiê'}
                </p>
                <p className={cn("text-xs font-medium opacity-70", canGenerate ? "text-emerald-700" : "text-amber-700")}>
                  Certifique-se de que todos os itens estão verdes antes de exportar o arquivo final.
                </p>
              </div>
              <span className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-black tabular-nums",
                canGenerate ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
              )}>
                {checks.filter((c) => c.ok).length}/{checks.length} REQUISITOS
              </span>
            </div>
            <ul className="divide-y divide-gray-100 px-6 py-2">
              {checks.map((check) => (
                <li key={check.label} className="flex items-center gap-4 py-3">
                  <div className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors",
                    check.ok ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"
                  )}>
                    {check.ok ? <CheckCircle2 className="h-3 w-3" /> : <div className="h-1.5 w-1.5 rounded-full bg-current" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={cn("text-[13px] font-bold leading-none", check.ok ? "text-gray-700" : "text-gray-900")}>
                      {check.label}
                    </span>
                    <p className="mt-0.5 text-[11px] text-gray-500 leading-tight">{check.detail}</p>
                  </div>
                  {check.action && (
                    <button
                      type="button"
                      onClick={() => navigate(check.action!.href)}
                      className="shrink-0 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-gray-600 transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                    >
                      {check.action.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mb-6 print:hidden">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h3 className="text-base font-black tracking-tight text-gray-900 uppercase">Contexto do Processo</h3>
              <p className="text-sm text-gray-500">
                Informações complementares que serão injetadas nos documentos oficiais.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nivel-pleiteado" className="text-xs font-bold uppercase tracking-widest text-gray-400">Nível pleiteado no Requerimento</Label>
                <select
                  id="nivel-pleiteado"
                  value={nivelPleiteadoId}
                  onChange={(e) => setNivelPleiteadoId(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium transition-all focus:border-primary/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/5"
                >
                  <option value="">Selecione o nível...</option>
                  {niveisPleiteaveis.map((nivel) => (
                    <option key={nivel.id} value={nivel.id}>
                      {nivel.label} ({nivel.equivalencia})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="saldo-anterior" className="text-xs font-bold uppercase tracking-widest text-gray-400">Saldo Concessão Anterior (pts)</Label>
                <Input
                  id="saldo-anterior"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex.: 4.5"
                  value={saldoConcessaoAnterior}
                  onChange={(e) => setSaldoConcessaoAnterior(e.target.value)}
                  className="h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="processo-anterior" className="text-xs font-bold uppercase tracking-widest text-gray-400">Processo Anterior (Número)</Label>
                <Input
                  id="processo-anterior"
                  placeholder="Ex.: 23000.000000/2024-00"
                  value={numeroProcessoAnterior}
                  onChange={(e) => setNumeroProcessoAnterior(e.target.value)}
                  className="h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ultima-concessao" className="text-xs font-bold uppercase tracking-widest text-gray-400">Data da Última Concessão</Label>
                <Input
                  id="ultima-concessao"
                  type="date"
                  value={dataUltimaConcessao}
                  onChange={(e) => setDataUltimaConcessao(e.target.value)}
                  className="h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
                />
              </div>
            </div>

            {possuiDadosConcessaoAnterior && (
              <div className={cn(
                "mt-6 flex items-center gap-2 rounded-xl border px-4 py-3 transition-all",
                intersticioOk ? "border-emerald-100 bg-emerald-50/30 text-emerald-700" : "border-amber-100 bg-amber-50/30 text-amber-700"
              )}>
                <Info className="h-4 w-4 shrink-0" />
                <p className="text-[11px] font-bold">
                  {intersticioOk
                    ? 'Interstício válido: os dados da concessão anterior serão incluídos no dossiê.'
                    : 'Atenção: A data informada indica que o interstício de 3 anos ainda não foi cumprido.'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6 print:hidden">
          <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-6 shadow-sm">
            <h3 className="text-base font-black tracking-tight text-gray-900 uppercase">Autodeclaração Legal</h3>
            <p className="mb-6 text-sm text-gray-500">
              Essas declarações são obrigatórias para a validade jurídica do processo.
            </p>
            <div className="grid gap-4">
              <label className="flex cursor-pointer items-start gap-4 rounded-xl border border-white bg-white/60 p-4 transition-all hover:bg-white hover:shadow-md">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  checked={autodeclaracaoGeral}
                  onChange={(e) => setAutodeclaracaoGeral(e.target.checked)}
                />
                <div className="space-y-1">
                  <p className="text-[13px] font-bold text-gray-900">Veracidade das Informações</p>
                  <p className="text-[11px] leading-relaxed text-gray-600">
                    Declaro que todas as atividades descritas ocorreram de fato e que os documentos fornecidos são autênticos sob as penas da lei.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-4 rounded-xl border border-white bg-white/60 p-4 transition-all hover:bg-white hover:shadow-md">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  checked={declaracaoNaoDuplicidade}
                  onChange={(e) => setDeclaracaoNaoDuplicidade(e.target.checked)}
                />
                <div className="space-y-1">
                  <p className="text-[13px] font-bold text-gray-900">Não-Duplicidade de Itens</p>
                  <p className="text-[11px] leading-relaxed text-gray-600">
                    Confirmo que nenhum fato ou documento foi aproveitado simultaneamente em mais de um item deste ou de outro processo de RSC.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-4 rounded-xl border border-white bg-white/60 p-4 transition-all hover:bg-white hover:shadow-md">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  checked={declaracaoExcedeAtribuicoes}
                  onChange={(e) => setDeclaracaoExcedeAtribuicoes(e.target.checked)}
                />
                <div className="space-y-1">
                  <p className="text-[13px] font-bold text-gray-900">Atividades Extraordinárias</p>
                  <p className="text-[11px] leading-relaxed text-gray-600">
                    Atividades informadas excedem a rotina acadêmica/administrativa ordinária do cargo ocupado.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* ── Document Viewer ── */}
        <div className="space-y-4">
          <div className="flex items-end justify-between px-1 print:hidden">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('requerimento')}
                className={cn(
                  "relative h-11 px-6 text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === 'requerimento' ? "text-primary" : "text-gray-400 hover:text-gray-600"
                )}
              >
                1. Requerimento
                {activeTab === 'requerimento' && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('memorial')}
                className={cn(
                  "relative h-11 px-6 text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === 'memorial' ? "text-primary" : "text-gray-400 hover:text-gray-600"
                )}
              >
                2. Memorial Descritivo
                {activeTab === 'memorial' && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate || isGenerating}
                className="h-10 rounded-xl bg-gray-900 px-6 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-gray-200 transition-all hover:bg-primary hover:shadow-primary/20 disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Gerar Pacote PDF
              </Button>
            </div>
          </div>

          <div className="min-h-[1000px] rounded-3xl border border-gray-200 bg-white p-10 shadow-2xl print:border-none print:shadow-none sm:p-16">
            <AnimatePresence mode="wait">
              {activeTab === 'requerimento' ? (
                <motion.div
                  key="requerimento"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-10 text-gray-900"
                >
                  {/* Header */}
                  <div className="flex flex-col items-center text-center border-b-2 border-gray-900 pb-8">
                    <AppLogo className="mb-4 h-16 w-16" />
                    <h2 className="text-base font-bold uppercase tracking-tight">{institutionConfig.networkName}</h2>
                    <h1 className="text-xl font-black uppercase mt-1">Requerimento de Concessão de RSC-PCCTAE</h1>
                  </div>

                  {/* 1. Identificação */}
                  <section className="space-y-4">
                    <h3 className="bg-gray-100 px-3 py-1 text-sm font-black uppercase ring-1 ring-gray-900/10">1. Identificação do Servidor</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-[13px]">
                      <div><span className="font-bold uppercase text-[10px] text-gray-500 block">Nome:</span> <p className="border-b border-gray-300 min-h-[20px]">{servidor.nome_completo}</p></div>
                      <div><span className="font-bold uppercase text-[10px] text-gray-500 block">SIAPE:</span> <p className="border-b border-gray-300 min-h-[20px]">{servidor.siape}</p></div>
                      <div><span className="font-bold uppercase text-[10px] text-gray-500 block">Cargo:</span> <p className="border-b border-gray-300 min-h-[20px]">{servidor.cargo}</p></div>
                      <div><span className="font-bold uppercase text-[10px] text-gray-500 block">Data de ingresso em IFE:</span> <p className="border-b border-gray-300 min-h-[20px]">{servidor.data_ingresso_ife ? new Date(servidor.data_ingresso_ife).toLocaleDateString('pt-BR') : '—'}</p></div>

                      <div className="md:col-span-2">
                        <span className="font-bold uppercase text-[10px] text-gray-500 block mb-1">Nível de Classificação:</span>
                        <div className="flex gap-4">
                          {['A', 'B', 'C', 'D', 'E'].map(lvl => (
                            <div key={lvl} className="flex items-center gap-1.5">
                              <div className={cn("w-4 h-4 border border-gray-900 flex items-center justify-center text-[10px] font-black", servidor.nivel_classificacao === lvl && "bg-gray-900 text-white")}>
                                {servidor.nivel_classificacao === lvl ? 'X' : ''}
                              </div>
                              <span className="font-bold">{lvl}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div><span className="font-bold uppercase text-[10px] text-gray-500 block">Lotação:</span> <p className="border-b border-gray-300 min-h-[20px]">{servidor.lotacao}</p></div>
                      <div><span className="font-bold uppercase text-[10px] text-gray-500 block">Função/Encargo (se houver):</span> <p className="border-b border-gray-300 min-h-[20px]">{processo.funcao_encargo || '—'}</p></div>
                      <div className="md:col-span-2"><span className="font-bold uppercase text-[10px] text-gray-500 block">Telefone/E-mail:</span> <p className="border-b border-gray-300 min-h-[20px]">{servidor.email_institucional}</p></div>
                    </div>
                  </section>

                  {/* 2. Informações do Requerimento */}
                  <section className="space-y-4">
                    <h3 className="bg-gray-100 px-3 py-1 text-sm font-black uppercase ring-1 ring-gray-900/10">2. Informações do Requerimento</h3>
                    <div className="space-y-6 text-[13px]">
                      <div>
                        <span className="font-bold uppercase text-[10px] text-gray-500 block mb-2">Nível de RSC pretendido:</span>
                        <div className="grid grid-cols-3 gap-4 sm:flex sm:gap-6">
                          {[1, 2, 3, 4, 5, 6].map(num => {
                            const levelId = `RSC-${['I', 'II', 'III', 'IV', 'V', 'VI'][num - 1]}`;
                            return (
                              <div key={num} className="flex items-center gap-1.5">
                                <div className={cn("w-4 h-4 border border-gray-900 flex items-center justify-center text-[10px] font-black", nivelPleiteadoId === levelId && "bg-gray-900 text-white")}>
                                  {nivelPleiteadoId === levelId ? 'X' : ''}
                                </div>
                                <span className="font-bold whitespace-nowrap">{levelId}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 border-t border-gray-100 pt-4">
                        <div className="flex justify-between border-b border-dotted border-gray-200 py-1">
                          <span className="text-gray-600">Pontuação mínima necessária:</span>
                          <span className="font-bold">{nivelPleiteado?.pontosMinimos ?? '—'}</span>
                        </div>
                        <div className="flex justify-between border-b border-dotted border-gray-200 py-1">
                          <span className="text-gray-600">Pontuação total apresentada:</span>
                          <span className="font-bold">{formatPointValue(totalPontos)}</span>
                        </div>
                        <div className="flex justify-between border-b border-dotted border-gray-200 py-1">
                          <span className="text-gray-600">Quantidade de critérios específicos utilizados:</span>
                          <span className="font-bold">{itensDistintos}</span>
                        </div>
                        <div className="flex justify-between border-b border-dotted border-gray-200 py-1">
                          <span className="text-gray-600">Pontuação total excedente (banco de pontos):</span>
                          <span className="font-bold">{nivelPleiteado ? formatPointValue(Math.max(0, totalPontos - nivelPleiteado.pontosMinimos)) : '—'}</span>
                        </div>
                        <div className="flex justify-between border-b border-dotted border-gray-200 py-1">
                          <span className="text-gray-600">Saldo de pontuação de concessão anterior:</span>
                          <span className="font-bold">{saldoConcessaoAnterior || '0'}</span>
                        </div>
                        <div className="flex justify-between border-b border-dotted border-gray-200 py-1 md:col-span-2">
                          <span className="text-gray-600">Número do processo relativo à concessão anterior do RSC-PCCTAE:</span>
                          <span className="font-bold">{numeroProcessoAnterior || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* 3. Declaração */}
                  <section className="space-y-4">
                    <h3 className="bg-gray-100 px-3 py-1 text-sm font-black uppercase ring-1 ring-gray-900/10">3. Declaração de Conformidade Legal</h3>
                    <div className="text-[12px] leading-relaxed space-y-4">
                      <p>Declaro, para os fins previstos no Decreto regulamentador do RSC-PCCTAE, que:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Todos os fatos apresentados ocorreram no exercício da carreira;</li>
                        <li>Nenhuma atividade aqui declarada foi utilizada em requerimentos anteriores;</li>
                        <li>Toda a documentação anexada é autêntica e comprova integralmente as atividades apresentadas;</li>
                        <li>Tenho ciência de que informações falsas implicam responsabilidade administrativa, civil e penal.</li>
                      </ul>
                    </div>
                  </section>

                  {/* Signatures */}
                  <div className="pt-8 space-y-8">
                    <div className="flex flex-col items-start translate-y-4">
                      <span className="text-[10px] font-bold uppercase text-gray-400">Assinatura:</span>
                      <div className="mt-8 h-px w-full max-w-md bg-gray-900" />
                      <span className="mt-1 text-[11px] font-bold uppercase">{servidor.nome_completo}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-gray-400">Data:</span>
                      <span className="ml-2 font-bold px-4 border-b border-gray-900">{new Date().toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="memorial"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-12 text-gray-900"
                >
                  <div className="text-center space-y-2 border-b-2 border-gray-900 pb-8">
                    <h1 className="text-lg font-black uppercase tracking-tight decoration-2">Memorial e Descrição das Atividades por Requisito Legal</h1>
                    <p className="max-w-3xl mx-auto text-[11px] leading-relaxed text-gray-500 italic pt-4">
                      Organize os itens de acordo com a sua trajetória, contexto de atuação, principais funções e síntese das
                      contribuições institucionais e conforme os requisitos do art. 4º do Decreto (incisos I a VI), vinculando cada
                      atividade ao número correspondente aos critérios específicos.
                    </p>
                  </div>

                  <div className="space-y-12">
                    {resumoByInciso.map(([inciso, items], index) => {
                      const incisoSubtotal = sumPointValues(items.map((i) => i.pontos));
                      const isLast = index === resumoByInciso.length - 1;

                      return (
                        <div key={inciso} className="space-y-2">
                          <h2 className="bg-gray-100 px-4 py-1.5 text-[11px] font-black uppercase ring-1 ring-gray-900/10">
                            Critério {inciso} - {
                              inciso === 'I' ? 'Participação em grupos, comissões, comitês, núcleos ou representações' :
                                inciso === 'II' ? 'Orientação, tutoria ou mentoria' :
                                  inciso === 'III' ? 'Participação em bancas, exames ou avaliações' :
                                    inciso === 'IV' ? 'Ministração de cursos, oficinas ou palestras' :
                                      inciso === 'V' ? 'Participação em projetos de pesquisa, extensão ou inovação' :
                                        'Produção, prospecção e difusão de conhecimento'
                            }
                          </h2>

                          <table className="w-full table-fixed border-collapse border border-gray-900 text-[10px]">
                            <thead>
                              <tr className="bg-gray-50 text-center">
                                <th className="border border-gray-900 px-2 py-2 w-[5%] font-black italic uppercase">Nº</th>
                                <th className="border border-gray-900 px-2 py-2 text-left w-[38%] font-black italic uppercase">Critério específico</th>
                                <th className="border border-gray-900 px-2 py-2 w-[12%] font-black italic uppercase">Unidade Medida</th>
                                <th className="border border-gray-900 px-2 py-2 w-[10%] font-black italic uppercase leading-tight">Pontuação (Base)</th>
                                <th className="border border-gray-900 px-2 py-2 w-[10%] font-black italic uppercase leading-tight">Pontuação Obtida</th>
                                <th className="border border-gray-900 px-2 py-2 w-[25%] font-black italic uppercase leading-tight">Documentos Comprobatórios</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((item) => {
                                const itemLancamentos = lancamentosDoServidor.filter(l => l.item_rsc_id === item.itemId);
                                const basePoints = item.docCount > 0 ? (item.pontos / item.docCount) : item.pontos;
                                return (
                                  <tr key={item.itemId}>
                                    <td className="border border-gray-900 px-2 py-2 text-center font-bold text-sm">{item.numero}</td>
                                    <td className="border border-gray-900 px-2 py-2 leading-tight">{item.descricao}</td>
                                    <td className="border border-gray-900 px-2 py-2 text-center">{item.docCount} unid.</td>
                                    <td className="border border-gray-900 px-2 py-2 text-center">{formatPointValue(basePoints)}</td>
                                    <td className="border border-gray-900 px-2 py-2 text-center font-black bg-gray-50/50">{formatPointValue(item.pontos)}</td>
                                    <td className="border border-gray-900 px-2 py-2 align-top">
                                      <div className="flex flex-col gap-1.5">
                                        {itemLancamentos.map((l, i) => (
                                          <span key={i} className="text-[8px] leading-tight text-gray-500 break-all bg-gray-50 p-1 block border border-gray-100 rounded-sm">
                                            [DOC {i + 1}] {documentos.find(d => d.id === l.documento_id)?.nome_arquivo}
                                          </span>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                              <tr className="bg-gray-100 font-black">
                                <td colSpan={4} className="border border-gray-900 px-4 py-2 text-right uppercase italic tracking-widest">Subtotal CRITÉRIO {inciso}</td>
                                <td className="border border-gray-900 px-2 py-2 text-center text-sm bg-gray-200 ring-2 ring-inset ring-gray-900/5">{formatPointValue(incisoSubtotal)}</td>
                                <td className="border border-gray-900 px-2 py-2"></td>
                              </tr>
                            </tbody>
                          </table>

                          {isLast && (
                            <div className="mt-8 border-t-2 border-gray-900 pt-4">
                              <table className="w-full border-collapse border border-gray-900 text-xs font-black">
                                <tbody>
                                  <tr className="bg-gray-200/50">
                                    <td className="border border-gray-900 px-6 py-4 text-right uppercase italic tracking-widest leading-relaxed">
                                      (Critério I + Critério II + Critério III + Critério IV + Critério V + Critério VI)
                                      <br />
                                      <span className="text-base font-black">TOTAL ACUMULADO</span>
                                    </td>
                                    <td className="border border-gray-900 px-4 py-4 text-center text-xl w-40 bg-gray-900 text-white tabular-nums">
                                      {formatPointValue(totalPontos)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* 6. Conclusão */}
                  <section className="space-y-6 pt-12 border-t-2 border-gray-900 mt-16">
                    <h3 className="bg-gray-100 px-4 py-1.5 text-xs font-black uppercase ring-1 ring-gray-900/10 w-fit">6. Conclusão do Servidor</h3>
                    <div className="text-[14px] leading-relaxed">
                      <p>
                        À vista das informações apresentadas, totalizo <strong>{formatPointValue(totalPontos)}</strong> pontos e atendo aos critérios legais
                        e regulamentares para o nível <strong>{nivelPleiteado?.label || '—'}</strong> do RSC‑PCCTAE. Solicito a análise pela
                        CRSC-PCCTAE.
                      </p>
                    </div>

                    <div className="pt-12 space-y-12">
                      <div className="flex flex-col items-start translate-y-4">
                        <span className="text-[10px] font-bold uppercase text-gray-400">Assinatura:</span>
                        <div className="mt-8 h-px w-full max-w-md bg-gray-900" />
                        <span className="mt-1 text-[11px] font-bold uppercase">{servidor.nome_completo}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-gray-400">Data:</span>
                        <span className="ml-2 font-bold px-4 border-b border-gray-900">{new Date().toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </section>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </main>
    </MainLayout>
  );
}

