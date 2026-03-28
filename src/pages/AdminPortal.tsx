import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  LayoutGrid,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

type AdminView = 'painel' | 'usuarios' | 'avaliacao' | 'configuracoes';
type UserTab = 'base-servidores' | 'usuarios-sistema';
type ProcessStatus = 'Enviado' | 'Em triagem' | 'Em analise' | 'Pendente de ajuste' | 'Deferido' | 'Indeferido';
type DocumentStatus = 'Pendente' | 'Validado' | 'Pendencia' | 'Recusado';
type Inciso = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';

type AccessProfile = 'Servidor' | 'Avaliador' | 'Administrador' | 'Gestor';

interface AdminDocument {
  id: string;
  nome: string;
  categoria: string;
  inciso: Inciso;
  itemCodigo: string;
  itemDescricao: string;
  enviadoEm: string;
  status: DocumentStatus;
  observacao: string;
}

interface AdminServer {
  id: string;
  nome: string;
  siape: string;
  email: string;
  escolaridade: string;
  lotacao: string;
  perfil: AccessProfile;
  statusProcesso: ProcessStatus;
  nivelPretendido: string;
  ultimaAtualizacao: string;
  pontuacao: number;
  itensLancados: number;
  documentos: AdminDocument[];
  parecerGeral: string;
}

interface SystemUser {
  id: string;
  nome: string;
  siape: string;
  email: string;
  perfil: Exclude<AccessProfile, 'Servidor'>;
  lotacao: string;
  status: 'Ativo' | 'Inativo';
}

const EDUCATION_OPTIONS = [
  'Ensino Fundamental Incompleto',
  'Ensino Fundamental Completo',
  'Ensino Médio Incompleto',
  'Ensino Médio Completo',
  'Ensino Superior Incompleto',
  'Ensino Superior Completo',
  'Especialização',
  'Mestrado',
  'Doutorado',
  'Pós-Doutorado',
] as const;

const LOTACAO_OPTIONS = [
  'Gabinete da Reitoria',
  'Pró-Reitoria de Administração e Orçamento',
  'Pró-Reitoria de Ensino',
  'Pró-Reitoria de Extensão',
  'Pró-Reitoria de Desenvolvimento Institucional',
  'Pró-Reitoria de Pesquisa e Pós-Graduação',
  'Campus Alegre',
  'Campus Aracruz',
  'Campus Barra de São Francisco',
  'Campus Cachoeiro de Itapemirim',
  'Campus Cariacica',
  'Campus Cefor',
  'Campus Centro-Serrano',
  'Campus Colatina',
  'Campus Guarapari',
  'Campus Ibatiba',
  'Campus Itapina',
  'Campus Linhares',
  'Campus Montanha',
  'Campus Nova Venécia',
  'Campus Piúma',
  'Campus Presidente Kennedy',
  'Campus Santa Teresa',
  'Campus São Mateus',
  'Campus Serra',
  'Campus Venda Nova do Imigrante',
  'Campus Viana',
  'Campus Vila Velha',
  'Campus Vitória',
] as const;

const INCISOS: Inciso[] = ['I', 'II', 'III', 'IV', 'V', 'VI'];

const INITIAL_SERVERS: AdminServer[] = [
  {
    id: 'srv-001',
    nome: 'João da Silva Sauro',
    siape: '1234567',
    email: 'joao.silva@ifes.edu.br',
    escolaridade: 'Mestrado',
    lotacao: 'Campus Barra de São Francisco',
    perfil: 'Servidor',
    statusProcesso: 'Em analise',
    nivelPretendido: 'RSC-TAE V',
    ultimaAtualizacao: '26/03/2026 14:15',
    pontuacao: 30,
    itensLancados: 3,
    parecerGeral: 'Processo com boa consistência inicial. Falta concluir a verificação dos anexos.',
    documentos: [
      {
        id: 'doc-001',
        nome: 'portaria_cpa_2022.pdf',
        categoria: 'Portaria',
        inciso: 'II',
        itemCodigo: 'Item 3',
        itemDescricao: 'Participação formal em comissão institucional.',
        enviadoEm: '21/03/2026 10:00',
        status: 'Validado',
        observacao: 'Documento legível e compatível com o item informado.',
      },
      {
        id: 'doc-002',
        nome: 'declaracao_extensao.pdf',
        categoria: 'Declaração',
        inciso: 'III',
        itemCodigo: 'Item 7',
        itemDescricao: 'Atuação em ações de extensão com comprovação institucional.',
        enviadoEm: '22/03/2026 14:30',
        status: 'Pendente',
        observacao: 'Aguardando conferência da assinatura institucional.',
      },
      {
        id: 'doc-007',
        nome: 'certificado_evento.pdf',
        categoria: 'Certificado',
        inciso: 'V',
        itemCodigo: 'Item 18',
        itemDescricao: 'Participação em atividade formativa correlata ao desenvolvimento institucional.',
        enviadoEm: '22/03/2026 16:00',
        status: 'Pendente',
        observacao: 'Necessário conferir carga horária e vínculo com a atividade declarada.',
      },
    ],
  },
  {
    id: 'srv-002',
    nome: 'Marina Costa Almeida',
    siape: '2345678',
    email: 'marina.almeida@ifes.edu.br',
    escolaridade: 'Especialização',
    lotacao: 'Gabinete da Reitoria',
    perfil: 'Servidor',
    statusProcesso: 'Pendente de ajuste',
    nivelPretendido: 'RSC-TAE IV',
    ultimaAtualizacao: '27/03/2026 09:20',
    pontuacao: 18,
    itensLancados: 2,
    parecerGeral: 'Solicitada complementação de comprovante e detalhamento das atividades.',
    documentos: [
      {
        id: 'doc-003',
        nome: 'certificado_gestao.pdf',
        categoria: 'Certificado',
        inciso: 'IV',
        itemCodigo: 'Item 9',
        itemDescricao: 'Formação complementar vinculada a gestão e processos institucionais.',
        enviadoEm: '25/03/2026 16:20',
        status: 'Pendencia',
        observacao: 'Certificado sem carga horária visível. Solicitar novo arquivo.',
      },
      {
        id: 'doc-004',
        nome: 'relatorio_projeto.pdf',
        categoria: 'Relatório',
        inciso: 'VI',
        itemCodigo: 'Item 12',
        itemDescricao: 'Projeto com evidência de impacto administrativo e resultados mensuráveis.',
        enviadoEm: '25/03/2026 16:45',
        status: 'Validado',
        observacao: 'Atende ao escopo informado pela servidora.',
      },
    ],
  },
  {
    id: 'srv-003',
    nome: 'Carlos Henrique Tavares',
    siape: '3456789',
    email: 'carlos.tavares@ifes.edu.br',
    escolaridade: 'Doutorado',
    lotacao: 'Campus Vitória',
    perfil: 'Servidor',
    statusProcesso: 'Em triagem',
    nivelPretendido: 'RSC-TAE VI',
    ultimaAtualizacao: '28/03/2026 08:05',
    pontuacao: 52,
    itensLancados: 4,
    parecerGeral: 'Processo aguardando distribuição para avaliador responsável.',
    documentos: [
      {
        id: 'doc-005',
        nome: 'ata_banca.pdf',
        categoria: 'Ata',
        inciso: 'V',
        itemCodigo: 'Item 15',
        itemDescricao: 'Participação em banca ou comissão acadêmica com ato formal.',
        enviadoEm: '27/03/2026 11:10',
        status: 'Pendente',
        observacao: 'Documento recém-recebido, ainda sem parecer.',
      },
      {
        id: 'doc-006',
        nome: 'declaracao_orientacao.pdf',
        categoria: 'Declaração',
        inciso: 'VI',
        itemCodigo: 'Item 18',
        itemDescricao: 'Orientação e acompanhamento técnico com produção institucional comprovada.',
        enviadoEm: '27/03/2026 11:12',
        status: 'Pendente',
        observacao: 'Aguardando triagem inicial.',
      },
    ],
  },
];

const INITIAL_SYSTEM_USERS: SystemUser[] = [
  {
    id: 'usr-001',
    nome: 'Paula Mendes',
    siape: '4567890',
    email: 'paula.mendes@ifes.edu.br',
    perfil: 'Avaliador',
    lotacao: 'Pró-Reitoria de Ensino',
    status: 'Ativo',
  },
  {
    id: 'usr-002',
    nome: 'Rafael Souza',
    siape: '5678901',
    email: 'rafael.souza@ifes.edu.br',
    perfil: 'Administrador',
    lotacao: 'Pró-Reitoria de Desenvolvimento Institucional',
    status: 'Ativo',
  },
  {
    id: 'usr-003',
    nome: 'Luciana Rocha',
    siape: '6789012',
    email: 'luciana.rocha@ifes.edu.br',
    perfil: 'Gestor',
    lotacao: 'Gabinete da Reitoria',
    status: 'Inativo',
  },
];

const STATUS_META: Record<ProcessStatus, { label: string; bar: string; chip: string }> = {
  Enviado: { label: 'Enviado', bar: 'bg-slate-400', chip: 'bg-slate-100 text-slate-700 border-slate-200' },
  'Em triagem': { label: 'Em triagem', bar: 'bg-amber-400', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  'Em analise': { label: 'Em análise', bar: 'bg-yellow-400', chip: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  'Pendente de ajuste': { label: 'Pendente de ajuste', bar: 'bg-orange-400', chip: 'bg-orange-50 text-orange-700 border-orange-200' },
  Deferido: { label: 'Deferido', bar: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Indeferido: { label: 'Indeferido', bar: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const DOC_STATUS_STYLES: Record<DocumentStatus, string> = {
  Pendente: 'bg-slate-100 text-slate-700 border-slate-200',
  Validado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Pendencia: 'bg-amber-50 text-amber-700 border-amber-200',
  Recusado: 'bg-rose-50 text-rose-700 border-rose-200',
};

const VIEW_OPTIONS: Array<{ id: AdminView; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'painel', label: 'Painel', icon: LayoutGrid },
  { id: 'usuarios', label: 'Usuários', icon: Users },
  { id: 'avaliacao', label: 'Avaliação documental', icon: FileCheck2 },
  { id: 'configuracoes', label: 'Configurações', icon: Settings2 },
];

const PAGE_SIZE = 10;

function paginate<T>(items: T[], page: number) {
  const start = (page - 1) * PAGE_SIZE;
  return items.slice(start, start + PAGE_SIZE);
}

function getStatusDistribution(servers: AdminServer[]) {
  const total = servers.length || 1;
  return (Object.keys(STATUS_META) as ProcessStatus[]).map((status) => {
    const count = servers.filter((server) => server.statusProcesso === status).length;
    return { status, count, percent: Math.round((count / total) * 100) };
  });
}

function getDocumentSummary(documents: AdminDocument[]) {
  return {
    validos: documents.filter((doc) => doc.status === 'Validado').length,
    comPendencia: documents.filter((doc) => doc.status === 'Pendencia').length,
    pendentes: documents.filter((doc) => doc.status === 'Pendente').length,
  };
}

function Pagination({ page, totalItems, onChange }: { page: number; totalItems: number; onChange: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  return (
    <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-4 text-sm text-gray-500">
      <span>Página {page} de {totalPages}</span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1)} className="rounded-lg border-gray-200 text-gray-700">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="rounded-lg border-gray-200 text-gray-700">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminPortal() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<AdminView>('painel');
  const [userTab, setUserTab] = useState<UserTab>('base-servidores');
  const [servers, setServers] = useState<AdminServer[]>(INITIAL_SERVERS);
  const [systemUsers] = useState<SystemUser[]>(INITIAL_SYSTEM_USERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedServerId, setSelectedServerId] = useState<string>(INITIAL_SERVERS[0].id);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [queuePage, setQueuePage] = useState(1);
  const [serverPage, setServerPage] = useState(1);
  const [systemUserPage, setSystemUserPage] = useState(1);
  const [selectedInciso, setSelectedInciso] = useState<Inciso>('I');
  const [editableServer, setEditableServer] = useState(() => ({
    nome: INITIAL_SERVERS[0].nome,
    siape: INITIAL_SERVERS[0].siape,
    email: INITIAL_SERVERS[0].email,
    escolaridade: INITIAL_SERVERS[0].escolaridade,
    lotacao: INITIAL_SERVERS[0].lotacao,
    perfil: INITIAL_SERVERS[0].perfil,
  }));
  const [generalOpinion, setGeneralOpinion] = useState(INITIAL_SERVERS[0].parecerGeral);

  const selectedServer = servers.find((server) => server.id === selectedServerId) ?? null;

  const filteredServers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return servers;
    return servers.filter((server) =>
      [server.nome, server.siape, server.email, server.lotacao, server.nivelPretendido, server.statusProcesso]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [searchTerm, servers]);

  const filteredSystemUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return systemUsers;
    return systemUsers.filter((user) =>
      [user.nome, user.siape, user.email, user.lotacao, user.perfil, user.status]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [searchTerm, systemUsers]);

  const queueServers = useMemo(() => paginate(filteredServers, queuePage), [filteredServers, queuePage]);
  const pagedServers = useMemo(() => paginate(filteredServers, serverPage), [filteredServers, serverPage]);
  const pagedSystemUsers = useMemo(() => paginate(filteredSystemUsers, systemUserPage), [filteredSystemUsers, systemUserPage]);
  const distribution = useMemo(() => getStatusDistribution(servers), [servers]);
  const selectedSummary = useMemo(() => (selectedServer ? getDocumentSummary(selectedServer.documentos) : null), [selectedServer]);
  const documentsByInciso = useMemo(() => {
    if (!selectedServer) return {} as Record<Inciso, AdminDocument[]>;
    return INCISOS.reduce((acc, inciso) => {
      acc[inciso] = selectedServer.documentos.filter((document) => document.inciso === inciso);
      return acc;
    }, {} as Record<Inciso, AdminDocument[]>);
  }, [selectedServer]);

  useEffect(() => {
    if (!selectedServer) return;
    setEditableServer({
      nome: selectedServer.nome,
      siape: selectedServer.siape,
      email: selectedServer.email,
      escolaridade: selectedServer.escolaridade,
      lotacao: selectedServer.lotacao,
      perfil: selectedServer.perfil,
    });
    setGeneralOpinion(selectedServer.parecerGeral);

    const firstActiveInciso = INCISOS.find((inciso) => selectedServer.documentos.some((document) => document.inciso === inciso));
    if (firstActiveInciso) {
      setSelectedInciso(firstActiveInciso);
    }
  }, [selectedServer]);

  useEffect(() => {
    setQueuePage(1);
    setServerPage(1);
    setSystemUserPage(1);
  }, [searchTerm]);

  const updateSelectedServer = (updater: (server: AdminServer) => AdminServer) => {
    setServers((current) => current.map((server) => (server.id === selectedServerId ? updater(server) : server)));
  };

  const openDrawerForServer = (serverId: string) => {
    setSelectedServerId(serverId);
    setDrawerOpen(true);
  };

  const handleSaveServer = () => {
    updateSelectedServer((server) => ({
      ...server,
      ...editableServer,
      ultimaAtualizacao: new Date().toLocaleString('pt-BR'),
    }));
    setConfirmSaveOpen(false);
    setDrawerOpen(false);
  };

  const handleDocumentStatusChange = (documentId: string, status: DocumentStatus) => {
    updateSelectedServer((server) => ({
      ...server,
      documentos: server.documentos.map((document) => document.id === documentId ? { ...document, status } : document),
      ultimaAtualizacao: new Date().toLocaleString('pt-BR'),
    }));
  };

  const handleDocumentObservationChange = (documentId: string, observation: string) => {
    updateSelectedServer((server) => ({
      ...server,
      documentos: server.documentos.map((document) => document.id === documentId ? { ...document, observacao: observation } : document),
      ultimaAtualizacao: new Date().toLocaleString('pt-BR'),
    }));
  };

  const handleGeneralOpinionSave = () => {
    updateSelectedServer((server) => ({
      ...server,
      parecerGeral: generalOpinion,
      ultimaAtualizacao: new Date().toLocaleString('pt-BR'),
    }));
  };

  const renderPanelView = () => (
    <div className="space-y-6">
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900">Distribuição dos processos</CardTitle>
          <CardDescription>Barra de 100% com a proporção de servidores em cada status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-full bg-gray-100">
            <div className="flex h-5 w-full">
              {distribution.map((item) => (
                <div key={item.status} className={`${STATUS_META[item.status].bar} h-full`} style={{ width: `${item.percent}%` }} />
              ))}
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {distribution.map((item) => (
              <div key={item.status} className="rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_META[item.status].chip}`}>
                    {STATUS_META[item.status].label}
                  </span>
                  <span className="text-xs font-semibold text-gray-500">{item.percent}%</span>
                </div>
                <p className="mt-2 text-lg font-black text-gray-900">{item.count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-lg text-gray-900">Fila de acompanhamento</CardTitle>
              <CardDescription>Paginação de 10 em 10 para leitura de uma fila extensa.</CardDescription>
            </div>
            <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
              {filteredServers.length} registros
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase tracking-[0.14em] text-gray-500">
              <tr>
                <th className="px-3 py-3 font-semibold">Servidor</th>
                <th className="px-3 py-3 font-semibold">SIAPE</th>
                <th className="px-3 py-3 font-semibold">Nível</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Atualização</th>
              </tr>
            </thead>
            <tbody>
              {queueServers.map((server) => (
                <tr key={server.id} className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50" onClick={() => { setSelectedServerId(server.id); setActiveView('avaliacao'); }}>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-gray-900">{server.nome}</p>
                    <p className="text-xs text-gray-500">{server.lotacao}</p>
                  </td>
                  <td className="px-3 py-3 text-gray-600">{server.siape}</td>
                  <td className="px-3 py-3 text-gray-600">{server.nivelPretendido}</td>
                  <td className="px-3 py-3"><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_META[server.statusProcesso].chip}`}>{STATUS_META[server.statusProcesso].label}</span></td>
                  <td className="px-3 py-3 text-gray-600">{server.ultimaAtualizacao}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={queuePage} totalItems={filteredServers.length} onChange={setQueuePage} />
        </CardContent>
      </Card>
    </div>
  );

  const renderUsersView = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setUserTab('base-servidores')} className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${userTab === 'base-servidores' ? 'bg-[#8c1d24] text-white' : 'bg-white text-gray-700 border border-gray-200'}`}>
          Base de servidores
        </button>
        <button type="button" onClick={() => setUserTab('usuarios-sistema')} className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${userTab === 'usuarios-sistema' ? 'bg-[#8c1d24] text-white' : 'bg-white text-gray-700 border border-gray-200'}`}>
          Usuários do sistema
        </button>
      </div>

      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg text-gray-900">{userTab === 'base-servidores' ? 'Base de servidores' : 'Usuários do sistema'}</CardTitle>
              <CardDescription>
                {userTab === 'base-servidores'
                  ? 'Tabela principal para consulta e edição lateral de servidores.'
                  : 'Tabela separada para administrar perfis internos do sistema.'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 lg:min-w-[360px]">
              <Search className="h-4 w-4 text-gray-400" />
              <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar por nome, SIAPE, e-mail ou lotação" className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 overflow-x-auto">
          {userTab === 'base-servidores' ? (
            <>
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-xs uppercase tracking-[0.14em] text-gray-500">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Nome</th>
                    <th className="px-3 py-3 font-semibold">SIAPE</th>
                    <th className="px-3 py-3 font-semibold">E-mail</th>
                    <th className="px-3 py-3 font-semibold">Escolaridade</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedServers.map((server) => (
                    <tr key={server.id} className="cursor-pointer border-b border-gray-100 hover:bg-gray-50/80" onClick={() => openDrawerForServer(server.id)}>
                      <td className="px-3 py-3"><p className="font-semibold text-gray-900">{server.nome}</p><p className="text-xs text-gray-500">{server.lotacao}</p></td>
                      <td className="px-3 py-3 text-gray-600">{server.siape}</td>
                      <td className="px-3 py-3 text-gray-600">{server.email}</td>
                      <td className="px-3 py-3 text-gray-600">{server.escolaridade}</td>
                      <td className="px-3 py-3"><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_META[server.statusProcesso].chip}`}>{STATUS_META[server.statusProcesso].label}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={serverPage} totalItems={filteredServers.length} onChange={setServerPage} />
            </>
          ) : (
            <>
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-xs uppercase tracking-[0.14em] text-gray-500">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Nome</th>
                    <th className="px-3 py-3 font-semibold">SIAPE</th>
                    <th className="px-3 py-3 font-semibold">E-mail</th>
                    <th className="px-3 py-3 font-semibold">Perfil</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedSystemUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                      <td className="px-3 py-3"><p className="font-semibold text-gray-900">{user.nome}</p><p className="text-xs text-gray-500">{user.lotacao}</p></td>
                      <td className="px-3 py-3 text-gray-600">{user.siape}</td>
                      <td className="px-3 py-3 text-gray-600">{user.email}</td>
                      <td className="px-3 py-3 text-gray-600">{user.perfil}</td>
                      <td className="px-3 py-3"><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${user.status === 'Ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>{user.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={systemUserPage} totalItems={filteredSystemUsers.length} onChange={setSystemUserPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderEvaluationView = () => (
    <div className="space-y-5">
      {selectedServer ? (
        <>
          <Card className="sticky top-4 z-10 border-gray-200 bg-white/95 shadow-sm backdrop-blur">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8c1d24]">Ficha do processo</p>
                  <h2 className="mt-1 text-xl font-black text-gray-900">{selectedServer.nome}</h2>
                  <p className="mt-1 text-xs text-gray-500">SIAPE {selectedServer.siape} • {selectedServer.email}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_META[selectedServer.statusProcesso].chip}`}>{STATUS_META[selectedServer.statusProcesso].label}</span>
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-5">
                <div className="rounded-xl bg-gray-50 px-3 py-2"><p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">Nível</p><p className="mt-1 text-sm font-bold text-gray-900">{selectedServer.nivelPretendido}</p></div>
                <div className="rounded-xl bg-gray-50 px-3 py-2"><p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">Pontos</p><p className="mt-1 text-sm font-bold text-gray-900">{selectedServer.pontuacao}</p></div>
                <div className="rounded-xl bg-gray-50 px-3 py-2"><p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">Itens</p><p className="mt-1 text-sm font-bold text-gray-900">{selectedServer.itensLancados}</p></div>
                <div className="rounded-xl bg-gray-50 px-3 py-2"><p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">Validados</p><p className="mt-1 text-sm font-bold text-gray-900">{selectedSummary?.validos ?? 0}</p></div>
                <div className="rounded-xl bg-gray-50 px-3 py-2"><p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">Pendências</p><p className="mt-1 text-sm font-bold text-gray-900">{selectedSummary?.comPendencia ?? 0}</p></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 bg-white shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-gray-900">Documentos vinculados</CardTitle>
              <CardDescription>Os documentos são agrupados por inciso para orientar a leitura do avaliador.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {INCISOS.map((inciso) => {
                  const hasDocuments = (documentsByInciso[inciso] ?? []).length > 0;
                  const isActive = selectedInciso === inciso;
                  return (
                    <button
                      key={inciso}
                      type="button"
                      disabled={!hasDocuments}
                      onClick={() => setSelectedInciso(inciso)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${isActive ? 'bg-[#8c1d24] text-white' : hasDocuments ? 'border border-gray-200 bg-white text-gray-700' : 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400'}`}
                    >
                      Inciso {inciso}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-4">
                {(documentsByInciso[selectedInciso] ?? []).map((document) => (
                  <div key={document.id} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-base font-bold text-gray-900">{document.nome}</p>
                        <p className="mt-1 text-sm text-gray-500">{document.categoria} • enviado em {document.enviadoEm}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${DOC_STATUS_STYLES[document.status]}`}>{document.status}</span>
                    </div>

                    <details className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                      <summary className="cursor-pointer text-sm font-semibold text-gray-900">Contexto do item avaliado</summary>
                      <div className="mt-3 space-y-2 text-sm text-gray-600">
                        <p><span className="font-semibold text-gray-900">Inciso:</span> {document.inciso}</p>
                        <p><span className="font-semibold text-gray-900">Item:</span> {document.itemCodigo}</p>
                        <p><span className="font-semibold text-gray-900">Descrição:</span> {document.itemDescricao}</p>
                      </div>
                    </details>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => handleDocumentStatusChange(document.id, 'Validado')} className="rounded-lg bg-emerald-600 px-3 text-white hover:bg-emerald-700">Validar</Button>
                      <Button size="sm" variant="outline" onClick={() => handleDocumentStatusChange(document.id, 'Pendencia')} className="rounded-lg border-amber-200 bg-amber-50 px-3 text-amber-700 hover:bg-amber-100">Marcar pendência</Button>
                      <Button size="sm" variant="outline" onClick={() => handleDocumentStatusChange(document.id, 'Recusado')} className="rounded-lg border-rose-200 bg-rose-50 px-3 text-rose-700 hover:bg-rose-100">Recusar</Button>
                      <Button size="sm" variant="outline" onClick={() => handleDocumentStatusChange(document.id, 'Pendente')} className="rounded-lg border-slate-200 bg-white px-3 text-slate-700">Voltar para pendente</Button>
                    </div>

                    <div className="mt-4 space-y-2">
                      <label className="text-sm font-medium text-gray-700">Observação do documento</label>
                      <textarea value={document.observacao} onChange={(event) => handleDocumentObservationChange(document.id, event.target.value)} rows={3} className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none focus:border-green-500" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t border-gray-200 pt-5">
                <label className="text-sm font-medium text-gray-700">Parecer geral do avaliador</label>
                <textarea value={generalOpinion} onChange={(event) => setGeneralOpinion(event.target.value)} rows={4} className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none focus:border-green-500" />
                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleGeneralOpinionSave} className="rounded-xl bg-green-700 px-4 py-2 text-white hover:bg-green-800"><BadgeCheck className="mr-2 h-4 w-4" />Salvar parecer</Button>
                  <Button variant="outline" onClick={() => setActiveView('usuarios')} className="rounded-xl border-gray-200 px-4 py-2 text-gray-700">Revisar cadastro</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="border-gray-200 bg-white shadow-sm"><CardContent className="p-8 text-sm text-gray-500">Nenhum processo selecionado.</CardContent></Card>
      )}
    </div>
  );

  const renderSettingsView = () => (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900">Parâmetros fechados</CardTitle>
          <CardDescription>Listas controladas para escolaridade e lotação.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <div className="rounded-2xl bg-gray-50 p-4"><strong className="text-gray-900">Escolaridade:</strong> {EDUCATION_OPTIONS.length} opções controladas.</div>
          <div className="rounded-2xl bg-gray-50 p-4"><strong className="text-gray-900">Lotação:</strong> {LOTACAO_OPTIONS.length} opções baseadas na estrutura do Ifes.</div>
        </CardContent>
      </Card>
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900">Próxima camada</CardTitle>
          <CardDescription>Estrutura sugerida para a futura integração.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <div className="rounded-2xl bg-gray-50 p-4">Importação em lote da base fechada de servidores.</div>
          <div className="rounded-2xl bg-gray-50 p-4">Histórico de ações e trilha de auditoria.</div>
          <div className="rounded-2xl bg-gray-50 p-4">Distribuição de processos por avaliador.</div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f6f4] text-gray-900">
      <header className="border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8c1d24] text-white shadow-sm"><ShieldCheck className="h-7 w-7" /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8c1d24]">RSC-TAE • administrador</p>
              <h1 className="mt-1 font-headline text-3xl font-black tracking-tight text-gray-950">Central administrativa de processos</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500">Módulo pensado para receber documentações, gerenciar a base fechada de servidores e conduzir a avaliação com status, parecer e devolutiva.</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/')} className="rounded-xl border-gray-200 bg-white px-4 py-2 text-gray-700"><ArrowLeft className="mr-2 h-4 w-4" />Voltar ao início</Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-6 xl:grid-cols-[260px_1fr]">
        <aside className="space-y-4">
          <Card className="border-gray-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="space-y-2">
                {VIEW_OPTIONS.map((view) => {
                  const Icon = view.icon;
                  const isActive = activeView === view.id;
                  return (
                    <button key={view.id} type="button" onClick={() => setActiveView(view.id)} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all ${isActive ? 'bg-[#8c1d24] text-white shadow-sm' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-semibold">{view.label}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-6">
          {activeView === 'painel' && renderPanelView()}
          {activeView === 'usuarios' && renderUsersView()}
          {activeView === 'avaliacao' && renderEvaluationView()}
          {activeView === 'configuracoes' && renderSettingsView()}
        </section>
      </main>

      {drawerOpen && selectedServer && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/20 backdrop-blur-[1px]">
          <div className="h-full w-full max-w-xl overflow-y-auto border-l border-gray-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8c1d24]">Ficha do servidor</p>
                  <h2 className="mt-2 text-2xl font-black text-gray-900">{selectedServer.nome}</h2>
                  <p className="mt-1 text-sm text-gray-500">SIAPE {selectedServer.siape} • {selectedServer.email}</p>
                </div>
                <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-700"><X className="h-5 w-5" /></button>
              </div>
            </div>

            <div className="space-y-6 px-6 py-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><label className="text-sm font-medium text-gray-700">Nome completo</label><Input value={editableServer.nome} onChange={(event) => setEditableServer((current) => ({ ...current, nome: event.target.value }))} /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-gray-700">SIAPE</label><Input value={editableServer.siape} onChange={(event) => setEditableServer((current) => ({ ...current, siape: event.target.value }))} /></div>
                <div className="space-y-2 md:col-span-2"><label className="text-sm font-medium text-gray-700">E-mail institucional</label><Input value={editableServer.email} onChange={(event) => setEditableServer((current) => ({ ...current, email: event.target.value }))} /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-gray-700">Escolaridade</label><select value={editableServer.escolaridade} onChange={(event) => setEditableServer((current) => ({ ...current, escolaridade: event.target.value }))} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-500">{EDUCATION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                <div className="space-y-2"><label className="text-sm font-medium text-gray-700">Lotação</label><select value={editableServer.lotacao} onChange={(event) => setEditableServer((current) => ({ ...current, lotacao: event.target.value }))} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-500">{LOTACAO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                <div className="space-y-2"><label className="text-sm font-medium text-gray-700">Perfil</label><select value={editableServer.perfil} onChange={(event) => setEditableServer((current) => ({ ...current, perfil: event.target.value as AccessProfile }))} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-500"><option value="Servidor">Servidor</option><option value="Avaliador">Avaliador</option><option value="Administrador">Administrador</option><option value="Gestor">Gestor</option></select></div>
                <div className="space-y-2"><label className="text-sm font-medium text-gray-700">Status do processo</label><select value={selectedServer.statusProcesso} onChange={(event) => updateSelectedServer((server) => ({ ...server, statusProcesso: event.target.value as ProcessStatus, ultimaAtualizacao: new Date().toLocaleString('pt-BR') }))} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-500">{(Object.keys(STATUS_META) as ProcessStatus[]).map((status) => <option key={status} value={status}>{STATUS_META[status].label}</option>)}</select></div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-gray-50 p-4"><p className="text-xs uppercase tracking-[0.18em] text-gray-500">Documentos</p><p className="mt-2 text-2xl font-black text-gray-900">{selectedServer.documentos.length}</p></div>
                <div className="rounded-2xl bg-gray-50 p-4"><p className="text-xs uppercase tracking-[0.18em] text-gray-500">Pontuação</p><p className="mt-2 text-2xl font-black text-gray-900">{selectedServer.pontuacao}</p></div>
                <div className="rounded-2xl bg-gray-50 p-4"><p className="text-xs uppercase tracking-[0.18em] text-gray-500">Itens lançados</p><p className="mt-2 text-2xl font-black text-gray-900">{selectedServer.itensLancados}</p></div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setConfirmSaveOpen(true)} className="rounded-xl bg-green-700 px-4 py-2 text-white hover:bg-green-800"><Save className="mr-2 h-4 w-4" />Salvar cadastro</Button>
                <Button variant="outline" onClick={() => { setDrawerOpen(false); setActiveView('avaliacao'); }} className="rounded-xl border-gray-200 px-4 py-2 text-gray-700">Ir para avaliação documental</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmSaveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-6">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">Confirmar alteração cadastral</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">Deseja salvar as mudanças feitas na ficha deste servidor?</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmSaveOpen(false)} className="rounded-xl border-gray-200 px-4 py-2 text-gray-700">Cancelar</Button>
              <Button onClick={handleSaveServer} className="rounded-xl bg-green-700 px-4 py-2 text-white hover:bg-green-800">Confirmar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
