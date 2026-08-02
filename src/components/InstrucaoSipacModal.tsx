/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ClipboardCopy, FileText, ListOrdered, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Servidor } from '../data/mock';
import {
  buildInstrucaoSipac,
  type NivelPleiteadoInstrucao,
} from '../lib/instrucaoSipac';
import { copyTextToClipboard } from '../lib/clipboard';
import { Button } from './ui/button';

type Props = {
  open: boolean;
  onClose: () => void;
  servidor: Servidor;
  nivelPleiteado: NivelPleiteadoInstrucao | null | undefined;
  documentosExportados: string[];
};

export default function InstrucaoSipacModal({
  open,
  onClose,
  servidor,
  nivelPleiteado,
  documentosExportados,
}: Props) {
  if (!open) return null;

  const instrucao = buildInstrucaoSipac(servidor, nivelPleiteado, documentosExportados);

  const handleCopyCampo = async (campo: string, valor: string) => {
    const copied = await copyTextToClipboard(valor);
    if (!copied) {
      toast.error(`Não foi possível copiar "${campo}".`);
      return;
    }
    toast.success(`"${campo}" copiado.`);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-black tracking-tight text-gray-900">Instrução do processo no SIPAC</h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-gray-600">
              Roteiro para cadastrar e instruir o processo no SIPAC com os mesmos dados do seu dossiê. Nada é
              baixado ou salvo — copie os campos abaixo direto na tela do SIPAC.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {/* Seção A */}
          <section className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 bg-gray-100 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-gray-700 ring-1 ring-gray-900/10">
              A. {instrucao.secaoA.titulo}
            </h3>
            <div className="space-y-2">
              {instrucao.secaoA.campos.map((campo) => (
                <div
                  key={campo.id}
                  className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{campo.campo}</p>
                    <p className="mt-0.5 break-words text-[13px] font-semibold text-gray-900">{campo.valor}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyCampo(campo.campo, campo.valor)}
                    className="shrink-0"
                  >
                    <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" />
                    Copiar
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {/* Seção B */}
          <section className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 bg-gray-100 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-gray-700 ring-1 ring-gray-900/10">
              <ListOrdered className="h-3.5 w-3.5" />
              B. {instrucao.secaoB.titulo}
            </h3>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full min-w-[560px] border-collapse text-[12px]">
                <thead>
                  <tr className="bg-gray-50 text-left text-[10px] font-black uppercase tracking-wide text-gray-500">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Arquivo do ZIP</th>
                    <th className="px-3 py-2">Tipo de documento no SIPAC</th>
                    <th className="px-3 py-2">Natureza sugerida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {instrucao.secaoB.itens.map((item) => (
                    <tr key={item.arquivo}>
                      <td className="px-3 py-2 font-bold text-gray-500">{item.ordem}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-gray-800">{item.arquivo}</td>
                      <td className="px-3 py-2 text-gray-700">{item.tipoDocumentoSipac}</td>
                      <td className="px-3 py-2 text-gray-700">{item.naturezaSugerida}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Seção C */}
          <section>
            <h3 className="mb-3 bg-gray-100 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-gray-700 ring-1 ring-gray-900/10">
              C. {instrucao.secaoC.titulo}
            </h3>
            <ol className="space-y-2">
              {instrucao.secaoC.passos.map((passo, index) => (
                <li key={index} className="flex gap-3 text-[13px] text-gray-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary">
                    {index + 1}
                  </span>
                  <span className="leading-relaxed">{passo}</span>
                </li>
              ))}
            </ol>

            <div className="mt-4 space-y-1.5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-[12px] text-amber-900">
              {instrucao.secaoC.avisos.map((aviso, index) => (
                <p key={index} className="leading-relaxed">
                  ⚠ {aviso}
                </p>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-5 py-3 sm:px-6">
          <p className="text-[10px] text-gray-400">Instruções vigentes desde {instrucao.dataVigencia}.</p>
          <Button type="button" onClick={onClose} size="sm">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
