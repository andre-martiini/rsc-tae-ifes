import React from 'react';
import { ExternalLink, Gavel } from 'lucide-react';
import MainLayout from '../components/MainLayout';

const LEGISLATIONS = [
    {
        title: 'Lei Nº 15.367/2026',
        description: 'Dispõe sobre o Reconhecimento de Saberes e Competências (RSC) para os servidores Técnico-Administrativos em Educação (TAE).',
        category: 'Lei Federal',
        date: '30 de março de 2026',
        url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/lei/L15367.htm',
        icon: Gavel,
        color: 'emerald'
    }
];

export default function Legislation() {
    return (
        <MainLayout activeView="legislation">
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
                <header className="mb-10">
                    <h1 className="text-3xl font-black tracking-tight text-gray-900">Legislações e Normas</h1>
                    <p className="mt-2 text-gray-500">
                        Acompanhe as bases legais e normativas que regem o processo de Reconhecimento de Saberes e Competências.
                    </p>
                </header>

                <div className="grid gap-6">
                    {LEGISLATIONS.map((item, idx) => (
                        <div
                            key={idx}
                            className="group relative flex flex-col items-start gap-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 sm:flex-row sm:items-center sm:p-8"
                        >
                            <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-${item.color}-50 text-${item.color}-600 transition-colors group-hover:bg-${item.color}-100`}>
                                <item.icon className="h-8 w-8" />
                            </div>

                            <div className="flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`rounded-full bg-${item.color}-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-${item.color}-700 ring-1 ring-inset ring-${item.color}-200`}>
                                        {item.category}
                                    </span>
                                    <span className="text-xs text-gray-400">Publicado em {item.date}</span>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 transition-colors group-hover:text-primary sm:text-xl">{item.title}</h3>
                                <p className="max-w-2xl text-sm leading-relaxed text-gray-500">
                                    {item.description}
                                </p>
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
                    ))}
                </div>
            </div>
        </MainLayout>
    );
}

