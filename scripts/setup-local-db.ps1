# One-time local PostgreSQL setup for Windows (no Docker).
# Run with: npm run db:setup
#
# - Creates the app login (inventory_app) if it does not exist
# - Gives it a new random password (letters and digits only)
# - Creates the inventory_management database if it does not exist
#   (an existing database is kept as-is; nothing is ever dropped)
# - Writes DATABASE_URL to .env without printing the password
param(
  [string]$PsqlPath = "E:\pgsql18\bin\psql.exe",
  [string]$DbHost = "localhost",
  [int]$Port = 5432,
  [string]$Database = "inventory_management",
  [string]$AppUser = "inventory_app"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $PsqlPath)) {
  throw "psql not found at $PsqlPath. Re-run with -PsqlPath <path to psql.exe>."
}

function Invoke-Psql([string]$Sql) {
  # -X: ignore psqlrc, -t -A: bare output, ON_ERROR_STOP: fail on the first error
  $out = $Sql | & $PsqlPath -X -q -t -A -v ON_ERROR_STOP=1 -U postgres -h $DbHost -p $Port -d postgres
  if ($LASTEXITCODE -ne 0) { throw "psql failed (exit code $LASTEXITCODE)." }
  return $out
}

function New-RandomPassword([int]$Length = 24) {
  $chars = [char[]]"ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
  $bytes = New-Object byte[] $Length
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  return -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
}

$secure = Read-Host "Password for the 'postgres' superuser (typing is hidden)" -AsSecureString
$env:PGPASSWORD = [System.Net.NetworkCredential]::new("", $secure).Password

try {
  $null = Invoke-Psql "SELECT 1;"
  Write-Host "Connected to PostgreSQL as postgres."

  $appPassword = New-RandomPassword
  $roleSql = @'
DO $do$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '__USER__') THEN
    CREATE ROLE __USER__ LOGIN CREATEDB;
  END IF;
END
$do$;
ALTER ROLE __USER__ WITH LOGIN CREATEDB PASSWORD '__PASSWORD__';
'@
  $null = Invoke-Psql $roleSql.Replace("__USER__", $AppUser).Replace("__PASSWORD__", $appPassword)
  Write-Host "Login '$AppUser' is ready (new password generated)."

  $exists = Invoke-Psql "SELECT 1 FROM pg_database WHERE datname = '$Database';"
  if ($exists) {
    Write-Host "Database '$Database' already exists - keeping it and its data."
  } else {
    $null = Invoke-Psql "CREATE DATABASE $Database OWNER $AppUser;"
    Write-Host "Database '$Database' created."
  }

  $envPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.env"))
  $lines = @()
  if (Test-Path $envPath) {
    $lines = @(Get-Content $envPath | Where-Object { $_ -notmatch '^\s*DATABASE_URL\s*=' })
  }
  $lines += "DATABASE_URL=`"postgresql://${AppUser}:${appPassword}@${DbHost}:${Port}/${Database}?schema=public`""
  [System.IO.File]::WriteAllLines($envPath, [string[]]$lines, (New-Object System.Text.UTF8Encoding $false))
  Write-Host "DATABASE_URL saved to $envPath"
  Write-Host "Done. Next: npm run db:check"
}
finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
