import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAccess = () => {
    setLoading(true);
    toast.success('Acesso direto liberado no protótipo.');

    window.setTimeout(() => {
      setLoading(false);
      navigate('/dashboard');
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
              alt="Logo IFES - Instituto Federal do Espirito Santo"
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
              O prototipo esta com acesso livre nesta etapa. O mock de login e a criacao de senha
              foram temporariamente desativados para facilitar a validacao do sistema.
            </p>

            <button
              type="button"
              onClick={handleAccess}
              disabled={loading}
              className="w-full py-5 rounded-xl font-headline font-bold text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-60"
              style={{
                background: loading ? 'var(--color-primary-container)' : 'var(--color-primary)',
                color: 'var(--color-on-primary)',
                boxShadow: '0 4px 24px rgba(0,107,31,0.12)',
              }}
            >
              <span>{loading ? 'Acessando...' : 'Acessar sistema'}</span>
              {!loading && <span className="material-symbols-outlined">arrow_forward</span>}
            </button>
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
              Este fluxo ainda opera como prototipo. A autenticacao institucional, as validacoes
              definitivas e a integracao com as bases oficiais serao conectadas em outra etapa.
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
            Instituto Federal do Espirito Santo
          </p>
        </footer>
      </main>
    </div>
  );
}
