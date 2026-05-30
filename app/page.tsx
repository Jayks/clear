import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/queries/auth";
import { CarouselLanding } from "@/components/marketing/carousel-landing";

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/groups");
  return <CarouselLanding />;
}
