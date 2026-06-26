# Rebuild lull-skill.zip (forward-slash paths) from the skill source — the file Cowork users upload.
# Run:  powershell -ExecutionPolicy Bypass -File pack.ps1
$ErrorActionPreference = "Stop"
$root  = Split-Path -Parent $MyInvocation.MyCommand.Path
$skill = Join-Path $root "plugins\lull\skills\lull\SKILL.md"
$decks = Join-Path $root "plugins\lull\decks"
$out   = Join-Path $root "lull-skill.zip"

Remove-Item $out -ErrorAction SilentlyContinue
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($out, 'Create')
[System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $skill, "lull/SKILL.md") | Out-Null
[System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Join-Path $root "plugins\lull\skills\lull\config.json"), "lull/config.json") | Out-Null
Get-ChildItem $decks -File | ForEach-Object {
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, "lull/decks/$($_.Name)") | Out-Null
}
$zip.Dispose()
Write-Host "Built $out (forward-slash paths, ready for Cowork upload)"
