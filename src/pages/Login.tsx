import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAppContext } from '../context/AppContext';

export default function Login() {
  const { servidores, login } = useAppContext();
  const [loadingTarget, setLoadingTarget] = useState<'usuário' | 'administrador' | null>(null);
  const [selectedServidorId, setSelectedServidorId] = useState<string>(servidores[0]?.id ?? '');
  const navigate = useNavigate();

  const handleUserAccess = () => {
    const selected = servidores.find((s) => s.id === selectedServidorId);

    if (!selected) {
      toast.error('Selecione um servidor para acessar.');
      return;
    }

    setLoadingTarget('usuário');
    const ok = login(selected.siape);

    if (!ok) {
      toast.error('Servidor não encontrado.');
      setLoadingTarget(null);
      return;
    }

    toast.success(`Acesso liberado: ${selected.nome_completo}`);

    window.setTimeout(() => {
      setLoadingTarget(null);
      navigate('/dashboard');
    }, 500);
  };

  const handleAdminAccess = () => {
    setLoadingTarget('administrador');
    toast.success('Área administrativa.');

    window.setTimeout(() => {
      setLoadingTarget(null);
      navigate('/admin');
    }, 500);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'var(--color-surface)' }}
    >
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] rounded-full"
          style={{ background: 'rgba(0,107,31,0.05)', filter: 'blur(120px)' }}
        />
        <div
          className="absolute -bottom-[10%] -left-[5%] w-[30%] h-[30%] rounded-full"
          style={{ background: 'rgba(0,107,31,0.05)', filter: 'blur(100px)' }}
        />
      </div>

      <main className="w-full max-w-xl flex flex-col items-center">
        <div className="mb-12 flex justify-center">
          <div
            className="relative w-24 h-24 rounded-full flex items-center justify-center ghost-lift"
            style={{ background: 'var(--color-surface-container-lowest)' }}
          >
            <img
              src="/logo_ifes.png"
              alt="Logo IFES - Instituto Federal do Espírito Santo"
              className="w-16 h-16 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('hidden');
              }}
            />
            <span
              hidden
              className="font-headline font-black text-xl"
              style={{ color: 'var(--color-primary)' }}
            >
              IFES
            </span>
          </div>
        </div>

        <header className="text-center mb-10">
          <h1
            className="font-headline font-black text-3xl md:text-4xl tracking-tighter leading-tight mb-4"
            style={{ color: 'var(--color-on-surface)' }}
          >
            Reconhecimento de Saberes e Competencias - RSC-TAE
          </h1>
          <div
            className="h-1 w-16 mx-auto rounded-full"
            style={{ background: 'var(--color-primary)' }}
          />
        </header>

        <div
          className="w-full p-8 md:p-12 rounded-xl ghost-lift"
          style={{
            background: 'var(--color-surface-container-lowest)',
            border: '1px solid rgba(190,202,185,0.15)',
          }}
        >
          <div className="space-y-8">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
              Selecione o servidor para acessar o sistema. Novos servidores podem ser cadastrados
              pela área administrativa.
            </p>

            <div className="space-y-3">
              <label className="text-sm font-semibold" style={{ color: 'var(--color-on-surface)' }}>
                Servidor
              </label>
              <select
                value={selectedServidorId}
                onChange={(e) => setSelectedServidorId(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors"
                style={{
                  background: 'var(--color-surface-container-low)',
                  borderColor: 'rgba(190,202,185,0.3)',
                  color: 'var(--color-on-surface)',
                }}
              >
                {servidores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome_completo} — SIAPE {s.siape}
                  </option>
                ))}
              </select>
              {selectedServidorId && (() => {
                const s = servidores.find((x) => x.id === selectedServidorId);
                return s ? (
                  <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
                    {s.lotacao} · {s.escolaridade_atual}
                  </p>
                ) : null;
              })()}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={handleUserAccess}
                disabled={loadingTarget !== null}
                className="w-full py-5 px-5 rounded-xl font-headline font-bold text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-60"
                style={{
                  background:
                    loadingTarget === 'usuário'
                      ? 'var(--color-primary-container)'
                      : 'var(--color-primary)',
                  color: 'var(--color-on-primary)',
                  boxShadow: '0 4px 24px rgba(0,107,31,0.12)',
                }}
              >
                <span>{loadingTarget === 'usuário' ? 'Acessando...' : 'Acesso usuário'}</span>
                {loadingTarget !== 'usuário' && (
                  <span className="material-symbols-outlined">arrow_forward</span>
                )}
              </button>

              <button
                type="button"
                onClick={handleAdminAccess}
                disabled={loadingTarget !== null}
                className="w-full py-5 px-5 rounded-xl font-headline font-bold text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 border disabled:opacity-60"
                style={{
                  background:
                    loadingTarget === 'administrador'
                      ? 'rgba(186,8,22,0.12)'
                      : 'var(--color-surface-container-low)',
                  color:
                    loadingTarget === 'administrador'
                      ? 'var(--color-secondary)'
                      : 'var(--color-on-surface)',
                  borderColor: 'rgba(186,8,22,0.18)',
                }}
              >
                <span>
                  {loadingTarget === 'administrador' ? 'Abrindo Área...' : 'Acesso Administrador'}
                </span>
                {loadingTarget !== 'administrador' && (
                  <span className="material-symbols-outlined">shield_person</span>
                )}
              </button>
            </div>
          </div>

          <div
            className="mt-10 pt-8 flex gap-4 items-start"
            style={{ borderTop: '1px solid rgba(190,202,185,0.25)' }}
          >
            <div
              className="p-2 rounded-full flex-shrink-0"
              style={{ background: 'rgba(141,250,143,0.2)', color: 'var(--color-primary)' }}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified_user
              </span>
            </div>
            <p className="text-xs md:text-sm leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
              Este fluxo ainda opera como protótipo. A autenticação institucional e a integração
              com as bases oficiais serão conectadas em outra etapa.
            </p>
          </div>

          <div className="mt-6 text-center">
            <a
              href="#"
              className="text-xs font-medium underline underline-offset-4 transition-colors"
              style={{ color: 'var(--color-primary)', textDecorationColor: 'rgba(0,107,31,0.35)' }}
            >
              Problemas de acesso? Entre em contato com a CGP do seu campus
            </a>
          </div>
        </div>

        <footer className="mt-12 text-center">
          <p
            className="text-[0.7rem] uppercase tracking-widest font-semibold"
            style={{ color: 'var(--color-outline)', fontFamily: 'var(--font-headline)' }}
          >
            Instituto Federal do Espírito Santo
          </p>
        </footer>
      </main>
    </div>
  );
}
