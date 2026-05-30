"use client";

/**
 * HomeGreeting — time-aware personal greeting at the top of the Home page.
 * Client component so the greeting uses the user's local timezone, not UTC.
 */

interface Props {
  firstName: string | null;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5  && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening"; // 5pm onwards, including late night
}

export function HomeGreeting({ firstName }: Props) {
  const greeting = getGreeting();
  return (
    <div className="mb-5 pt-1">
      <h1
        className="text-xl text-slate-800 dark:text-slate-100"
        style={{ fontFamily: "var(--font-fraunces)" }}
      >
        {greeting}{firstName ? `, ${firstName}` : ""} 👋
      </h1>
    </div>
  );
}
