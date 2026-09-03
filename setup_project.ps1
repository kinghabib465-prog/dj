$ErrorActionPreference = "Stop"

# Ensure we are in the script directory
Set-Location -Path $PSScriptRoot

# Install dependencies
npm install

# Build the project
npm run build

Write-Host "Setup complete. You can now run 'npm run dev' to start the dev server."
