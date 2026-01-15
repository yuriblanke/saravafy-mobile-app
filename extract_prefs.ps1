# Script para extrair PreferencesOverlaySheets e converter para full screen
$source = Get-Content "c:\saravafy-app\src\components\AppHeaderWithPreferences.tsx" -Raw
$lines = $source -split "`n"

# Extrair linhas 341-2229 (PreferencesOverlaySheets completo)
$componentLines = $lines[340..2228]

# Salvar em arquivo temporário para processamento
$componentLines | Out-File "c:\saravafy-app\EXTRACTED_COMPONENT.txt" -Encoding UTF8
Write-Host "Componente extraído: $($componentLines.Count) linhas"
