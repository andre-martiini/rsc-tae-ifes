$files = Get-ChildItem -Path "src" -Filter "*.tsx" -Recurse | Where-Object { $_.FullName -notmatch "normative" }
$files += Get-ChildItem -Path "src\lib" -Filter "*.ts" -Recurse

$replacements = @{
    "Ã¡" = "á"
    "Ã©" = "é"
    "Ã­" = "í"
    "Ã³" = "ó"
    "Ãº" = "ú"
    "Ã£" = "ã"
    "Ãµ" = "õ"
    "Ã§" = "ç"
    "Ãª" = "ê"
    "Ã´" = "ô"
    "Ã¢" = "â"
    "Ã‰" = "É"
    "Ã“" = "Ó"
    "Ã€" = "À"
    "Âº" = "º"
    "Âª" = "ª"
    "â€”" = "—"
    "Ã¯" = "ï"
}

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    $original = $content
    foreach ($key in $replacements.Keys) {
        $content = $content.Replace($key, $replacements[$key])
    }
    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
        Write-Host "Updated $($file.FullName)"
    }
}
