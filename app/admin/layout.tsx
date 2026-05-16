import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminNav } from "./admin-nav";

// Layout is intentionally NOT async — the proxy middleware already validated the
// JWT for /admin routes. Making the layout async would block the entire page
// render (including loading.tsx) on a Supabase Auth network round-trip.
// Each page query calls requirePlatformAdmin() which does the authoritative check.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* Admin top bar */}
      <header className="glass-nav sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link
            href="/groups"
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to app
          </Link>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Clear Admin</span>
          <span className="ml-1 text-xs bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-medium px-2 py-0.5 rounded-full">
            Platform Admin
          </span>
          <AdminNav />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
