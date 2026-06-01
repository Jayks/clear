"use client";

/**
 * BackButton — replaces <Link href={parent}> for all in-app back navigation.
 *
 * Why router.back() instead of <Link href>:
 *   <Link> pushes a NEW history entry, so navigating A→B→[back link to A]
 *   gives history [A, B, A] — the hardware/browser back button then loops
 *   between A and B forever.
 *
 *   router.back() POPS the stack instead, so the hardware back button
 *   always continues in the correct direction.
 *
 * The `href` prop is kept as the <a> href so right-click → "Open in new tab"
 * still works, and screen readers announce the destination correctly.
 */

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface Props {
  href: string;
  label: string;
  className?: string;
}

export function BackButton({ href, label, className }: Props) {
  const router = useRouter();
  return (
    <a
      href={href}
      onClick={(e) => { e.preventDefault(); router.back(); }}
      className={className}
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </a>
  );
}
