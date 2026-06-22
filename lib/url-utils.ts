/**
 * Validates that a redirect target supplied by the user (a `returnTo`/`next`
 * query param) is a safe, same-origin relative path before it's used in any
 * redirect or client-side navigation.
 *
 * Without this, a crafted value can escape to an external origin via:
 * - a protocol-relative prefix (`//evil.com` — parses as a new origin)
 * - a backslash, which browsers/URL parsers normalize to a forward slash
 *   during relative-URL resolution (`/\evil.com` → `//evil.com`)
 *
 * (The URL "userinfo" trick — `@evil.com` parsing with the real host as
 * userinfo — is already excluded by requiring a leading single `/`.)
 *
 * Used by every redirect call site that takes a user-controlled path:
 * `app/page.tsx` (AutoLoginRedirect), `app/auth/callback/route.ts` (OAuth
 * callback), `app/(auth)/login/login-form.tsx` (callback URL construction),
 * and `components/shared/login-modal.tsx` (post-login navigation).
 */
export function isSafeReturnTo(path: string | null | undefined): path is string {
  if (!path) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("\\")) return false;
  return true;
}
