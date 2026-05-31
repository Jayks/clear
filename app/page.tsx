import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/queries/auth";
import { CarouselLanding } from "@/components/marketing/carousel-landing";
import { AutoLoginRedirect } from "@/components/marketing/auto-login-redirect";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/groups");

  const { returnTo } = await searchParams;

  // Sanitise: only allow same-origin paths (proxy always sets this from pathname,
  // but a crafted URL could contain an external URL).
  const safePath =
    returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : undefined;

  return (
    <>
      <CarouselLanding />
      {safePath && <AutoLoginRedirect returnTo={safePath} />}
    </>
  );
}
