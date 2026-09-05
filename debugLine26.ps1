$path = 'G:\\New folder (4)\\src\\pages\\Home.tsx'
$line = (Get-Content $path -Raw).Split("`n")[25]
$line.ToCharArray() | ForEach-Object { Write-Host ([int]$_) " " $_ }
