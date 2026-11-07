Set-Location d:\bayan\bayan
$chrome = (Get-Command chrome -ErrorAction SilentlyContinue).Source
if (-not $chrome) { $chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe" }
if (-not (Test-Path $chrome)) { $chrome = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" }
Write-Output "chrome: $chrome"

foreach ($form in @("mobile", "desktop")) {
  for ($i = 1; $i -le 3; $i++) {
    $out = "d:\bayan\lh-$form-$i.json"
    Write-Output "=== $form run $i ==="
    $mob = if ($form -eq "mobile") { "true" } else { "false" }
    npx.cmd lighthouse "http://localhost:4517/welcome" --quiet --chrome-flags="--headless=new --disable-gpu" --form-factor=$form --screenEmulation.mobile=$mob --output=json --output-path=$out --only-categories=performance 2>&1 | Select-Object -Last 1
  }
}
