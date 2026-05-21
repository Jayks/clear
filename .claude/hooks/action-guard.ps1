# Fires on PreToolUse → Edit or Write.
# If the target file is inside app/actions/, outputs the Clear server action
# checklist so Claude has it in context before making any change.
# Always exits 0 — informational only.

$stdin = [System.Console]::In.ReadToEnd()
try {
    $data = $stdin | ConvertFrom-Json
    $file = $data.tool_input.file_path
    if ($file -match "app[/\\]actions[/\\]") {
        Write-Output ""
        Write-Output "SERVER ACTION FILE: $file"
        Write-Output "Clear checklist for this file:"
        Write-Output "  1. Auth:         getCurrentUser() — not supabase.auth.getUser() directly"
        Write-Output "  2. Membership:   getMembership(groupId, user.id) before any DB write"
        Write-Output "  3. Return shape: { ok: true, ... } | { ok: false, error: string } — never throw"
        Write-Output "  4. Cache bust:   revalidateTag('group-\${groupId}', 'max') if mutating groups/group_members"
        Write-Output ""
    }
} catch {}
exit 0
