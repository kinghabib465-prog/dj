$path = 'G:\\New folder (4)\\src\\pages\\Home.tsx'
$content = Get-Content -Raw $path
$pattern = '<div className="md:w-1/2 flex justify-center">[\s\S]*?<\/div>'
$replacement = '<div className="md:w-1/2 flex justify-center"><div className="w-64 h-64 bg-gray-700 rounded-full flex items-center justify-center"><div className="w-12 h-12 bg-accent rounded-full"></div></div></div>'
$new = $content -replace $pattern, $replacement
# Fix extra closing tags on line 26
$content = $content -replace '<div className="md:w-1/2 flex justify-center"><div className="w-64 h-64 bg-gray-700 rounded-full flex items-center justify-center"><div className="w-12 h-12 bg-accent rounded-full"></div></div></div></div></div></div>', '<div className="md:w-1/2 flex justify-center"><div className="w-64 h-64 bg-gray-700 rounded-full flex items-center justify-center"><div className="w-12 h-12 bg-accent rounded-full"></div></div></div>'
# Replace line 26 directly
$lines = Get-Content $path
$lines[25] = '            <div className="md:w-1/2 flex justify-center"><div className="w-64 h-64 bg-gray-700 rounded-full flex items-center justify-center"><div className="w-12 h-12 bg-accent rounded-full"></div></div></div>'
Set-Content -Path $path -Value $lines -Encoding UTF8
# Remove stray extra closing div after placeholder
$content = $content -replace '(</div>\s*</div>)', '</div>'
# Fix extra closing tags on line 26
$content = $content -replace '<div className="md:w-1/2 flex justify-center"><div className="w-64 h-64 bg-gray-700 rounded-full flex items-center justify-center"><div className="w-12 h-12 bg-accent rounded-full"></div></div></div></div></div>', '<div className="md:w-1/2 flex justify-center"><div className="w-64 h-64 bg-gray-700 rounded-full flex items-center justify-center"><div className="w-12 h-12 bg-accent rounded-full"></div></div></div>'
Set-Content -Path $path -Value $new -Encoding UTF8
Write-Host 'Home.tsx fixed'