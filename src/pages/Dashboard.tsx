import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, BookOpenText, CheckCircle2, ChevronRight, Download, HardDrive, Info, Loader2, LayoutGrid, List, Upload, Wand2, Bot, ScrollText, UserCircle, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useAppContext } from '../context/AppContext';
import { RSC_LEVELS } from '../data/mock';
import { Navigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { addPointValues, formatPointValue, sumPointValues } from '../lib/points';
import { getEligibleRscLevel, validateLevelConstraints } from '../lib/rsc';
import { exportSession } from '../lib/sessionExport';
import { importSession } from '../lib/sessionImport';
import MainLayout from '../components/MainLayout';
import WizardModal from '../components/WizardModal';

const levelAccentClasses = [
  {
    bar: 'bg-emerald-600',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    bar: 'bg-sky-600',
    chip: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  {
    bar: 'bg-indigo-600',
    chip: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    bar: 'bg-amber-600',
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    bar: 'bg-rose-600',
    chip: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    bar: 'bg-slate-700',
    chip: 'bg-slate-100 text-slate-700 border-slate-200',
  },
];

export default function Dashboard() {
  const { servidor, activeSessionId, itensRSC, lancamentos, processo, wizardRecommendedIds, setWizardRecommendedIds, restoreSession } = useAppContext();
  const navigate = useNavigate();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleExportSession = async () => {
    if (!activeSessionId) return;
    setIsExporting(true);
    try {
      await exportSession(activeSessionId);
      toast.success('Backup salvo com sucesso!');
    } catch {
      toast.error('Erro ao exportar o progresso. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportSession = async (file: File) => {
    setIsImporting(true);
    try {
      const session = await importSession(file, servidor?.id);
      restoreSession(session);
      toast.success('Progresso restaurado com sucesso!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Arquivo inválido.';
      toast.error(`Erro ao restaurar: ${message}`);
    } finally {
      setIsImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  if (!servidor) {
    return <Navigate to="/" replace />;
  }

  const lancamentosDoServidor = lancamentos.filter((lancamento) => lancamento.servidor_id === servidor.id);
  const totalPontos = sumPointValues(lancamentosDoServidor.map((lancamento) => lancamento.pontos_calculados));
  const itensDistintos = new Set(lancamentosDoServidor.map((lancamento) => lancamento.item_rsc_id)).size;
  const nivelElegivel = getEligibleRscLevel(servidor.escolaridade_atual);

  const profileFields = [
    { key: 'siape', label: 'SIAPE' },
    { key: 'nome_completo', label: 'Nome' },
    { key: 'email_institucional', label: 'E-mail' },
    { key: 'instituicao', label: 'Instituição' },
    { key: 'lotacao', label: 'Lotação' },
    { key: 'cargo', label: 'Cargo' },
    { key: 'nivel_classificacao', label: 'Classe' },
    { key: 'data_ingresso_ife', label: 'Ingresso' },
    { key: 'escolaridade_atual', label: 'Formação' },
  ];
  const missingProfileFields = profileFields.filter(f => !servidor[f.key as keyof typeof servidor]);
  const isProfileComplete = missingProfileFields.length === 0;

  const violations = nivelElegivel
    ? validateLevelConstraints(nivelElegivel.id, lancamentosDoServidor, itensRSC)
    : [];

  const possuiRestricaoIncisos = !!(nivelElegivel?.incisosObrigatorios && nivelElegivel.incisosObrigatorios.length > 0);

  const metasAtingidas =
    !!nivelElegivel &&
    totalPontos >= nivelElegivel.pontosMinimos &&
    itensDistintos >= nivelElegivel.itensMinimos &&
    violations.length === 0 &&
    isProfileComplete;

  const nivelPleiteavel = nivelElegivel
    ? RSC_LEVELS.map((nivel, index) => ({
      ...nivel,
      accent: levelAccentClasses[index],
      pontosPct: Math.min(100, Math.round((totalPontos / nivel.pontosMinimos) * 100)),
      itensPct: Math.min(100, Math.round((itensDistintos / nivel.itensMinimos) * 100)),
      pontosFaltantes: Math.max(0, nivel.pontosMinimos - totalPontos),
      itensFaltantes: Math.max(0, nivel.itensMinimos - itensDistintos),
      atingido: totalPontos >= nivel.pontosMinimos && itensDistintos >= nivel.itensMinimos && validateLevelConstraints(nivel.id, lancamentosDoServidor, itensRSC).length === 0,
    })).find((nivel) => nivel.id === nivelElegivel.id) ?? null
    : null;

  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const resumoItensLancados = useMemo(() => {
    const itemMap = new Map<
      string,
      {
        itemId: string;
        numero: number;
        descricao: string;
        pontos: number;
      }
    >();

    lancamentosDoServidor.forEach((lancamento) => {
      const item = itensRSC.find((candidate) => candidate.id === lancamento.item_rsc_id);

      if (!item) {
        return;
      }

      const current = itemMap.get(item.id);

      itemMap.set(item.id, {
        itemId: item.id,
        numero: item.numero,
        descricao: item.descricao,
        pontos: addPointValues(current?.pontos ?? 0, lancamento.pontos_calculados),
      });
    });

    return Array.from(itemMap.values()).sort((a, b) => a.numero - b.numero);
  }, [itensRSC, lancamentosDoServidor]);

  return (
    <MainLayout
      activeView="dashboard"
      secondaryContent={
        <div className="flex items-center gap-2">
          {metasAtingidas && (
            <div className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm">
              <CheckCircle2 className="h-3 w-3" />
              Metas atingidas
            </div>
          )}
          <div className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600">
            <span className="font-semibold text-gray-900">Nível pleiteável:</span>{' '}
            {nivelElegivel ? nivelElegivel.label : 'Não mapeado'}
          </div>

          <div className="ml-1 flex items-center gap-1.5 border-l border-gray-200 pl-2.5">
            {/* Salvar progresso + info */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                disabled={isExporting}
                onClick={handleExportSession}
                className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary disabled:opacity-50"
              >
                {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                Salvar
              </button>
            </div>

            <input
              ref={importInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleImportSession(f);
              }}
            />

            {/* Restaurar + info */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                disabled={isImporting}
                onClick={() => importInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary disabled:opacity-50"
              >
                {isImporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                Restaurar
              </button>
            </div>
          </div>
        </div>
      }
    >
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{servidor.nome_completo}</h2>
                <p className="text-gray-500">Lotação: {servidor.lotacao}</p>
                <p className="text-gray-500">SIAPE: {servidor.siape}</p>
              </div>
              <div className="md:max-w-sm">
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <BookOpenText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">Formação atual</p>
                    <p className="text-sm font-medium text-gray-900">
                      {servidor.escolaridade_atual}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>





        {nivelPleiteavel && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {/* Card 1: Pontuação (Gauge) */}
            <Card className="flex flex-col border-none bg-white shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="flex flex-1 flex-col items-center p-6 text-center">
                <div className="mb-4 flex w-full items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">Pontuação</h3>
                  <div className="group relative flex items-center">
                    <Info className="h-4 w-4 cursor-help text-gray-300 hover:text-gray-500" />
                    <div className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-64 rounded-xl bg-gray-900 px-3.5 py-3 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
                      <p className="mb-1 text-[11px] font-bold text-white">Sobre a Pontuação</p>
                      <p className="text-[11px] leading-relaxed text-gray-300">Total somado de todos os seus lançamentos válidos. Para o {nivelPleiteavel.label}, o mínimo é {nivelPleiteavel.pontosMinimos} pts.</p>
                      <div className="absolute bottom-full right-1 border-4 border-transparent border-b-gray-900"></div>
                    </div>
                  </div>
                </div>

                <div className="relative mb-2 flex flex-col items-center">
                  <svg className="h-32 w-48" viewBox="0 0 100 60">
                    <path
                      d="M 15 50 A 35 35 0 0 1 85 50"
                      fill="none"
                      stroke="#F3F4F6"
                      strokeWidth="10"
                      strokeLinecap="round"
                    />
                    <motion.path
                      d="M 15 50 A 35 35 0 0 1 85 50"
                      fill="none"
                      stroke="url(#gradient-pts)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: nivelPleiteavel.pontosPct / 100 }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                    <defs>
                      <linearGradient id="gradient-pts" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                    <span className="text-3xl font-black text-gray-900">{formatPointValue(totalPontos)}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{nivelPleiteavel.pontosMinimos} pts</span>
                  </div>
                </div>

                <div className="mt-auto w-full">
                  {nivelPleiteavel.pontosFaltantes > 0 ? (
                    <div className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-200">
                      Faltam {formatPointValue(nivelPleiteavel.pontosFaltantes)} pontos
                    </div>
                  ) : (
                    <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      Requisito atingido
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Itens Distintos (Gauge) */}
            <Card className="flex flex-col border-none bg-white shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="flex flex-1 flex-col items-center p-6 text-center">
                <div className="mb-4 flex w-full items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">Itens Distintos</h3>
                  <div className="group relative flex items-center">
                    <Info className="h-4 w-4 cursor-help text-gray-300 hover:text-gray-500" />
                    <div className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-64 rounded-xl bg-gray-900 px-3.5 py-3 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
                      <p className="mb-1 text-[11px] font-bold text-white">Sobre Itens Distintos</p>
                      <p className="text-[11px] leading-relaxed text-gray-300">Quantidade de itens diferentes do catálogo em que você pontuou. Exigência mínima: {nivelPleiteavel.itensMinimos} itens.</p>
                      <div className="absolute bottom-full right-1 border-4 border-transparent border-b-gray-900"></div>
                    </div>
                  </div>
                </div>

                <div className="relative mb-2 flex flex-col items-center">
                  <svg className="h-32 w-48" viewBox="0 0 100 60">
                    <path
                      d="M 15 50 A 35 35 0 0 1 85 50"
                      fill="none"
                      stroke="#F3F4F6"
                      strokeWidth="10"
                      strokeLinecap="round"
                    />
                    <motion.path
                      d="M 15 50 A 35 35 0 0 1 85 50"
                      fill="none"
                      stroke="url(#gradient-items)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: nivelPleiteavel.itensPct / 100 }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                    <defs>
                      <linearGradient id="gradient-items" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#2563eb" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                    <span className="text-3xl font-black text-gray-900">{itensDistintos}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{nivelPleiteavel.itensMinimos} itens</span>
                  </div>
                </div>

                <div className="mt-auto w-full">
                  {nivelPleiteavel.itensFaltantes > 0 ? (
                    <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-200">
                      Faltam {nivelPleiteavel.itensFaltantes} itens
                    </div>
                  ) : (
                    <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      Requisito atingido
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Itens Específicos (Incisos) */}
            <Card className="flex flex-col border-none bg-white shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="flex flex-1 flex-col items-center p-6 text-center">
                <div className="mb-4 flex w-full items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">Específicos</h3>
                  <div className="group relative flex items-center">
                    <Info className="h-4 w-4 cursor-help text-gray-300 hover:text-gray-500" />
                    <div className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-64 rounded-xl bg-gray-900 px-3.5 py-3 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
                      <p className="mb-1 text-[11px] font-bold text-white">Requisitos de Inciso</p>
                      <p className="text-[11px] leading-relaxed text-gray-300">Alguns níveis exigem atividades em grupos específicos (ensino, pesquisa, etc). Você deve ter ao menos 1 item nesses grupos.</p>
                      <div className="absolute bottom-full right-1 border-4 border-transparent border-b-gray-900"></div>
                    </div>
                  </div>
                </div>

                <div className="mb-auto mt-2 flex flex-col items-center space-y-3">
                  <div className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-2xl transition-colors",
                    violations.length === 0 ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"
                  )}>
                    <ScrollText className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-gray-900">Regras de Inciso</p>
                    {violations.length === 0 ? (
                      <p className="text-[11px] font-medium text-emerald-600">Todos os critérios atendidos</p>
                    ) : (
                      <p className="text-[11px] font-medium text-gray-500 line-clamp-2 px-2">
                        Pendente: {violations.map(v => `Inciso ${[...v.requiredIncisos].join('/')}`).join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 w-full">
                  {violations.length === 0 ? (
                    <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      Regras atendidas
                    </div>
                  ) : (
                    <div className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500 ring-1 ring-inset ring-gray-200">
                      Pendente
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Perfil Completo */}
            <Card className="flex flex-col border-none bg-white shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="flex flex-1 flex-col items-center p-6 text-center">
                <div className="mb-4 flex w-full items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">Seu Perfil</h3>
                  <button onClick={() => navigate('/perfil')} className="group flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/70">
                    EDITAR <ChevronRight className="h-2.5 w-2.5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>

                <div className="mb-auto mt-2 flex flex-col items-center space-y-3">
                  <div className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-2xl transition-colors",
                    isProfileComplete ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                  )}>
                    <UserCircle className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-gray-900">Dados do Servidor</p>
                    {isProfileComplete ? (
                      <p className="text-[11px] font-medium text-emerald-600">Cadastro 100% preenchido</p>
                    ) : (
                      <div className="group relative">
                        <p className="cursor-help text-[11px] font-medium text-amber-600">
                          Faltam {missingProfileFields.length} campos obrigatórios
                        </p>
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 rounded-xl bg-gray-900 px-3 py-2.5 text-left opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
                          <p className="mb-1.5 text-[10px] font-bold text-white uppercase tracking-wider">Campos pendentes:</p>
                          <p className="text-[10px] leading-relaxed text-gray-400">
                            {missingProfileFields.map(f => f.label).join(', ')}
                          </p>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 w-full">
                  {isProfileComplete ? (
                    <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      Completo
                    </div>
                  ) : (
                    <div className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-200">
                      Incompleto
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Ferramentas de Apoio */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-1">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Ferramentas de Apoio</h2>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Card 1: Wizard */}
            <Card className={cn(
              "overflow-hidden border-none shadow-sm transition-all hover:shadow-md",
              wizardRecommendedIds.length > 0 ? "bg-violet-50/50 ring-1 ring-inset ring-violet-100" : "bg-white"
            )}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "rounded-2xl p-3.5",
                    wizardRecommendedIds.length > 0 ? "bg-violet-100 text-violet-600" : "bg-gray-100 text-gray-400"
                  )}>
                    <Wand2 className="h-6 w-6" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900">Mapeamento Objetivado (Wizard)</h3>
                      {wizardRecommendedIds.length > 0 && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-violet-700">Mapeado</span>
                      )}
                    </div>
                    <p className="text-[13px] leading-relaxed text-gray-500">
                      Responda a perguntas objetivas sobre sua trajetória para filtrar automaticamente quais itens do catálogo você possui para pontuação.
                    </p>
                    <div className="flex gap-3 pt-3">
                      <button
                        onClick={() => setWizardOpen(true)}
                        className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-xs font-bold text-white transition-all hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-200"
                      >
                        {wizardRecommendedIds.length > 0 ? 'Refazer Mapeamento' : 'Iniciar Wizard'}
                      </button>
                      {wizardRecommendedIds.length > 0 && (
                        <button
                          onClick={() => navigate('/itens')}
                          className="flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-5 py-2 text-xs font-bold text-violet-700 transition-all hover:bg-violet-50"
                        >
                          Ver Sugestões
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: NotebookLM */}
            <Card className="overflow-hidden border-none bg-white shadow-sm transition-all hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-emerald-50 p-3.5 text-emerald-600">
                    <Bot className="h-6 w-6" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="font-bold text-gray-900">NotebookLM de Apoio</h3>
                    <p className="text-[13px] leading-relaxed text-gray-500">
                      Utilize nossa IA para validar se seus documentos coincidem com a legislação e instruções vigentes, ou para sanar dúvidas gerais sobre o processo RSC-TAE.
                    </p>
                    <div className="pt-3">
                      <a
                        href="https://notebooklm.google.com/notebook/c34b5dca-ec61-4d1f-a467-efd551f6b0b5"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-200"
                      >
                        Abrir NotebookLM
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {resumoItensLancados.length > 0 && (
          <Card className="border-gray-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Itens já lançados</h3>
                  <p className="text-xs text-gray-500">
                    Resumo rápido dos itens já marcados e da pontuação acumulada em cada um.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                    {resumoItensLancados.length} itens
                  </span>
                  <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                    <button
                      type="button"
                      onClick={() => setViewMode('cards')}
                      className={`rounded-md p-1.5 transition-colors ${viewMode === 'cards' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                      title="Visualizar como cards"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      className={`rounded-md p-1.5 transition-colors ${viewMode === 'table' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                      title="Visualizar como tabela"
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {viewMode === 'cards' ? (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {resumoItensLancados.map((item) => (
                    <button
                      key={item.itemId}
                      type="button"
                      onClick={() => navigate(`/itens?item=${item.itemId}`)}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white hover:shadow-sm"
                    >
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                            Item {item.numero}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-sm font-medium leading-snug text-gray-800">{item.descricao}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-right">
                        <ChevronRight className="h-4 w-4 text-gray-300" />
                        <p className="text-lg font-black text-gray-900">{formatPointValue(item.pontos)}</p>
                        <div>
                          <p className="text-[11px] text-gray-500">pts</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Item</th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Descrição</th>
                        <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500">Pontos</th>
                        <th className="px-3 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumoItensLancados.map((item, index) => (
                        <tr
                          key={item.itemId}
                          onClick={() => navigate(`/itens?item=${item.itemId}`)}
                          className={`cursor-pointer transition-colors hover:bg-primary/5 ${index !== resumoItensLancados.length - 1 ? 'border-b border-gray-100' : ''}`}
                        >
                          <td className="px-3 py-2.5">
                            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary whitespace-nowrap">
                              Item {item.numero}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-gray-800">{item.descricao}</td>
                          <td className="px-3 py-2.5 text-right font-black text-gray-900 whitespace-nowrap">
                            {formatPointValue(item.pontos)} <span className="text-[11px] font-normal text-gray-500">pts</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <ChevronRight className="h-4 w-4 text-gray-300" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      {wizardOpen && (
        <WizardModal
          onClose={() => setWizardOpen(false)}
          onConfirm={(ids) => {
            setWizardRecommendedIds(ids);
            setWizardOpen(false);
          }}
          initialIds={wizardRecommendedIds}
        />
      )}
    </MainLayout>
  );
}
