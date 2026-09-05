$path = 'G:\\New folder (4)\\src\\pages\\Home.tsx'
for ($i = 29; $i -le 35; $i++) {
  $line = (Get-Content $path -Raw).Split("`n")[$i]
  Write-Host "Line $($i+1): $line"
  $chars = $line.ToCharArray()
  $output = $chars | ForEach-Object { "[$([int]$_)]" }
  Write-Host $output -join ''
}
