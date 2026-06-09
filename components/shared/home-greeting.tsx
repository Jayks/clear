"use client";

/**
 * HomeGreeting — time-aware personal greeting at the top of the Home page.
 * Client component so the greeting uses the user's local timezone, not UTC.
 */

interface Props {
  firstName: string | null;
}

function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour >= 5  && hour < 12) return { text: "Good morning",   emoji: "☀️" };
  if (hour >= 12 && hour < 17) return { text: "Good afternoon", emoji: "⛅" };
  return                               { text: "Good evening",   emoji: "🌙" };
}

export function HomeGreeting({ firstName }: Props) {
  const { text, emoji } = getGreeting();
  return (
    <div className="mb-5 pt-1">
      <h1
        className="text-2xl md:text-3xl text-slate-800 dark:text-slate-100 leading-snug"
        style={{ fontFamily: "var(--font-fraunces)" }}
      >
        {emoji} {text}{firstName ? `, ${firstName}` : ""}
      </h1>
    </div>
  );
}
