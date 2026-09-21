# Resets Cursor global state DB when it grows huge (chat/history bloat → OOM).
# Does NOT touch mocomo source, git, DB, or deployment — IDE-only.
# Usage: quit Cursor completely (including tray), then:
#   powershell -ExecutionPolicy Bypass -File scripts/cursor-reset-local-state.ps1

$ErrorActionPreference = "Stop"

$procs = Get-Process -Name "Cursor" -ErrorAction SilentlyContinue
if ($procs) {
  Write-Host "Close all Cursor windows first. Running PIDs:" ($procs.Id -join ", ")
  exit 1
}

$gs = Join-Path $env:APPDATA "Cursor\User\globalStorage"
$stamp = Get-Date -Format "yyyyMMdd-HHmm"

foreach ($f in @("state.vscdb", "state.vscdb-wal", "state.vscdb-shm")) {
  $p = Join-Path $gs $f
  if (Test-Path $p) {
    $bak = Join-Path $gs "$f.pre-reset-$stamp.bak"
    Rename-Item -LiteralPath $p -NewName (Split-Path $bak -Leaf) -Force
    Write-Host "Renamed $f -> $(Split-Path $bak -Leaf)"
  }
}

Write-Host "Done. Start Cursor again — it will create a fresh state DB."
Write-Host "Old backups live in: $gs"
Write-Host "After confirming stability, delete *.pre-reset-*.bak to reclaim disk (~12GB)."
