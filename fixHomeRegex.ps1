$path = 'G:\\New folder (4)\\src\\pages\\Home.tsx'
$content = Get-Content -Raw $path
$pattern = '<div className="md:w-1/2 flex justify-center"><div className="w-64 h-64 bg-gray-700 rounded-full flex items-center justify-center"><div className="w-12 h-12 bg-accent rounded-full"></div></div></div></div></div></div></div></div></div>'
$replacement = '<div className="md:w-1/2 flex justify-center"><div className="w-64 h-64 bg-gray-700 rounded-full flex items-center justify-center"><div className="w-12 h-12 bg-accent rounded-full"></div></div></div>'
$content = $content -replace [regex]::Escape($pattern), $replacement
Set-Content -Path $path -Value $content -Encoding UTF8
Write-Host 'Fixed placeholder'
