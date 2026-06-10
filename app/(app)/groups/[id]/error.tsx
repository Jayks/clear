"use client";

import { ErrorCard } from "@/components/shared/error-card";

export default function GroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorCard error={error} reset={reset} backHref="/groups" backLabel="Back to groups" />
  );
}
