import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/db/queries/auth";
import { getUserSubscription } from "@/lib/subscription/gates";
import { redirect } from "next/navigation";
import { SettingsLayout } from "./settings-layout";

export const metadata: Metadata = { title: "Settings — Clear" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?returnTo=/settings");

  const sub = await getUserSubscription(user.id);

  return (
    <div>
      <Link
        href="/groups"
        className="hidden md:inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to groups
      </Link>

      <h1 className="text-2xl text-slate-800 dark:text-slate-100 mb-6" style={{ fontFamily: "var(--font-fraunces)" }}>
        Settings
      </h1>

      <SettingsLayout sub={sub} />
    </div>
  );
}
