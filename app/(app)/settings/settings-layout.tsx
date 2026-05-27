"use client";

import { useState } from "react";
import { Palette, CreditCard, Bell, User } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { BillingSection } from "./billing-section";
import { NotificationsSection } from "./notifications-section";
import { ProfileSection } from "./profile-section";
import type { Subscription } from "@/lib/db/schema/subscriptions";

type Section = "profile" | "appearance" | "billing" | "notifications";

const SIDEBAR_LINKS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "profile",       label: "Profile",       icon: User       },
  { id: "appearance",    label: "Appearance",    icon: Palette    },
  { id: "billing",       label: "Billing",       icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell       },
];

interface Props {
  sub: Subscription | null;
  currentDisplayName: string;
  userEmail: string;
  userAvatarUrl: string | null;
}

export function SettingsLayout({ sub, currentDisplayName, userEmail, userAvatarUrl }: Props) {
  const [active, setActive] = useState<Section>("profile");

  return (
    <div className="md:grid md:grid-cols-[200px_1fr] md:gap-8 md:items-start">

      {/* Sidebar — desktop only */}
      <aside className="hidden md:block sticky top-20">
        <nav className="space-y-0.5">
          {SIDEBAR_LINKS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                active === id
                  ? "text-slate-800 dark:text-slate-100 bg-white/80 dark:bg-slate-800/80 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-800/60"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="space-y-4">

        {/* Profile */}
        <section className={active !== "profile" ? "md:hidden" : ""}>
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Profile</span>
              <div className="flex-1 h-px bg-slate-200/80 dark:bg-slate-700/50" />
            </div>
            <ProfileSection
              currentDisplayName={currentDisplayName}
              userEmail={userEmail}
              userAvatarUrl={userAvatarUrl}
            />
          </div>
        </section>

        {/* Appearance — always visible on mobile; desktop: only when active */}
        <section className={active !== "appearance" ? "md:hidden" : ""}>
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                <Palette className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Appearance</span>
              <div className="flex-1 h-px bg-slate-200/80 dark:bg-slate-700/50" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Theme</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Switch between light and dark mode</p>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </section>

        {/* Billing */}
        <section className={active !== "billing" ? "md:hidden" : ""}>
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                <CreditCard className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Billing</span>
              <div className="flex-1 h-px bg-slate-200/80 dark:bg-slate-700/50" />
            </div>
            <BillingSection sub={sub} />
          </div>
        </section>

        {/* Notifications */}
        <section className={active !== "notifications" ? "md:hidden" : ""}>
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                <Bell className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Notifications</span>
              <div className="flex-1 h-px bg-slate-200/80 dark:bg-slate-700/50" />
            </div>
            <NotificationsSection />
          </div>
        </section>

      </div>
    </div>
  );
}
