import React from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, FileText, Gavel } from 'lucide-react';
import MainLayout from '../components/MainLayout';

const LEGISLATIONS: Array<{
  title: string;
  description: string;
  category: string;
  date: string;
  status: 'vigente' | 'referencial';
  statusLabel: string;
  notes: string;
  url: string;
  icon: typeof Gavel;
  color: string;
}> = [
  {
    title: 'Lei Nº 15.367/2026',
    description:
      'Dispõe sobre o Reconhecimento de Saberes e Competências (RSC) para os servidores Técnico-Administrativos em Educação (TAE).',
    category: 'Lei Federal',
    date: '30 de março de 2026',
    status: 'vigente',
    statusLabel: 'Base legal vigente',
    notes:
      'Esta é a base legal principal que fundamenta a preparação documental do pedido no sistema.',
    url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/lei/L15367.htm',
    icon: Gavel,
    color: 'emerald',
  },
];

const SYSTEM_BASIS: {
  title: string;
  summary: string;
  status: 'vigente' | 'referencial';
  statusLabel: string;
  details: string[];
} = {
  title: 'Base normativa utilizada pelo sistema',
  summary:
    'O sistema utiliza uma base normativa estruturada para organizar itens, cálculos, memorial, requerimento e dossiê exportado.',
  status: 'referencial',
  statusLabel: 'Referencial do sistema',
  details: [
    'A aplicação organiza a documentação do pedido, mas não executa análise institucional, decisão ou tramitação posterior.',
    'Os textos, cálculos e rótulos exibidos devem ser lidos como apoio à preparação documental do servidor.',
    'Sempre que houver atualização normativa relevante, a base interna do sistema deve ser revisada para manter aderência.',
  ],
};

function getStatusStyle(status: 'vigente' | 'referencial') {
  if (status === 'vigente') {
    return {
      chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      iconBg: 'bg-emerald-50 text-emerald-600',
      Icon: CheckCircle2,
    };
  }

  return {
    chip: 'bg-amber-50 text-amber-700 ring-amber-200',
    iconBg: 'bg-amber-50 text-amber-600',
    Icon: AlertTriangle,
  };
}

export default function Legislation() {
  const basisStyle = getStatusStyle(SYSTEM_BASIS.status);

  return (
    <MainLayout activeView="legislation">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-10">
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Legislação e Base Normativa</h1>
          <p className="mt-2 max-w-3xl text-gray-500">
            Consulte a base legal vigente e a forma como ela é refletida no sistema para preparação do
            dossiê, do memorial e do requerimento.
          </p>
        </header>

        <section className="mb-8 rounded-3xl border border-amber-100 bg-amber-50/60 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${basisStyle.iconBg}`}>
              <basisStyle.Icon className="h-6 w-6" />
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${basisStyle.chip}`}>
                  {SYSTEM_BASIS.statusLabel}
                </span>
                <span className="text-xs text-gray-500">Escopo do sistema: preparação documental</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900">{SYSTEM_BASIS.title}</h2>
              <p className="text-sm leading-relaxed text-gray-600">{SYSTEM_BASIS.summary}</p>
              <ul className="space-y-2 text-sm leading-relaxed text-gray-600">
                {SYSTEM_BASIS.details.map((detail) => (
                  <li key={detail} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <div className="grid gap-6">
          {LEGISLATIONS.map((item) => {
            const style = getStatusStyle(item.status);
            return (
              <div
                key={item.title}
                className="group relative flex flex-col items-start gap-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 sm:flex-row sm:items-center sm:p-8"
              >
                <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-${item.color}-50 text-${item.color}-600 transition-colors group-hover:bg-${item.color}-100`}>
                  <item.icon className="h-8 w-8" />
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full bg-${item.color}-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-${item.color}-700 ring-1 ring-inset ring-${item.color}-200`}>
                      {item.category}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${style.chip}`}>
                      {item.statusLabel}
                    </span>
                    <span className="text-xs text-gray-400">Publicado em {item.date}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 transition-colors group-hover:text-primary sm:text-xl">
                    {item.title}
                  </h3>
                  <p className="max-w-2xl text-sm leading-relaxed text-gray-500">{item.description}</p>
                  <p className="max-w-2xl text-sm leading-relaxed text-gray-600">{item.notes}</p>
                </div>

                <div className="mt-4 sm:mt-0 sm:ml-4">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 text-sm font-bold text-white transition-all hover:bg-primary hover:shadow-lg hover:shadow-primary/20 sm:w-auto"
                  >
                    Acessar documento
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        <section className="mt-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-600">
              <FileText className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-gray-900">Como interpretar esta página</h2>
              <p className="text-sm leading-relaxed text-gray-600">
                A legislação listada aqui serve para transparência e conferência. O sistema utiliza essa base
                para ajudar na organização do pedido, mas não substitui validação normativa institucional nem
                acompanha etapas posteriores à emissão dos documentos.
              </p>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
