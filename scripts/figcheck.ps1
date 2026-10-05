param([ValidateSet('install','verify','fixture','browser','package')][string]$Action='verify')
$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$nodePath=(Get-Command node.exe).Source
if($Action -eq 'install') {
  $npmCli=Join-Path (Split-Path -Parent $nodePath) 'node_modules\npm\bin\npm-cli.js'
  if(!(Test-Path -LiteralPath $npmCli)){throw 'Node.js 공식 설치에 포함된 npm을 찾을 수 없습니다.'}
  & $nodePath $npmCli ci --no-audit --no-fund
} elseif($Action -eq 'package') { & python scripts/package.py }
elseif($Action -eq 'fixture') { & $nodePath scripts/fixture-server.mjs }
elseif($Action -eq 'browser') { & $nodePath scripts/browser-test.mjs; if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}; & $nodePath scripts/plugin-browser-test.mjs }
else { & $nodePath scripts/verify.mjs }
exit $LASTEXITCODE
