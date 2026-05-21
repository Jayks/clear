# Reads GITHUB_PAT from .env.local and starts the GitHub MCP server.
# The token never appears in settings.json — it stays in .env.local only.

$match = Get-Content ".env.local" | Select-String "^GITHUB_PAT=(.+)"
if (-not $match) {
    Write-Error "GITHUB_PAT not found in .env.local"
    exit 1
}
$env:GITHUB_PERSONAL_ACCESS_TOKEN = $match.Matches[0].Groups[1].Value
cmd /c "npx -y @modelcontextprotocol/server-github@latest"
