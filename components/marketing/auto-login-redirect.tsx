"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  returnTo: string;
}

/**
 * Fired when proxy.ts redirects a logged-out user to / with ?returnTo=<path>.
 * On mount it calls router.replace("/login?returnTo=…") so the @modal/(.)login
 * intercepting route shows the login modal as an overlay on top of the landing
 * page — carousel visible behind the blurred backdrop — identical to the UX a
 * new user gets when clicking "Sign in" from the marketing page.
 *
 * router.replace (not push) so that router.back() inside LoginModal exits to
 * wherever the user was before the session expired, not back to this landing
 * page entry.
 */
export function AutoLoginRedirect({ returnTo }: Props) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
