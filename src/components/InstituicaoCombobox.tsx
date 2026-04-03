import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import listaIes from '../../initial_data/lista_ies.json';

const IES_OPTIONS = (listaIes as { Instituição: string; Sigla: string }[]).map(
  (i) => `${i.Instituição} - ${i.Sigla}`,
);

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function InstituicaoCombobox({ value, onChange }: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [manualMode, setManualMode] = useState(
    () => !!value && !IES_OPTIONS.includes(value),
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
    if (value && !IES_OPTIONS.includes(value)) setManualMode(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = query.trim()
    ? IES_OPTIONS.filter((opt) => opt.toLowerCase().includes(query.toLowerCase()))
    : IES_OPTIONS;

  if (manualMode) {
    return (
      <div className="flex gap-2">
        <Input
          id="instituicao"
          placeholder="Digite o nome da sua instituição"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          title="Voltar para lista"
          onClick={() => {
            setManualMode(false);
            onChange('');
            setQuery('');
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          id="instituicao"
          placeholder="Pesquise sua instituição..."
          value={query}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange('');
            setOpen(true);
          }}
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">Nenhuma instituição encontrada.</div>
          )}
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              className="flex w-full items-start px-3 py-2 text-left text-sm hover:bg-green-50 focus:bg-green-50 focus:outline-none"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(opt);
                setQuery(opt);
                setOpen(false);
              }}
            >
              {opt}
            </button>
          ))}
          <button
            type="button"
            className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 focus:outline-none"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setManualMode(true);
              onChange('');
              setOpen(false);
            }}
          >
            Outra instituição (digitar manualmente)
          </button>
        </div>
      )}
    </div>
  );
}
