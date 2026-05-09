import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/db/queries/admin";
import Link from "next/link";
import { LayoutDashboard, Users, Map, ArrowLeft } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isPlatformAdmin(user.email)) redirect("/trips");

  return (
    <div className="min-h-screen">
      {/* Admin top bar */}
      <header className="glass-nav sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link
            href="/trips"
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to app
          </Link>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Wayfare Admin</span>
          <span className="ml-1 text-xs bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-medium px-2 py-0.5 rounded-full">
            Platform Admin
          </span>
          <nav className="ml-auto flex items-center gap-1">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </Link>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              Users
            </Link>
            <Link
              href="/admin/trips"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Map className="w-3.5 h-3.5" />
              Trips
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
