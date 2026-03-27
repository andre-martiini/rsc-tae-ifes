import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search, ShieldAlert, Sparkles } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { useAppContext } from '../context/AppContext';
import { getEligibleRscLevel, isItemJuridicallyFragile } from '../lib/rsc';

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const incisoLabels: Record<string, string> = {
  I: 'Comissoes e GTs',
  II: 'Projetos institucionais',
  III: 'Premiacao',
  IV: 'Responsabilidades tecnicas',
  V: 'Direcao e assessoramento',
  VI: 'Publicacoes e producao',
};

export default function ItemCatalog() {
  const { servidor, itensRSC, lancamentos, processo, logout } = useAppContext();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const servidorId = servidor?.id ?? '';
  const escolaridadeAtual = servidor?.escolaridade_atual ?? '';

  const nivelElegivel = getEligibleRscLevel(escolaridadeAtual);
  const lancamentosDoServidor = useMemo(
    () => lancamentos.filter((lancamento) => lancamento.servidor_id === servidorId),
    [lancamentos, servidorId],
  );
  const totalPontos = useMemo(
    () => lancamentosDoServidor.reduce((acc, lancamento) => acc + lancamento.pontos_calculados, 0),
    [lancamentosDoServidor],
  );

  const lancamentosByItemId = useMemo(() => {
    const map = new Map<string, number>();

    lancamentosDoServidor.forEach((lancamento) => {
      map.set(lancamento.item_rsc_id, (map.get(lancamento.item_rsc_id) ?? 0) + lancamento.pontos_calculados);
    });

    return map;
  }, [lancamentosDoServidor]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);

    if (!normalizedQuery) {
      return itensRSC;
    }

    return itensRSC.filter((item) =>
      [
        item.descricao,
        item.inciso,
        incisoLabels[item.inciso],
        item.regra_aceite,
        item.documentos_comprobatorios,
        item.unidade_medida,
      ]
        .map(normalizeSearch)
        .some((field) => field.includes(normalizedQuery)),
    );
  }, [itensRSC, query]);

  if (!servidor) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        activeView="catalog"
        onNavigateDashboard={() => navigate('/dashboard')}
        onNavigateCatalog={() => undefined}
        onNavigateWorkspace={() => navigate('/workspace')}
        onNavigateConsolidate={() => navigate('/consolidar')}
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

      <main className="mx-auto max-w-7xl space-y-6 p-6">
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardContent className="space-y-5 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Catalogo de Itens do RSC-TAE
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Encontre o item certo antes do lancamento</h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Pesquise por descricao, inciso, regra de aceite ou documento comprobatorio e abra o item
                  diretamente na tela de lancamento.
                </p>
              </div>

              <div className="w-full lg:max-w-md">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar item, inciso, documento ou regra..."
                    className="h-11 border-gray-200 pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1">
                {filteredItems.length} itens encontrados
              </span>
              <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1">
                {lancamentosByItemId.size} itens ja lancados
              </span>
            </div>
          </CardContent>
        </Card>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filteredItems.map((item) => {
            const pontosLancados = lancamentosByItemId.get(item.id) ?? 0;
            const isFragile = isItemJuridicallyFragile(item);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(`/workspace?item=${item.id}`)}
                className="group text-left"
              >
                <Card className="h-full min-h-[430px] border-gray-200 bg-white transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-md">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary">
                          {item.numero}
                        </div>
                        <div>
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-700">
                              Inciso {item.inciso}
                            </span>
                            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-600">
                              {item.pontos_por_unidade} pts/un
                            </span>
                            {item.quantidade_automatica && (
                              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                                Calculo automatico
                              </span>
                            )}
                            {isFragile && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                                <ShieldAlert className="h-3 w-3" />
                                Enquadramento sensivel
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-bold leading-snug text-gray-900">{item.descricao}</h3>
                        </div>
                      </div>

                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gray-300 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary" />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Unidade</p>
                        <p className="mt-1 text-sm font-medium text-gray-800">{item.unidade_medida}</p>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Situacao</p>
                        <p className="mt-1 text-sm font-medium text-gray-800">
                          {pontosLancados > 0 ? `${pontosLancados.toFixed(2)} pts lancados` : 'Ainda sem lancamento'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-gray-100 bg-white p-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Regra de aceite</p>
                        <p className="mt-1 line-clamp-5 text-[13px] leading-relaxed text-gray-600">{item.regra_aceite}</p>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-white p-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Comprovacao</p>
                        <p className="mt-1 line-clamp-5 text-[13px] leading-relaxed text-gray-600">
                          {item.documentos_comprobatorios}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </section>

        {filteredItems.length === 0 && (
          <Card className="border-dashed border-gray-300 bg-white shadow-sm">
            <CardContent className="flex flex-col items-center justify-center gap-3 p-10 text-center">
              <Search className="h-8 w-8 text-gray-300" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Nenhum item encontrado</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Tente outro termo de busca. Voce pode pesquisar por descricao, inciso ou documento.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
