import React from 'react';

export default function AppFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white/90 px-4 py-4 text-xs text-gray-500">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex shrink-0 items-center">
          <img
            src="/ifes_logo_vertical.png"
            alt="Instituto Federal do Espirito Santo"
            className="h-12 w-auto object-contain"
          />
        </div>

        <div className="flex-1">
          <p>
            Desenvolvido pelo <span className="font-semibold text-gray-700">Instituto Federal do Espirito Santo</span>.
          </p>
          <p className="mt-1">
            Autoria: <span className="font-semibold text-gray-700">Andre Araujo Martini</span>.
          </p>
        </div>

        <p>
          Dúvidas ou contribuições:{' '}
          <a
            href="mailto:andre.martini@ifes.edu.br"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            andre.martini@ifes.edu.br
          </a>
        </p>
      </div>
    </footer>
  );
}
