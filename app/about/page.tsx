import { CarouselLanding } from "@/components/marketing/carousel-landing";

// "About App" — the swipeable feature tour. Lives here so the desktop home
// page (`/`, now the full scrollable AboutLanding) has somewhere to send
// visitors who want the quick visual demo. Mobile's `/` already shows this
// same component directly. See app/CLAUDE.md Landing Page section.
export default function AboutPage() {
  return <CarouselLanding />;
}
