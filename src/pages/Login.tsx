import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { toast } from 'sonner';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAppContext();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setLoading(true);
    if (login(identifier.trim())) {
      toast.success('Link de acesso enviado para seu e-mail institucional!');
      setTimeout(() => {
        setLoading(false);
        navigate('/create-password');
      }, 1500);
    } else {
      setLoading(false);
      toast.error('SIAPE ou e-mail não encontrado na base do SIGRH.');
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'var(--color-surface)' }}
    >
      {/* Background decorative blobs */}
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
        {/* Logo */}
        <div className="mb-12 flex justify-center">
          <div
            className="relative w-24 h-24 rounded-full flex items-center justify-center ghost-lift"
            style={{ background: 'var(--color-surface-container-lowest)' }}
          >
            <img
              src="/logo_ifes.png"
              alt="Logo IFES — Instituto Federal do Espírito Santo"
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

        {/* Heading */}
        <header className="text-center mb-10">
          <h1
            className="font-headline font-black text-3xl md:text-4xl tracking-tighter leading-tight mb-4"
            style={{ color: 'var(--color-on-surface)' }}
          >
            Reconhecimento de Saberes e Competências — RSC-TAE
          </h1>
          <div
            className="h-1 w-16 mx-auto rounded-full"
            style={{ background: 'var(--color-primary)' }}
          />
        </header>

        {/* Card */}
        <div
          className="w-full p-8 md:p-12 rounded-xl ghost-lift"
          style={{
            background: 'var(--color-surface-container-lowest)',
            border: '1px solid rgba(190,202,185,0.15)',
          }}
        >
          <form className="space-y-8" onSubmit={handleLogin}>
            {/* Input */}
            <div className="space-y-3">
              <label
                htmlFor="siape"
                className="block text-xs font-bold uppercase tracking-widest ml-1"
                style={{ color: 'var(--color-on-surface-variant)', fontFamily: 'var(--font-headline)' }}
              >
                SIAPE ou E-mail Institucional
              </label>
              <div className="relative">
                <div
                  className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
                  style={{ color: 'var(--color-outline)' }}
                >
                  <span className="material-symbols-outlined text-[20px]">account_circle</span>
                </div>
                <input
                  id="siape"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="0000000 ou nome.sobrenome@ifes.edu.br"
                  required
                  className="block w-full pl-12 pr-4 py-4 rounded-lg font-medium transition-all outline-none focus:ring-0"
                  style={{
                    background: 'var(--color-surface-container-low)',
                    border: '0',
                    borderBottom: '2px solid transparent',
                    color: 'var(--color-on-surface)',
                  }}
                  onFocus={(e) => (e.target.style.borderBottomColor = 'var(--color-primary)')}
                  onBlur={(e) => (e.target.style.borderBottomColor = 'transparent')}
                />
              </div>
              <p className="text-xs ml-1" style={{ color: 'var(--color-outline)' }}>
                Dica: use <strong>1234567</strong> ou <strong>joao.silva@ifes.edu.br</strong> para testar.
              </p>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 rounded-xl font-headline font-bold text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-60"
              style={{
                background: loading ? 'var(--color-primary-container)' : 'var(--color-primary)',
                color: 'var(--color-on-primary)',
                boxShadow: '0 4px 24px rgba(0,107,31,0.12)',
              }}
            >
              <span>{loading ? 'Enviando...' : 'Receber Link de Acesso'}</span>
              {!loading && <span className="material-symbols-outlined">arrow_forward</span>}
            </button>
          </form>

          {/* Security footnote */}
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
              Este sistema utiliza autenticação segura via e-mail institucional. Para garantir a
              integridade do processo de RSC, certifique-se de que seus dados no SIAPE estejam
              atualizados. Seus dados são processados em conformidade com a LGPD e normativas
              internas do IFES.
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

        {/* Footer */}
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
