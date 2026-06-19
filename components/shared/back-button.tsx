"use client";

/**
 * BackButton — replaces <Link href={parent}> for all in-app back navigation.
 *
 * Why router.push(href) instead of router.back():
 *   router.back() trusts whatever is actually sitting in browser history,
 *   which can drift from the destination this button promises — e.g. a save
 *   handler that pushes (not replaces) its landing page leaves the just-left
 *   form sitting right behind it, so "Back to expenses" pops straight back
 *   into the stale edit form instead of where the label says. Pushing the
 *   already-known, deterministic `href` instead sidesteps history shape
 *   entirely and always lands where promised — same hierarchical philosophy
 *   as the mobile GroupMobileNav back arrow (see resolveNav()).
 *
 * Why not plain <Link href>: functionally equivalent (both push); kept as a
 * component so the icon + label markup and "open in new tab" `<a href>`
 * semantics stay consistent across every call site.
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
      onClick={(e) => { e.preventDefault(); router.push(href); }}
      className={className}
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </a>
  );
}
