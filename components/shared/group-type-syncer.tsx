"use client";

/**
 * Invisible client component — mounts on every group detail page via the
 * groups/[id] layout to relay the current group's type into localStorage so
 * AppSidebar can highlight the correct type link (Trips / Nests / Circles).
 *
 * localStorage key : `clear_current_group_type`  →  "trip" | "nest" | "circle"
 * event            : `group-type-change`  — dispatched on write and on cleanup
 *
 * Mirror of StreamBadgeSync / clear_stream_has_badge pattern.
 */

import { useEffect } from "react";

type GroupType = "trip" | "nest" | "circle";

interface Props {
  groupType: GroupType;
}

export function GroupTypeSyncer({ groupType }: Props) {
  useEffect(() => {
    try {
      localStorage.setItem("clear_current_group_type", groupType);
      window.dispatchEvent(new Event("group-type-change"));
    } catch { /* private browsing / storage disabled — best-effort */ }

    return () => {
      // Clear when navigating away from any group detail page so the sidebar
      // stops highlighting a type once the user is no longer inside a group.
      try {
        localStorage.removeItem("clear_current_group_type");
        window.dispatchEvent(new Event("group-type-change"));
      } catch { /* best-effort */ }
    };
  }, [groupType]);

  return null;
}
