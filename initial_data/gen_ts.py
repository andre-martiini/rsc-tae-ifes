import json, sys

with open('initial_data/rol_rsc_JSON.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

lines = []
lines.append('export const rolItensRSC = [')
for item in data['itens']:
    nome     = item['nome'].replace("'", "\\'")
    descricao = item['descricao'].replace("'", "\\'")
    docs     = item['documentos_comprobatorios'].replace("'", "\\'")
    unidade  = item['unidade'].replace("'", "\\'")
    auto     = 'true' if item['modo_quantidade'] == 'auto' else 'false'
    lines.append('  {')
    lines.append(f"    id: 'item-{item['numero']}',")
    lines.append(f"    numero: {item['numero']},")
    lines.append(f"    inciso: '{item['inciso']}' as Inciso,")
    lines.append(f"    descricao: '{nome}',")
    lines.append(f"    unidade_medida: '{unidade}',")
    lines.append(f"    pontos_por_unidade: {item['pontos']},")
    lines.append(f"    quantidade_automatica: {auto},")
    lines.append(f"    regra_aceite: '{descricao}',")
    lines.append(f"    documentos_comprobatorios: '{docs}',")
    lines.append('  },')
lines.append('];')

with open('initial_data/rol_data_ts.txt', 'w', encoding='utf-8') as out:
    out.write('\n'.join(lines))

print(f"Gerado: {len(data['itens'])} itens")
