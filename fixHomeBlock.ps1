$path = 'G:\\New folder (4)\\src\\pages\\Home.tsx'
$lines = Get-Content $path
# Replace lines 25-30 (1-indexed) with corrected block
# Indices: line 25 is index 24, line 30 is index 29
$before = $lines[0..23]
$after = $lines[30..($lines.Count-1)]
$newBlock = @(
  '            <div className="md:w-1/2 flex justify-center">',
  '              {/* Placeholder visual */}',
  '              <div className="w-64 h-64 bg-gray-700 rounded-full flex items-center justify-center">',
  '                <div className="w-12 h-12 bg-accent rounded-full"></div>',
  '              </div>',
  '            </div>'
)
$newLines = $before + $newBlock + $after
Set-Content -Path $path -Value $newLines -Encoding UTF8
Write-Host 'Home.tsx block fixed'
