import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, BookOpenText, CheckCircle2, ChevronRight, Download, HardDrive, Info, Loader2, LayoutGrid, List, Upload, Wand2, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { useAppContext } from '../context/AppContext';
import { RSC_LEVELS } from '../data/mock';
import { Navigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { getEligibleRscLevel } from '../lib/rsc';
import { exportSession } from '../lib/sessionExport';
import { importSession } from '../lib/sessionImport';
import AppHeader from '../components/AppHeader';
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
  const totalPontos = lancamentosDoServidor.reduce((acc, lancamento) => acc + lancamento.pontos_calculados, 0);
  const itensDistintos = new Set(lancamentosDoServidor.map((lancamento) => lancamento.item_rsc_id)).size;
  const nivelElegivel = getEligibleRscLevel(servidor.escolaridade_atual);

  const metasAtingidas =
    !!nivelElegivel &&
    totalPontos >= nivelElegivel.pontosMinimos &&
    itensDistintos >= nivelElegivel.itensMinimos;

  const isProfileComplete =
    !!servidor.email_institucional?.trim() &&
    !!servidor.lotacao?.trim() &&
    !!servidor.cargo?.trim();

  const nivelPleiteavel = nivelElegivel
    ? RSC_LEVELS.map((nivel, index) => ({
      ...nivel,
      accent: levelAccentClasses[index],
      pontosPct: Math.min(100, Math.round((totalPontos / nivel.pontosMinimos) * 100)),
      itensPct: Math.min(100, Math.round((itensDistintos / nivel.itensMinimos) * 100)),
      pontosFaltantes: Math.max(0, nivel.pontosMinimos - totalPontos),
      itensFaltantes: Math.max(0, nivel.itensMinimos - itensDistintos),
      atingido: totalPontos >= nivel.pontosMinimos && itensDistintos >= nivel.itensMinimos,
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
        pontos: Number(((current?.pontos ?? 0) + lancamento.pontos_calculados).toFixed(2)),
      });
    });

    return Array.from(itemMap.values()).sort((a, b) => a.numero - b.numero);
  }, [itensRSC, lancamentosDoServidor]);

  return (
    <div className="min-h-screen bg-gray-50">
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
      <AppHeader
        activeView="dashboard"
        onNavigateHome={() => navigate('/')}
        onNavigateDashboard={() => undefined}
        onNavigateCatalog={() => navigate('/itens')}
        onNavigateWorkspace={() => navigate('/workspace')}
        onNavigateConsolidate={() => navigate('/consolidar')}
        onNavigateProfile={() => navigate('/perfil')}
        secondaryContent={
          <>
            <div className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600">
              <span className="font-semibold text-gray-900">Status:</span> {processo.status}
            </div>
            <div className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600">
              <span className="font-semibold text-gray-900">Total:</span> {totalPontos.toFixed(2)} pts
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
              <span className="font-semibold text-gray-900">Nível pleiteável:</span>{' '}
              {nivelElegivel ? nivelElegivel.label : 'Não mapeado'}
            </div>
            {/* Auto-save indicator */}
            <div className="group relative ml-1 flex items-center">
              <div className="flex cursor-default items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1">
                <div className="relative">
                  <HardDrive className="h-3 w-3 text-gray-400" />
                  <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </div>
                <span className="text-[10px] font-medium text-gray-500">Auto</span>
              </div>
              <div className="pointer-events-none absolute top-full left-1/2 z-50 mt-2 w-64 -translate-x-1/2 rounded-xl bg-gray-900 px-3.5 py-3 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
                <p className="mb-1 text-[11px] font-bold text-white">Salvamento automático</p>
                <p className="text-[11px] leading-relaxed text-gray-300">
                  Seus dados são gravados automaticamente neste navegador (localStorage + IndexedDB) a cada alteração. Funcionam offline, sem servidores.
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-amber-300">
                  ⚠ Limpar o cache ou histórico do navegador apaga esses dados. Use o botão "Salvar progresso" para fazer backup externo.
                </p>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900" />
              </div>
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
                  Salvar progresso
                </button>
                <div className="group relative flex items-center">
                  <Info className="h-3 w-3 cursor-help text-gray-300 hover:text-gray-500" />
                  <div className="pointer-events-none absolute top-full left-1/2 z-50 mt-2 w-60 -translate-x-1/2 rounded-xl bg-gray-900 px-3.5 py-3 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
                    <p className="mb-1 text-[11px] font-bold text-white">Salvar progresso</p>
                    <p className="text-[11px] leading-relaxed text-gray-300">
                      Exporta um arquivo <span className="font-mono font-semibold text-white">.zip</span> com todos os seus dados (perfil, lançamentos e documentos). Guarde-o em local seguro — ele permite recuperar o progresso em qualquer computador ou navegador.
                    </p>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900" />
                  </div>
                </div>
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
                <div className="group relative flex items-center">
                  <Info className="h-3 w-3 cursor-help text-gray-300 hover:text-gray-500" />
                  <div className="pointer-events-none absolute top-full right-0 z-50 mt-2 w-60 rounded-xl bg-gray-900 px-3.5 py-3 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
                    <p className="mb-1 text-[11px] font-bold text-white">Restaurar backup</p>
                    <p className="text-[11px] leading-relaxed text-gray-300">
                      Carrega um arquivo <span className="font-mono font-semibold text-white">.zip</span> exportado anteriormente. Os dados da sessão atual serão substituídos pelo conteúdo do backup.
                    </p>
                    <div className="absolute bottom-full right-3 border-4 border-transparent border-b-gray-900" />
                  </div>
                </div>
              </div>
            </div>
          </>
        }
      />

      <main className="mx-auto max-w-7xl space-y-6 p-6">
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

        {/* Profile completeness banner */}
        {!isProfileComplete && (
          <Card className="border-amber-200 bg-amber-50/60 shadow-sm">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-amber-100 p-2.5 text-amber-600 shrink-0">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Perfil incompleto</p>
                  <p className="text-sm text-gray-600">
                    Alguns campos são necessários para gerar o pacote RSC (memorial descritivo e requerimento).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/perfil')}
                className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
              >
                Completar perfil
              </button>
            </CardContent>
          </Card>
        )}

        {/* Wizard CTA */}
        <Card className={`border shadow-sm ${wizardRecommendedIds.length > 0 ? 'border-violet-200 bg-violet-50/40' : 'border-gray-200 bg-white'}`}>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className={`rounded-xl p-2.5 ${wizardRecommendedIds.length > 0 ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
                <Wand2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {wizardRecommendedIds.length > 0
                    ? `${wizardRecommendedIds.length} itens recomendados pelo Wizard`
                    : 'Precisa de ajuda para começar?'}
                </p>
                <p className="text-sm text-gray-500">
                  {wizardRecommendedIds.length > 0
                    ? 'Veja os itens destacados na página de Itens. Você pode refazer o mapeamento a qualquer momento.'
                    : 'Responda algumas perguntas sobre seu histórico e o sistema indicará os itens mais aderentes ao seu perfil.'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <a
                href="https://notebooklm.google.com/notebook/c34b5dca-ec61-4d1f-a467-efd551f6b0b5"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                title="Abrir Assistente Virtual em nova guia"
              >
                <Bot className="h-4 w-4 text-emerald-600" />
                Assistente Virtual
              </a>
              {wizardRecommendedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/itens')}
                  className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                >
                  Ver itens
                </button>
              )}
              <button
                type="button"
                onClick={() => setWizardOpen(true)}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
              >
                {wizardRecommendedIds.length > 0 ? 'Refazer mapeamento' : 'Iniciar Wizard'}
              </button>
            </div>
          </CardContent>
        </Card>

        {nivelPleiteavel && (
          <Card className="border-primary/30 bg-white shadow-sm shadow-primary/10">
            <CardContent className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-gray-900">{nivelPleiteavel.label}</h3>
                    {nivelPleiteavel.atingido ? (
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${nivelPleiteavel.accent.chip}`}>
                        Pronto para envio
                      </span>
                    ) : (
                      <div className="group relative flex items-center">
                        <Info className="h-4 w-4 cursor-help text-gray-400 hover:text-gray-600" />
                        <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-80 rounded-xl bg-gray-900 px-4 py-3.5 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
                          <p className="mb-2 text-[11px] font-bold text-white">Como funciona a equivalência RSC</p>
                          <p className="mb-3 text-[11px] leading-relaxed text-gray-300">
                            Sua formação atual (<span className="font-semibold text-white">{servidor.escolaridade_atual}</span>) te credencia ao{' '}
                            <span className="font-semibold text-white">{nivelPleiteavel.label}</span>, com equivalência funcional a{' '}
                            <span className="font-semibold text-white">{nivelPleiteavel.equivalencia}</span>. Isso significa que, ao cumprir os requisitos de pontuação e itens, sua carreira terá progressão equivalente à dessa titulação acadêmica.
                          </p>
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Tabela de equivalências</p>
                          <ul className="mb-3 space-y-1.5">
                            {[
                              { formacao: 'Ensino Fundamental', rsc: 'RSC-I / RSC-II' },
                              { formacao: 'Ensino Médio / Técnico', rsc: 'RSC-III' },
                              { formacao: 'Graduação', rsc: 'RSC-IV' },
                              { formacao: 'Especialização', rsc: 'RSC-V' },
                              { formacao: 'Mestrado', rsc: 'RSC-VI' },
                            ].map(({ formacao, rsc }) => (
                              <li key={rsc} className="flex items-center justify-between gap-2 text-[11px]">
                                <span className="text-gray-400">{formacao}</span>
                                <span className="font-semibold text-white">→ {rsc}</span>
                              </li>
                            ))}
                          </ul>
                          <p className="text-[10px] leading-relaxed text-gray-500">
                            O nível é determinado pela maior titulação concluída. Ao obter nova titulação, é possível solicitar um novo RSC para avançar ao próximo nível.
                          </p>
                          <div className="absolute bottom-full left-4 border-4 border-transparent border-b-gray-900" />
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Equivalência pretendida: {nivelPleiteavel.equivalencia}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-3 rounded-2xl bg-gray-50/80 p-4">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Pontuação</p>
                    <div className="group relative flex items-center">
                      <Info className="h-4 w-4 cursor-help text-gray-400 hover:text-gray-600" />
                      <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-80 rounded-xl bg-gray-900 px-4 py-3.5 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
                        <p className="mb-2 text-[11px] font-bold text-white">Sobre a Pontuação</p>
                        <p className="text-[11px] leading-relaxed text-gray-300">
                          A pontuação é obtida a partir das suas atividades cadastradas. Cada nível de RSC exige que você alcance uma <span className="font-semibold text-white">pontuação mínima predefinida</span> somando os pontos de todos os lançamentos válidos.
                        </p>
                        <div className="absolute bottom-full left-4 border-4 border-transparent border-b-gray-900"></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-end justify-between gap-4">
                    <p className="text-3xl font-black text-gray-900">
                      {totalPontos.toFixed(2)}
                      <span className="text-lg font-bold text-gray-500"> / {nivelPleiteavel.pontosMinimos} pts</span>
                    </p>
                    {nivelPleiteavel.pontosFaltantes > 0 ? (
                      <p className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                        Faltam {nivelPleiteavel.pontosFaltantes.toFixed(2)} pontos
                      </p>
                    ) : (
                      <p className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Alcançado
                      </p>
                    )}
                  </div>
                  <div className="h-3 w-full rounded-full bg-gray-200">
                    <div
                      className={`h-3 rounded-full transition-all ${nivelPleiteavel.accent.bar}`}
                      style={{ width: `${nivelPleiteavel.pontosPct}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl bg-gray-50/80 p-4">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Itens distintos</p>
                    <div className="group relative flex items-center">
                      <Info className="h-4 w-4 cursor-help text-gray-400 hover:text-gray-600" />
                      <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-80 rounded-xl bg-gray-900 px-4 py-3.5 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
                        <p className="mb-2 text-[11px] font-bold text-white">Sobre os Itens Distintos</p>
                        <p className="text-[11px] leading-relaxed text-gray-300">
                          Além da pontuação total, o RSC exige que você comprove a diversidade das suas atividades. Por isso, é necessário pontuar em um número mínimo de <span className="font-semibold text-white">itens diferentes</span>. Lançamentos múltiplos no mesmo item não aumentam essa contagem.
                        </p>
                        <div className="absolute bottom-full left-4 border-4 border-transparent border-b-gray-900"></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-end justify-between gap-4">
                    <p className="text-3xl font-black text-gray-900">
                      {itensDistintos}
                      <span className="text-lg font-bold text-gray-500"> / {nivelPleiteavel.itensMinimos} itens</span>
                    </p>
                    {nivelPleiteavel.itensFaltantes > 0 ? (
                      <p className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                        Faltam {nivelPleiteavel.itensFaltantes} itens
                      </p>
                    ) : (
                      <p className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Alcançado
                      </p>
                    )}
                  </div>
                  <div className="h-3 w-full rounded-full bg-gray-200">
                    <div
                      className={`h-3 rounded-full transition-all ${nivelPleiteavel.accent.bar}`}
                      style={{ width: `${nivelPleiteavel.itensPct}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                      onClick={() => navigate(`/workspace?item=${item.itemId}`)}
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
                        <p className="text-lg font-black text-gray-900">{item.pontos.toFixed(2)}</p>
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
                          onClick={() => navigate(`/workspace?item=${item.itemId}`)}
                          className={`cursor-pointer transition-colors hover:bg-primary/5 ${index !== resumoItensLancados.length - 1 ? 'border-b border-gray-100' : ''}`}
                        >
                          <td className="px-3 py-2.5">
                            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary whitespace-nowrap">
                              Item {item.numero}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-gray-800">{item.descricao}</td>
                          <td className="px-3 py-2.5 text-right font-black text-gray-900 whitespace-nowrap">
                            {item.pontos.toFixed(2)} <span className="text-[11px] font-normal text-gray-500">pts</span>
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
      </main>
    </div>
  );
}

