Set-Location d:\bayan\bayan
$js = (Get-ChildItem build\static\js -Filter '*.js' | Measure-Object Length -Sum).Sum
$css = (Get-ChildItem build\static\css -Filter '*.css' | Measure-Object Length -Sum).Sum
$media = (Get-ChildItem build\static\media -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
Write-Output ("JS total: {0} KB" -f [math]::Round($js/1KB))
Write-Output ("CSS total: {0} KB" -f [math]::Round($css/1KB))
if ($media) { Write-Output ("Media total: {0} KB" -f [math]::Round($media/1KB)) }
Write-Output "--- biggest files ---"
Get-ChildItem build\static\js\*.js, build\static\css\*.css, build\static\media\* -ErrorAction SilentlyContinue |
  Sort-Object Length -Descending | Select-Object -First 15 @{n='KB';e={[math]::Round($_.Length/1KB)}}, Name
