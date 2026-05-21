# Fires on Stop (end of Claude's turn).
# Checks for unstaged or staged changes in critical directories.
# If any exist, reminds the developer to run /check before pushing.

$unstaged = git diff --name-only 2>$null
$staged   = git diff --name-only --cached 2>$null
$changed  = @($unstaged) + @($staged) | Where-Object { $_ } | Select-Object -Unique

$critical = $changed | Where-Object { $_ -match "^app/actions/|^lib/" }

if ($critical) {
    Write-Output ""
    Write-Output "-- Critical files modified this session --"
    $critical | ForEach-Object { Write-Output "  $_ " }
    Write-Output "Run /check before pushing to confirm typecheck + tests pass."
    Write-Output "-----------------------------------------"
    Write-Output ""
}
exit 0
