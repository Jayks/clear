"use client";

import { ErrorCard } from "@/components/shared/error-card";

/**
 * Boundary for top-level (non-app) routes: marketing landing, /login, /pricing,
 * /join, etc. Rendered INSIDE the root layout, so it must NOT render <html>.
 * Root-layout failures are handled by app/global-error.tsx instead.
 */
export default function RootRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorCard error={error} reset={reset} backHref="/" backLabel="Home" />;
}
