import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { userAgent } from "next/server";
import { getCurrentUser } from "@/lib/db/queries/auth";
import { CarouselLanding } from "@/components/marketing/carousel-landing";
import { AboutLanding } from "@/components/marketing/about-landing";
import { AutoLoginRedirect } from "@/components/marketing/auto-login-redirect";
import { isSafeReturnTo } from "@/lib/url-utils";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; view?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/groups");

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
  const isMobile = device.type === "mobile" && view !== "full";

  return (
    <>
      {isMobile ? <CarouselLanding /> : <AboutLanding />}
      {safePath && <AutoLoginRedirect returnTo={safePath} />}
    </>
  );
}
