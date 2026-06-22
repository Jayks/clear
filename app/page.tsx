import { headers } from "next/headers";
import { userAgent } from "next/server";
import { CarouselLanding } from "@/components/marketing/carousel-landing";
import { AboutLanding } from "@/components/marketing/about-landing";
import { AutoLoginRedirect } from "@/components/marketing/auto-login-redirect";
import { isSafeReturnTo } from "@/lib/url-utils";

// No auth check here — `proxy.ts`'s matcher includes "/" and already
// redirects authenticated users to /groups BEFORE this component ever runs
// (middleware always executes ahead of the route for a matched path). A
// second `getCurrentUser()` call here was a fully redundant duplicate
// Supabase Auth network round-trip on every single landing-page request,
// sitting directly in the TTFB critical path (found via a perf trace on
// `/?view=full` — this page is the most latency-sensitive one in the app,
// since LCP here gates a visitor's very first impression).
export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; view?: string }>;
}) {
  const { returnTo, view } = await searchParams;

  // Sanitise: only allow same-origin paths (proxy always sets this from pathname,
  // but a crafted URL could contain an external URL).
  const safePath = isSafeReturnTo(returnTo) ? returnTo : undefined;

  // Desktop/tablet gets the full scrollable tour; phones keep the swipe
  // carousel (touch-native — see app/CLAUDE.md Landing Page section).
  // `?view=full` overrides this — it's the target of CarouselLanding's
  // mobile-only "Full site" nav link, the one way a phone can reach the full
  // landing page (there is otherwise no route to it from a mobile UA).
  const { device } = userAgent({ headers: await headers() });
  const isMobileUA = device.type === "mobile";
  const isMobile = isMobileUA && view !== "full";

  return (
    <>
      {/* isMobileUA (not isMobile) — AboutLanding needs to know it's a phone
          even when `?view=full` overrode the carousel, so it can pick the
          right hero mockup variant. See its `isMobileUA` prop comment. */}
      {isMobile ? <CarouselLanding /> : <AboutLanding isMobileUA={isMobileUA} />}
      {safePath && <AutoLoginRedirect returnTo={safePath} />}
    </>
  );
}
