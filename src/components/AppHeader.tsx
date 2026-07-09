import React, { useMemo, useRef, useState } from 'react';
import { Menu, CheckCircle2, Download, Upload, Loader2 } from 'lucide-react';
import { formatPointValue, sumPointValues } from '../lib/points';
import { useAppContext } from '../context/AppContext';
import { getDistinctRscCriterionCount, getEligibleRscLevel, validateLevelConstraints } from '../lib/rsc';

import { useBackup } from '../hooks/useBackup';

interface AppHeaderProps {
  onOpenMenu?: () => void;
}

export default function AppHeader({
  onOpenMenu,
}: AppHeaderProps) {
  const { processo, lancamentos, servidor, itensRSC } = useAppContext();
  const { isExporting, isImporting, importInputRef, handleExportSession, handleImportSession } = useBackup();

  const lancamentosDoServidor = useMemo(
    () => lancamentos.filter((l) => l.servidor_id === servidor?.id),
    [lancamentos, servidor?.id]
  );

  const totalPontos = useMemo(
    () => sumPointValues(lancamentosDoServidor.map((l) => l.pontos_calculados)),
    [lancamentosDoServidor]
  );

  const itensDistintos = useMemo(
    () => getDistinctRscCriterionCount(lancamentosDoServidor, itensRSC),
    [itensRSC, lancamentosDoServidor]
  );

  const nivelElegivel = useMemo(
    () => (servidor ? getEligibleRscLevel(servidor.escolaridade_atual) : null),
    [servidor]
  );

  const violations = useMemo(
    () =>
      nivelElegivel
        ? validateLevelConstraints(nivelElegivel.id, lancamentosDoServidor, itensRSC)
        : [],
    [nivelElegivel, lancamentosDoServidor, itensRSC]
  );

  const isProfileComplete = useMemo(() => {
    if (!servidor) return false;
    const requiredFields = [
      'siape',
      'nome_completo',
      'email_institucional',
      'instituicao',
      'lotacao',
      'cargo',
      'nivel_classificacao',
      'data_ingresso_ife',
      'escolaridade_atual',
    ];
    return requiredFields.every((f) => !!servidor[f as keyof typeof servidor]);
  }, [servidor]);

  const metasAtingidas = useMemo(
    () =>
      !!nivelElegivel &&
      totalPontos >= nivelElegivel.pontosMinimos &&
      itensDistintos >= nivelElegivel.itensMinimos &&
      violations.length === 0 &&
      isProfileComplete,
    [nivelElegivel, totalPontos, itensDistintos, violations, isProfileComplete]
  );

  return (
    <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="px-4 py-2 sm:px-6 lg:px-8">
        {/* LAYOUT MOBILE (Escondido em telas grandes) */}
        <div className="flex flex-col gap-2 py-2.5 lg:hidden">
          {/* Linha superior: Menu + Logo e Status/Testes */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenMenu}
                className="rounded-xl border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition-colors hover:bg-gray-50 active:scale-95"
              >
                <Menu className="h-4 w-4" />
              </button>
              
              <span className="text-xs font-black uppercase tracking-wider text-primary bg-primary/5 px-2.5 py-1.5 rounded-xl border border-primary/10">
                RSC-TAE
              </span>
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1.5">
              {processo.status === 'Rascunho' && (
                <div className="rounded-full border border-gray-200 bg-gray-50/50 px-2.5 py-1 text-[9px] font-bold text-gray-600 shadow-inner">
                  Rascunho
                </div>
              )}

              {metasAtingidas && (
                <div className="flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50/50 px-2.5 py-1 text-[9px] font-bold text-emerald-700 shadow-inner">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span>Metas</span>
                </div>
              )}

              {/* Alinhamento ao Decreto */}
              <div className="group relative flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50/50 px-2.5 py-1 text-[9px] font-bold text-blue-700 shadow-inner cursor-help">
                <CheckCircle2 className="h-3 w-3 text-blue-500" />
                <span>RSC-PCCTAE</span>

                {/* Tooltip Mobile */}
                <div className="absolute top-full right-0 mt-2 w-48 scale-95 opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100 pointer-events-none z-[60]">
                  <div className="rounded-lg border border-gray-200 bg-white p-2 shadow-xl">
                    <p className="text-[10px] leading-relaxed text-gray-600 font-normal normal-case">
                      Sistema alinhado ao Decreto nº 13.048/2026. Use o canal de feedback para ajustes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Linha inferior: Informações de Pontuação expandidas */}
          <div className="flex w-full items-center justify-around gap-2 rounded-xl bg-gray-50/50 border border-gray-100 px-3 py-2 shadow-inner">
            <div className="flex items-center gap-1.5 text-[10px] font-bold">
              <span className="text-emerald-600 uppercase tracking-widest opacity-80">Total:</span>
              <span className="text-gray-900 tabular-nums">{formatPointValue(totalPontos)} pts</span>
            </div>
            <div className="w-px h-3 bg-gray-200" />
            <div className="flex items-center gap-1.5 text-[10px] font-bold">
              <span className="text-blue-600 uppercase tracking-widest opacity-80">Itens:</span>
              <span className="text-gray-900 tabular-nums">{itensDistintos}</span>
            </div>
            <div className="w-px h-3 bg-gray-200" />
            <div className="flex items-center gap-1.5 text-[10px] font-bold min-w-0 max-w-[40%]">
              <span className="text-indigo-600 uppercase tracking-widest opacity-80 shrink-0">Alvo:</span>
              <span className="text-gray-900 truncate" title={nivelElegivel?.label || 'Não definido'}>
                {nivelElegivel?.label || 'Não definido'}
              </span>
            </div>
          </div>
        </div>

        {/* LAYOUT DESKTOP (Escondido em telas pequenas) */}
        <div className="hidden lg:flex lg:w-full lg:items-center lg:justify-between lg:min-h-[52px] lg:py-2">
          {/* Lado Esquerdo: Box de estatísticas original */}
          <div className="flex items-center justify-around gap-2 rounded-full bg-gray-50/50 border border-gray-100 px-4 py-1.5 shadow-inner sm:justify-center sm:gap-6">
            <div className="flex items-center gap-1.5 text-[10px] font-bold">
              <span className="text-emerald-600 uppercase tracking-widest opacity-80">Total:</span>
              <span className="text-gray-900 tabular-nums">{formatPointValue(totalPontos)} pts</span>
            </div>
            <div className="w-px h-2.5 bg-gray-200" />
            <div className="flex items-center gap-1.5 text-[10px] font-bold">
              <span className="text-blue-600 uppercase tracking-widest opacity-80">Itens:</span>
              <span className="text-gray-900 tabular-nums">{itensDistintos}</span>
            </div>
            <div className="w-px h-2.5 bg-gray-200" />
            <div className="flex items-center gap-1.5 text-[10px] font-bold">
              <span className="text-indigo-600 uppercase tracking-widest opacity-80">Alvo:</span>
              <span className="text-gray-900">{nivelElegivel?.label || 'Não definido'}</span>
            </div>
          </div>

          {/* Centro: Alinhamento Decreto */}
          <div className="flex items-center">
            <div className="group relative flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50/50 px-3 py-1 text-[10px] font-bold text-blue-700 shadow-inner cursor-help">
              <CheckCircle2 className="h-3 w-3 text-blue-500" />
              <span className="uppercase tracking-widest">RSC-PCCTAE</span>

              {/* Tooltip Desktop */}
              <div className="absolute top-full left-1/2 mt-2 w-64 -translate-x-1/2 scale-95 opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100 pointer-events-none z-[60]">
                <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
                  <p className="text-[11px] leading-relaxed text-gray-600 font-normal normal-case">
                    <span className="block font-bold text-gray-900 mb-1">Decreto nº 13.048/2026</span>
                    Sistema alinhado ao decreto publicado e atualizado de acordo com atos complementares e normas internas.
                  </p>
                </div>
                {/* Arrow */}
                <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-l border-t border-gray-200 bg-white"></div>
              </div>
            </div>
          </div>

          {/* Lado Direito: Status Pills e Ações de backup */}
          <div className="flex items-center justify-end gap-2.5 shrink-0">
            <div className="flex items-center gap-1.5">
              {processo.status === 'Rascunho' && (
                <div className="flex items-center gap-1.5 rounded-full border border-gray-100 bg-gray-50/50 px-3 py-1.5 text-[10px] font-bold text-gray-600 shadow-inner">
                  <span className="text-gray-400 uppercase tracking-widest font-medium">Status:</span>
                  <span className="text-gray-900">Rascunho</span>
                </div>
              )}

              {metasAtingidas && (
                <div className="flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50/50 px-3 py-1.5 text-[10px] font-bold text-emerald-700 shadow-inner">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span className="uppercase tracking-widest">Metas atingidas</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={isExporting}
                onClick={handleExportSession}
                className="flex items-center gap-1.5 rounded-full border border-gray-100 bg-white/50 px-3 py-1.5 text-[10px] font-bold text-gray-600 shadow-inner transition-all hover:bg-white hover:text-primary active:scale-95 disabled:opacity-50"
              >
                {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                <span className="uppercase tracking-widest">Salvar</span>
              </button>

              <button
                type="button"
                disabled={isImporting}
                onClick={() => importInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-full border border-gray-100 bg-white/50 px-3 py-1.5 text-[10px] font-bold text-gray-600 shadow-inner transition-all hover:bg-white hover:text-primary active:scale-95 disabled:opacity-50"
              >
                {isImporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                <span className="uppercase tracking-widest">Restaurar</span>
              </button>

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
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
