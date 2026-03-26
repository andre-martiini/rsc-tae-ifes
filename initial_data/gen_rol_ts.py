import json

with open('initial_data/rol_rsc_JSON.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

def esc(s):
    return s.replace('\\', '\\\\').replace("'", "\\'")

lines = []
lines.append("import type { Inciso, ItemRSC } from './mock';")
lines.append('')
lines.append('export const rolItensRSC: ItemRSC[] = [')

for item in data['itens']:
    auto = 'true' if item['modo_quantidade'] == 'auto' else 'false'
    lines.append('  {')
    lines.append(f"    id: 'item-{item['numero']}',")
    lines.append(f"    numero: {item['numero']},")
    lines.append(f"    inciso: '{item['inciso']}',")
    lines.append(f"    descricao: '{esc(item['nome'])}',")
    lines.append(f"    unidade_medida: '{esc(item['unidade'])}',")
    lines.append(f"    pontos_por_unidade: {item['pontos']},")
    lines.append(f"    quantidade_automatica: {auto},")
    lines.append(f"    regra_aceite: '{esc(item['descricao'])}',")
    lines.append(f"    documentos_comprobatorios: '{esc(item['documentos_comprobatorios'])}',")
    lines.append('  },')

lines.append('];')

with open('src/data/rolItens.ts', 'w', encoding='utf-8') as out:
    out.write('\n'.join(lines))

print(f'Escrito: src/data/rolItens.ts ({len(data["itens"])} itens)')
