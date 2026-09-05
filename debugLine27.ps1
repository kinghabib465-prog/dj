$path = 'G:\\New folder (4)\\src\\pages\\Home.tsx'
$line = (Get-Content $path)[26]
$line.ToCharArray() | ForEach-Object { Write-Host ([int]$_) " " $_ }
