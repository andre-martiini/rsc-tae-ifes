import os

replacements = {
    "Ã¡": "á", "Ã©": "é", "Ã­": "í", "Ã³": "ó", "Ãº": "ú",
    "Ã£": "ã", "Ãµ": "õ", "Ã§": "ç", "Ãª": "ê", "Ã´": "ô",
    "Ã¢": "â", "Ã‰": "É", "Ã“": "Ó", "Ã€": "À", "Ãš": "Ú",
    "Ã‚": "Â", "ÃŠ": "Ê", "Ã”": "Ô", "Ãƒ": "Ã", "Ã•": "Õ",
    "Ã‡": "Ç", "Ã": "Í",
    "Âº": "º", "Âª": "ª", "â€”": "—", "Ã¯": "ï",
    "Â·": "·", "â€”": "—", "â€“": "–"
}

files_to_fix = [
    r"src\pages\LandingScreen.tsx",
    r"src\pages\Dashboard.tsx",
    r"src\pages\Consolidation.tsx",
    r"src\lib\pdfGenerator.ts",
    r"src\lib\llmPrompt.ts"
]

for rel_path in files_to_fix:
    path = os.path.join(os.getcwd(), rel_path)
    if not os.path.exists(path):
        continue
        
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        original = content
        for target, replacement in replacements.items():
            content = content.replace(target, replacement)
            
        if content != original:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Fixed encoding in {rel_path}")
        else:
            print(f"No changes needed in {rel_path}")
            
    except Exception as e:
        print(f"Error processing {rel_path}: {e}")
