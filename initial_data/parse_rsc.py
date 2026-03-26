#!/usr/bin/env python3
"""
Script para transformar o documento RSC-TAE em arquivo JSON.
Uso: python parse_rsc.py <arquivo_entrada.txt> [arquivo_saida.json]
"""

import re
import json
import sys


INCISOS = {
    "I":   "Comissões e GTs",
    "II":  "Projetos institucionais",
    "III": "Premiação",
    "IV":  "Responsabilidades técnicas",
    "V":   "Direção e assessoramento",
    "VI":  "Publicações científicas",
}

AUTO_NOTE = "A quantidade é sugerida automaticamente pelas datas dos documentos"

# Linha de início de item: número <TAB> inciso romano <TAB> título
ITEM_START = re.compile(r'^(\d+)\t([IVX]+)\t(.+)$')

# Linha de unidade+pontos: "Texto da unidade\t0,1\t" (a última coluna pode ser vazia)
UNIT_LINE = re.compile(r'^(.+?)\t([\d,\.]+)\s*\t?$')

SKIP_LINES = {
    "Anexar documentos (opcional)",
    "Nenhum documento anexado",
}


def clean(text: str) -> str:
    return " ".join(text.split())


def parse_document(text: str) -> dict:
    lines = text.splitlines()
    itens = []

    i = 0
    total = len(lines)

    # Avança até o primeiro item
    while i < total and not ITEM_START.match(lines[i].strip()):
        i += 1

    while i < total:
        line = lines[i].strip()
        m = ITEM_START.match(line)
        if not m:
            i += 1
            continue

        numero = int(m.group(1))
        inciso = m.group(2)
        nome = m.group(3).strip()
        i += 1

        # Nota de quantidade automática (linha imediatamente após o título)
        quantidade_automatica = False
        if i < total and AUTO_NOTE in lines[i]:
            quantidade_automatica = True
            i += 1

        # Descrição: tudo até "Documentos comprobatórios:"
        descricao_parts = []
        while i < total:
            stripped = lines[i].strip()
            if stripped.startswith("Documentos comprobatórios:"):
                break
            if stripped and stripped not in SKIP_LINES and not stripped.startswith("Documentos anexados"):
                descricao_parts.append(stripped)
            i += 1

        # Documentos comprobatórios: tudo até "Documentos anexados"
        docs_comp_parts = []
        if i < total and lines[i].strip().startswith("Documentos comprobatórios:"):
            resto = lines[i].strip()[len("Documentos comprobatórios:"):].strip()
            if resto:
                docs_comp_parts.append(resto)
            i += 1
            while i < total and not lines[i].strip().startswith("Documentos anexados"):
                stripped = lines[i].strip()
                if stripped and stripped not in SKIP_LINES:
                    docs_comp_parts.append(stripped)
                i += 1

        # Documentos anexados (N)
        docs_count = 0
        if i < total and lines[i].strip().startswith("Documentos anexados"):
            match_n = re.search(r'\((\d+)\)', lines[i])
            if match_n:
                docs_count = int(match_n.group(1))
            i += 1

        # Pula linhas de UI e linhas vazias
        while i < total and (lines[i].strip() in SKIP_LINES or lines[i].strip() == ""):
            i += 1

        # Linha de unidade + pontos
        unidade = ""
        pontos = 0.0
        if i < total:
            mu = UNIT_LINE.match(lines[i].strip())
            if mu:
                unidade = mu.group(1).strip()
                try:
                    pontos = float(mu.group(2).replace(',', '.'))
                except ValueError:
                    pass
                i += 1

        # Pula linhas vazias antes da quantidade
        while i < total and lines[i].strip() == "":
            i += 1

        # Quantidade
        quantidade = 0
        if i < total:
            try:
                quantidade = int(lines[i].strip())
                i += 1
            except ValueError:
                pass

        # Pula linhas vazias antes do modo
        while i < total and lines[i].strip() == "":
            i += 1

        # Modo quantidade (auto ou manual)
        modo_quantidade = "manual"
        if i < total and lines[i].strip() == "auto":
            modo_quantidade = "auto"
            i += 1

        itens.append({
            "numero": numero,
            "inciso": inciso,
            "nome": nome,
            "quantidade_automatica": quantidade_automatica,
            "descricao": clean(" ".join(descricao_parts)),
            "documentos_comprobatorios": clean(" ".join(docs_comp_parts)),
            "documentos_anexados": docs_count,
            "unidade": unidade,
            "pontos": pontos,
            "quantidade": quantidade,
            "modo_quantidade": modo_quantidade,
        })

    return {
        "titulo": "Rol de Saberes e Competências",
        "sigla": "RSC-TAE",
        "incisos": INCISOS,
        "itens": itens,
    }


def main():
    if len(sys.argv) < 2:
        print("Uso: python parse_rsc.py <arquivo_entrada.txt> [arquivo_saida.json]")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else "rsc_tae.json"

    with open(input_file, "r", encoding="utf-8") as f:
        text = f.read()

    data = parse_document(text)

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"JSON gerado: {output_file}")
    print(f"Total de itens: {len(data['itens'])}")


if __name__ == "__main__":
    main()
