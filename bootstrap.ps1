# superbot bootstrap — one line for Windows:
#   powershell -c "irm https://xdxdxd.dsh.sh/bootstrap.ps1 | iex"
# Downloads the Superbot desktop app installer (the one app that wires every
# AI client on the machine) and runs it. There is no installer CLI on this
# origin any more, so nothing here touches node or npm: the app owns the
# wiring. Re-running this exact line later IS the update.
# Under `irm | iex` extra args do NOT reach the script (iex binds none). To
# pass any, run it as a file first:
#   irm https://xdxdxd.dsh.sh/bootstrap.ps1 -OutFile sb.ps1; powershell -File sb.ps1 -NoLaunch
# Templates: https://xdxdxd.dsh.sh https://xdxdxd.dsh.sh/mcp — substituted by the edge on serve.

param(
    [switch]$NoLaunch,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$Origin = 'https://xdxdxd.dsh.sh'
$McpUrl = 'https://xdxdxd.dsh.sh/mcp'
$AssetKey = 'windows-x64'
$Url = "$Origin/download/asset/$AssetKey"
$Installer = Join-Path $env:TEMP 'Superbot-Setup.exe'
# The NSIS installer's default per-user location — where the app lands when
# the setup runs unattended through its defaults.
$AppPath = Join-Path $env:LOCALAPPDATA 'Programs\Superbot\Superbot.exe'

# The same cat the CLI banner shows, resampled to the terminal cell aspect.
# The rows between the ART sentinels are byte-pinned to the CLI banner's
# default render. Art only when output is a console.
# ART:BEGIN
$Cat = @'
  .===:.                  .--:.
 .++**+*+:..............:=+**+*::
 :+*+++*++::==::::=::===*+*+++*=-
 :+*++*+=--====+=====::=+++====
 :=+++=-    --==+=:     .==++==
 =====:       ===+       :===++
 :+=+++:.   --+===-     :++====
 :=+++++:--:===+===::--:+++====
 -==++====+=====+=====+====++=:
  -:===+====++====+=====+==:::
      ..---------------...
'@
# ART:END
if (-not [Console]::IsOutputRedirected) {
    Write-Host $Cat
}
# The facts block mirrors the CLI banner's facts column: accent name, then
# dark-gray label + plain value rows, at the same 1-space indent.
Write-Host " superbot bootstrap" -ForegroundColor DarkGreen
Write-Host " origin " -ForegroundColor DarkGray -NoNewline
Write-Host " $Origin"
Write-Host " remote " -ForegroundColor DarkGray -NoNewline
Write-Host " $McpUrl"
Write-Host ""

function Step($msg) { Write-Host "▸ $msg" -ForegroundColor Green }
# The exact message every fetch failure ends with — the human's way out of a
# private-release 404 or a captive portal is the download page.
function Die($msg) {
    Write-Host "superbot bootstrap: $msg" -ForegroundColor Red
    exit 1
}

if ($DryRun) {
    Write-Host "superbot bootstrap -DryRun"
    Write-Host " asset   $AssetKey"
    Write-Host " url     $Url"
    Write-Host " dest    $Installer"
    exit 0
}

# PS 5.1's default TLS can predate 1.2 on exactly the LTSC/Server machines
# this script runs on: set the floor before the first request.
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

Step "downloading the Superbot app from $Origin"
try {
    # -UseBasicParsing: no IE first-run COM dependency, which a piped iex
    # session never has. A 404 (the release is private while superbot is in
    # beta) or any other non-2xx throws here; a captive portal instead answers
    # 200 with HTML, caught by the size check below.
    Invoke-WebRequest -Uri $Url -OutFile $Installer -UseBasicParsing
} catch {
    Die "could not fetch the installer from $Origin — grab it from $Origin/download"
}
if ((Get-Item $Installer).Length -lt 1MB) {
    Die "could not fetch the installer from $Origin — grab it from $Origin/download"
}

if ($NoLaunch) {
    # downloaded and left alone: nothing is started
    Write-Host "  downloaded to $Installer — run it when you are ready"
    Step "staged $Installer"
    Write-Host "  restart your AI clients so they pick up superbot"
    exit 0
}
Step "running the Superbot installer"
Start-Process -FilePath $Installer -Wait

Step "installed $AppPath"
Write-Host "  restart your AI clients so they pick up superbot"
