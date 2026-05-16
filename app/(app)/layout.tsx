import { redirect } from "next/navigation";
import AppNav from "./app-nav";
import { MobileNav } from "@/components/shared/mobile-nav";
import { isPlatformAdmin } from "@/lib/db/queries/admin";
import { TourProvider } from "@/components/tour/tour-context";
import { getCurrentUser } from "@/lib/db/queries/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const isAdmin = isPlatformAdmin(user.email);

  return (
    <TourProvider>
      <div className="min-h-screen flex flex-col">
        <AppNav user={user} isAdmin={isAdmin} />
        <main className="flex-1 p-6 pb-safe-nav md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
        <MobileNav />
      </div>
    </TourProvider>
  );
}
