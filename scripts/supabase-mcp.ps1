# Loads repo .env into the process, then runs the official Supabase MCP (stdio).
# Used by mcp.json so Cursor does not need OS-wide env vars for the PAT.
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot ".env"
if (-not (Test-Path $envFile)) {
  Write-Error ".env not found at $envFile"
  exit 1
}
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') {
    $name = $matches[1].Trim()
    $value = $matches[2].Trim()
    Set-Item -Path "env:$name" -Value $value
  }
}
if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Write-Error "SUPABASE_ACCESS_TOKEN missing in .env (Supabase dashboard > Account > Access Tokens)"
  exit 1
}
$ref = if ($env:SUPABASE_PROJECT_REF) { $env:SUPABASE_PROJECT_REF } else { "ocwpcezhabgncshgsxqc" }
$exe = Get-Command npx -ErrorAction SilentlyContinue
if (-not $exe) {
  Write-Error "npx not found on PATH"
  exit 1
}
& npx -y @supabase/mcp-server-supabase "--project-ref=$ref"
