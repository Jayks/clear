import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LoginForm from "./login-form";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ClearLogo } from "@/components/shared/clear-logo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) redirect("/groups");

  const { error, returnTo } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {/* Theme toggle */}
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <ClearLogo
            iconSize={56}
            showWordmark={false}
            className="justify-center mb-4"
          />
          <h1
            className="text-4xl text-slate-800 dark:text-slate-100"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Clear
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm">
            Split it. Clear it.
          </p>
        </div>

        {/* Glass card */}
        <div className="glass rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
            {returnTo?.startsWith("/join") ? "Sign in to join the group" : "Sign in to Clear"}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            {returnTo?.startsWith("/join")
              ? "You'll be taken directly to the group invitation after signing in."
              : "Split expenses with anyone, anywhere."}
          </p>

          {error === "auth_callback_failed" && (
            <p className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-2 border border-red-100 dark:border-red-800/50">
              Sign-in failed. Please try again.
            </p>
          )}

          <LoginForm returnTo={returnTo} />
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
          By signing in you agree to our{" "}
          <a href="/terms" className="underline hover:text-slate-600 dark:hover:text-slate-300">terms of service</a>.
        </p>
      </div>
    </div>
  );
}
