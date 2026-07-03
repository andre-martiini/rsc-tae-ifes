/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  HelpCircle,
  Clock,
  BookOpen,
  Info,
  ChevronRight,
  GitBranch,
  Shield,
  UploadCloud,
  FileCheck,
  CheckCircle2,
  Code2,
  Building2,
  UserCheck,
  Mail,
  X,
} from 'lucide-react';
import MainLayout from '../components/MainLayout';
import { SYSTEM_UPDATES, type UpdateEntry } from '../data/updates';

export default function HelpAndUpdates() {
  const [activeTab, setActiveTab] = useState<'info' | 'updates' | 'comparison'>('info');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };


  const faqs = [
    {
      q: 'Onde meus dados ficam salvos?',
      a: 'Toda e qualquer informação que você insere neste sistema (como dados cadastrais, lançamentos e arquivos anexados) é armazenada exclusivamente de forma local no seu navegador web (através de tecnologias como LocalStorage e IndexedDB). Nossos servidores não guardam nem recebem nenhum dado pessoal ou profissional do seu dossiê. A única exceção é a ferramenta de feedback voluntário: quando utilizada, ela se conecta a um banco de dados externo para enviar a mensagem, transmitindo exclusivamente as informações registradas naquele momento (nome do servidor, e-mail cadastrado e o texto do feedback).',
    },
    {
      q: 'Como posso garantir que não vou perder meu progresso?',
      a: 'Como os dados ficam locais no navegador, se você limpar os dados de navegação ou formatar seu computador, o progresso será perdido. Por isso, recomendamos fortemente utilizar o botão "Salvar" no topo ou rodapé da tela para baixar o arquivo de backup (.zip). Você pode importar esse arquivo a qualquer momento usando a função "Restaurar".',
    },
    {
      q: 'O cálculo do sistema garante a homologação do meu RSC?',
      a: 'Não. Este sistema funciona como um assistente de organização documental e simulação orientativa de pontuações de acordo com o Decreto nº 13.048/2026. A análise oficial, a decisão fundamentada e a concessão definitiva do RSC são de responsabilidade da CRSC-PCCTAE instituída na sua instituição de ensino.',
    },
    {
      q: 'O que devo anexar como comprovação em cada item?',
      a: 'Você deve anexar portarias, certificados, diplomas, termos de responsabilidade técnica, relatórios assinados ou qualquer outro documento institucional que comprove formalmente a realização daquela atividade pelo período indicado.',
    },
  ];

  return (
    <MainLayout activeView="help" >
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <HelpCircle className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900">Ajuda & Novidades</h1>
              <p className="mt-1 text-sm text-gray-500">
                Informações de suporte, autoria do sistema e acompanhamento de melhorias.
              </p>
            </div>
          </div>
        </header>

        {/* Tabs Navigation */}
        <div className="mb-8 flex border-b border-gray-200 flex-wrap gap-y-2">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-bold transition-all ${
              activeTab === 'info'
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Guia e Informações
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('updates')}
            className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-bold transition-all ${
              activeTab === 'updates'
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Clock className="h-4 w-4" />
            Histórico de Atualizações
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
              {SYSTEM_UPDATES.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('comparison')}
            className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-bold transition-all ${
              activeTab === 'comparison'
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <GitBranch className="h-4 w-4" />
            Mudanças do Decreto 13.048
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'info' && (
            <div className="space-y-8">
              
              {/* About developers & IFES */}
              <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Sobre o Projeto</h3>
                      <p className="mt-2 text-sm leading-relaxed text-gray-500">
                        Este sistema está sendo concebido e desenvolvido no âmbito do{' '}
                        <span className="font-semibold text-gray-900">
                          Instituto Federal do Espírito Santo (IFES)
                        </span>
                        , com o objetivo de apoiar os servidores Técnico-Administrativos em Educação (TAE) no processo de Reconhecimento de Saberes e Competências (RSC). A iniciativa visa proporcionar clareza, transparência e agilidade na montagem do dossiê comprobatório do servidor, facilitando a visualização de critérios e o alcance das metas de pontuação.
                      </p>
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-sm leading-relaxed text-gray-500">
                        A codificação, design de interface e regras de negócio da plataforma foram desenvolvidos pelo servidor{' '}
                        <span className="font-semibold text-gray-900">André Araújo Martini</span>{' '}
                        (<a href="mailto:andre.martini@ifes.edu.br" className="text-primary hover:underline font-medium">andre.martini@ifes.edu.br</a>).
                        O repositório do GitHub está público para que a comunidade possa conhecer a estrutura do projeto, acessar a documentação ou sugerir melhorias.
                      </p>
                    </div>

                    <div className="pt-2">
                      <a
                        href="https://github.com/andre-martiini/rsc-tae-ifes"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2.5 text-xs font-bold text-gray-700 border border-gray-100 hover:bg-gray-100 hover:text-gray-900 transition-all"
                      >
                        <Code2 className="h-4 w-4 text-primary" />
                        <span>Acessar Repositório no GitHub</span>
                        <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Guia Rápido */}
              <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Fluxo Passo a Passo no Sistema</h3>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                  <div className="relative space-y-2 rounded-2xl bg-gray-50/50 p-5 border border-gray-100">
                    <span className="absolute -top-3 left-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-black text-white">
                      1
                    </span>
                    <h4 className="text-sm font-bold text-gray-900 pt-1">Preencher o Perfil</h4>
                    <p className="text-xs leading-relaxed text-gray-500">
                      Configure seus dados pessoais, SIAPE e escolaridade atual. O sistema irá calcular automaticamente o nível de RSC ao qual você é elegível.
                    </p>
                  </div>

                  <div className="relative space-y-2 rounded-2xl bg-gray-50/50 p-5 border border-gray-100">
                    <span className="absolute -top-3 left-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-black text-white">
                      2
                    </span>
                    <h4 className="text-sm font-bold text-gray-900 pt-1">Lançar as Atividades</h4>
                    <p className="text-xs leading-relaxed text-gray-500">
                      Navegue pelo Catálogo de Itens (separe os eixos usando o Mapeador Inteligente) e registre as atividades comprovadas, anexando as portarias e certificados.
                    </p>
                  </div>

                  <div className="relative space-y-2 rounded-2xl bg-gray-50/50 p-5 border border-gray-100">
                    <span className="absolute -top-3 left-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-black text-white">
                      3
                    </span>
                    <h4 className="text-sm font-bold text-gray-900 pt-1">Exportar Documentos</h4>
                    <p className="text-xs leading-relaxed text-gray-500">
                      Acesse a aba Consolidar para revisar suas metas e baixar todos os documentos do dossiê preenchidos (Memorial, Requerimento e cópias de comprovação).
                    </p>
                  </div>
                </div>
              </div>

              {/* FAQs */}
              <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <h3 className="mb-6 text-lg font-bold text-gray-900">Perguntas Frequentes</h3>
                <div className="divide-y divide-gray-100">
                  {faqs.map((faq, index) => {
                    const isOpen = openFaq === index;
                    return (
                      <div key={index} className="py-4 first:pt-0 last:pb-0">
                        <button
                          type="button"
                          onClick={() => toggleFaq(index)}
                          className="flex w-full items-center justify-between gap-4 text-left font-bold text-gray-950 hover:text-primary"
                        >
                          <span className="text-sm sm:text-base">{faq.q}</span>
                          <ChevronRight
                            className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${
                              isOpen ? 'rotate-90 text-primary' : ''
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <p className="mt-3 text-sm leading-relaxed text-gray-500 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            {faq.a}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Security info card */}
              <div className="flex flex-col gap-4 rounded-3xl border border-blue-100 bg-blue-50/50 p-6 sm:flex-row sm:items-center sm:p-8">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                  <Shield className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-blue-900">Privacidade dos seus dados</h4>
                  <p className="text-xs leading-relaxed text-blue-800/80">
                    O processamento e junção de PDF do seu dossiê documental acontecem localmente no seu computador ou de forma isolada e segura em funções de borda na nuvem. Em nenhum momento seus arquivos ou dados cadastrais são persistidos fora de seu próprio computador.
                  </p>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'updates' && (
            <div className="space-y-8">
              
              {/* Timeline list */}
              <div className="relative border-l-2 border-gray-100 pl-6 ml-4 space-y-12">
                {SYSTEM_UPDATES.map((update, idx) => {
                  return (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-[35px] top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white ring-4 ring-gray-50 border border-gray-200">
                        <div className="h-2.5 w-2.5 rounded-full bg-violet-600" />
                      </div>

                      {/* Content Card */}
                      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all">
                        <header className="flex flex-wrap items-center justify-between gap-3 mb-4">
                          <h3 className="text-base font-bold text-gray-900">
                            {update.title}
                          </h3>
                          <span className="text-xs font-semibold text-gray-400">
                            {update.date}
                          </span>
                        </header>

                        <p className="text-sm leading-relaxed text-gray-500 mb-6">
                          {update.description}
                        </p>

                        <div className="space-y-5 border-t border-gray-50 pt-5">
                          {update.features && update.features.length > 0 && (
                            <div>
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-200/50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-violet-700 mb-2">
                                <span>Novidades</span>
                              </div>
                              <ul className="space-y-2">
                                {update.features.map((pt, pIdx) => (
                                  <li key={pIdx} className="flex items-start gap-2.5 text-sm text-gray-600 leading-relaxed">
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-500 mt-0.5" />
                                    <span>{pt}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {update.improvements && update.improvements.length > 0 && (
                            <div>
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-700 mb-2">
                                <span>Melhorias</span>
                              </div>
                              <ul className="space-y-2">
                                {update.improvements.map((pt, pIdx) => (
                                  <li key={pIdx} className="flex items-start gap-2.5 text-sm text-gray-600 leading-relaxed">
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
                                    <span>{pt}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {update.fixes && update.fixes.length > 0 && (
                            <div>
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700 mb-2">
                                <span>Correções</span>
                              </div>
                              <ul className="space-y-2">
                                {update.fixes.map((pt, pIdx) => (
                                  <li key={pIdx} className="flex items-start gap-2.5 text-sm text-gray-600 leading-relaxed">
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                                    <span>{pt}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {activeTab === 'comparison' && (
            <div className="space-y-8">
              {/* Introduction Banner */}
              <div className="rounded-3xl border border-primary/20 bg-emerald-50/30 p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <Info className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Alinhamento ao Decreto nº 13.048/2026</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">
                      O regulamento oficial trouxe ajustes importantes para o catálogo de pontuação de RSC-TAE, 
                      readequando redações para exigir relevância institucional, restringindo acúmulo de gratificações 
                      e alterando valores de pontos. Veja abaixo o comparativo direto "Antes vs Agora" de forma simples.
                    </p>
                  </div>
                </div>
              </div>

              {/* Score Reductions Section */}
              <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <h3 className="mb-6 text-lg font-bold text-gray-900 flex items-center gap-2">
                  Alterações de Pontuação (Pontos Reduzidos)
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Inciso I · Item 4</span>
                      <span className="text-xs text-gray-400">Membro de comissões/GTs</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">Participação em comissões ou grupos de trabalho designados por portaria.</p>
                    <div className="flex items-center gap-4 text-xs pt-1">
                      <span className="text-red-500 font-bold line-through">Antes: 15 pts/ano</span>
                      <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">Agora: 3 pts/ano</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Inciso II · Item 9</span>
                      <span className="text-xs text-gray-400">Capacitações</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">Capacitação e ações formativas continuadas (desenvolvimento de pessoas).</p>
                    <div className="flex items-center gap-4 text-xs pt-1">
                      <span className="text-red-500 font-bold line-through">Antes: 3 pts/curso</span>
                      <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">Agora: 1 pt/curso</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Inciso VI · Item 17</span>
                      <span className="text-xs text-gray-400">Coordenação de Eventos</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">Atuação na coordenação de congresso, simpósio ou seminário de interesse institucional.</p>
                    <div className="flex items-center gap-4 text-xs pt-1">
                      <span className="text-red-500 font-bold line-through">Antes: 4.5 pts</span>
                      <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">Agora: 3.5 pts</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Inciso VI · Item 18</span>
                      <span className="text-xs text-gray-400">Coorientação de TCC</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">Exercício de coorientação de trabalhos de conclusão de cursos e monografias.</p>
                    <div className="flex items-center gap-4 text-xs pt-1">
                      <span className="text-red-500 font-bold line-through">Antes: 7.5 pts</span>
                      <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">Agora: 4.5 pts</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Excluded Item Section */}
              <div className="rounded-3xl border border-red-100 bg-red-50/30 p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                    <X className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-red-950">Item Excluído do Catálogo</h3>
                    <p className="mt-2 text-sm font-semibold text-red-900">Antigo Item 6 do Inciso VI (Certificação Profissional)</p>
                    <p className="mt-1 text-xs leading-relaxed text-red-800/80">
                      A certificação profissional de competência técnica sem vínculo direto com curso formal foi <strong>removida</strong> do rol oficial de critérios. 
                      Lançamentos que usavam este item anteriormente passam a pontuar <strong>0 pontos</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Description & Criteria Alterations */}
              <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <h3 className="mb-6 text-lg font-bold text-gray-900">
                  Principais Alterações de Redação e Requisitos
                </h3>
                <div className="space-y-4">
                  <div className="border-b border-gray-100 pb-4 space-y-2">
                    <h4 className="text-sm font-bold text-gray-900">1. Carga Horária Mínima de Capacitações (Inciso II, Item 11)</h4>
                    <p className="text-xs text-gray-500">Participação em congressos, simpósios, fóruns, workshops e oficinas.</p>
                    <div className="grid gap-2 sm:grid-cols-2 text-xs pt-1">
                      <div className="rounded-xl bg-red-50/50 border border-red-100 p-3 text-red-900">
                        <strong className="block text-[10px] uppercase tracking-wider text-red-600 mb-1">Antes:</strong>
                        Exigia apenas carga horária mínima de <strong>4 horas</strong>.
                      </div>
                      <div className="rounded-xl bg-emerald-50/50 border border-emerald-100 p-3 text-emerald-950">
                        <strong className="block text-[10px] uppercase tracking-wider text-emerald-600 mb-1">Agora (Decreto):</strong>
                        Exige carga horária mínima de <strong>10 horas</strong> e vínculo explícito de interesse com a instituição.
                      </div>
                    </div>
                  </div>

                  <div className="border-b border-gray-100 pb-4 space-y-2">
                    <h4 className="text-sm font-bold text-gray-900">2. Responsabilidade Sem Função Gratificada (Inciso IV, Item 12)</h4>
                    <p className="text-xs text-gray-500">Atuação como responsável formal por setor ou unidade, formalmente designado.</p>
                    <div className="grid gap-2 sm:grid-cols-2 text-xs pt-1">
                      <div className="rounded-xl bg-red-50/50 border border-red-100 p-3 text-red-900">
                        <strong className="block text-[10px] uppercase tracking-wider text-red-600 mb-1">Antes:</strong>
                        Permitia lançar qualquer cargo de coordenação/chefia.
                      </div>
                      <div className="rounded-xl bg-emerald-50/50 border border-emerald-100 p-3 text-emerald-950">
                        <strong className="block text-[10px] uppercase tracking-wider text-emerald-600 mb-1">Agora (Decreto):</strong>
                        Apenas é pontuado se a designação de chefia/setor <strong>não gerar remuneração</strong> (ex.: sem receber FG ou CD).
                      </div>
                    </div>
                  </div>

                  <div className="border-b border-gray-100 pb-4 space-y-2">
                    <h4 className="text-sm font-bold text-gray-900">3. Atividades Não Habituais (Inciso IV, Item 11)</h4>
                    <p className="text-xs text-gray-500">Atuação em sistemas ou processos de trabalho institucionais em ensino, pesquisa, extensão, gestão e inovação.</p>
                    <div className="grid gap-2 sm:grid-cols-2 text-xs pt-1">
                      <div className="rounded-xl bg-red-50/50 border border-red-100 p-3 text-red-900">
                        <strong className="block text-[10px] uppercase tracking-wider text-red-600 mb-1">Antes:</strong>
                        Permitia listar rotinas de trabalho rotineiras.
                      </div>
                      <div className="rounded-xl bg-emerald-50/50 border border-emerald-100 p-3 text-emerald-950">
                        <strong className="block text-[10px] uppercase tracking-wider text-emerald-600 mb-1">Agora (Decreto):</strong>
                        Obrigatório que a atividade <strong>não constitua rotina habitual ou atribuição ordinária</strong> do cargo do servidor.
                      </div>
                    </div>
                  </div>

                  <div className="border-b border-gray-100 pb-4 space-y-2">
                    <h4 className="text-sm font-bold text-gray-900">4. Orientação vs Coorientação (Inciso VI, Item 18)</h4>
                    <p className="text-xs text-gray-500">Exercício de orientação ou coorientação de trabalhos acadêmicos.</p>
                    <div className="grid gap-2 sm:grid-cols-2 text-xs pt-1">
                      <div className="rounded-xl bg-red-50/50 border border-red-100 p-3 text-red-900">
                        <strong className="block text-[10px] uppercase tracking-wider text-red-600 mb-1">Antes:</strong>
                        Englobava tanto orientação titular quanto coorientação na mesma pontuação de 7.5 pts.
                      </div>
                      <div className="rounded-xl bg-emerald-50/50 border border-emerald-100 p-3 text-emerald-950">
                        <strong className="block text-[10px] uppercase tracking-wider text-emerald-600 mb-1">Agora (Decreto):</strong>
                        Este item passou a contemplar <strong>apenas coorientação (4.5 pts)</strong>. A orientação principal é contada em outros critérios acadêmicos específicos.
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-gray-900">5. Interesse Institucional em Produções (Inciso VI, Itens 10 a 16)</h4>
                    <p className="text-xs text-gray-500">Livros com ISBN, capítulos de livros, artigos, produções artísticas, etc.</p>
                    <div className="grid gap-2 sm:grid-cols-2 text-xs pt-1">
                      <div className="rounded-xl bg-red-50/50 border border-red-100 p-3 text-red-900">
                        <strong className="block text-[10px] uppercase tracking-wider text-red-600 mb-1">Antes:</strong>
                        Qualquer publicação com registro ISBN/ISSN era aceita.
                      </div>
                      <div className="rounded-xl bg-emerald-50/50 border border-emerald-100 p-3 text-emerald-950">
                        <strong className="block text-[10px] uppercase tracking-wider text-emerald-600 mb-1">Agora (Decreto):</strong>
                        Toda produção intelectual deve comprovar ter <strong>contribuição, repercussão ou relacionamento explícito com os interesses da IFE</strong>.
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </MainLayout>
  );
}
