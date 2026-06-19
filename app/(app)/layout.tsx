import { redirect } from "next/navigation";
import { after } from "next/server";
import AppNav from "./app-nav";
import AppSidebar from "./app-sidebar";
import { MobileNav } from "@/components/shared/mobile-nav";
import { PageTransition } from "@/components/shared/page-transition";
import { isPlatformAdmin } from "@/lib/db/queries/admin";
import { TourProvider } from "@/components/tour/tour-context";
import { getCurrentUser } from "@/lib/db/queries/auth";
import { PushPermissionPrompt } from "@/components/shared/push-permission-prompt";
import { VisitorTracker } from "@/components/shared/visitor-tracker";
import { ensureTrialStarted } from "@/app/actions/subscription";
import { TrialBanner } from "@/components/shared/trial-banner";
import { getUserPlan } from "@/lib/subscription/gates";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const [isAdmin, plan] = await Promise.all([
    Promise.resolve(isPlatformAdmin(user.email)),
    getUserPlan(user.id),
  ]);

  after(() => ensureTrialStarted());

  return (
    <TourProvider>
      {/* flex-col on mobile (unchanged: top AppNav + bottom MobileNav); flex-row
          on desktop (AppSidebar rail on the left, content column on the right —
          AppNav contributes nothing there, it's md:hidden internally now). */}
      <div className="min-h-screen flex flex-col md:flex-row">
        <AppSidebar user={user} isAdmin={isAdmin} plan={plan} />
        <AppNav user={user} isAdmin={isAdmin} plan={plan} />
        <div className="flex-1 flex flex-col min-w-0">
          <TrialBanner />
          <main className="flex-1 flex flex-col p-6 pb-safe-nav md:p-8 max-w-7xl mx-auto w-full">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
        <MobileNav />
        <PushPermissionPrompt />
        <VisitorTracker />
      </div>
    </TourProvider>
  );
}
