# Fires on PreToolUse -> Bash.
# Reads the command from stdin JSON. If it touches the DB schema, prints a
# checklist so Claude (and the developer watching) can confirm before proceeding.
# Always exits 0 - this is a warning, not a block.

$stdin = [System.Console]::In.ReadToEnd()
try {
    $data   = $stdin | ConvertFrom-Json
    $cmd    = $data.tool_input.command
    if ($cmd -match "db:push|db:migrate") {
        Write-Output ""
        Write-Output "DB MUTATION GUARD - '$cmd' will alter the live Supabase schema."
        Write-Output "Confirm before proceeding:"
        Write-Output "  1. New tables have RLS policies in drizzle/policies.sql"
        Write-Output "  2. New foreign keys have indexes in drizzle/indexes.sql"
        Write-Output "  3. This is safe to push directly (no breaking column renames)"
        Write-Output ""
    }
} catch {
    # Silent on parse errors - never block Claude due to hook failure.
}
exit 0
