# Fires on PostToolUse → Bash.
# If the command was pnpm db:push, appends a timestamped result line to
# .claude/db-push.log so there's a local history of when schema changes were pushed.

$stdin = [System.Console]::In.ReadToEnd()
try {
    $data = $stdin | ConvertFrom-Json
    $cmd  = $data.tool_input.command
    if ($cmd -match "db:push") {
        $exitCode = $data.tool_response.exit_code
        $status   = if ($exitCode -eq 0) { "SUCCESS" } else { "FAILED (exit $exitCode)" }
        $line     = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  db:push  $status"
        Add-Content -Path ".claude/db-push.log" -Value $line
        Write-Output "DB push logged: $line"
    }
} catch {}
exit 0
