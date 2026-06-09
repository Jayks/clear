"use client";

/**
 * GroupHeroHub — thin wrapper rendered in the group overview page hero.
 * Shows a ⋯ button that opens GroupActionHub.
 * On mobile the GroupMobileNav already has a ⋯ button; this one serves desktop
 * (and stays visible on mobile as a secondary entry point).
 */

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { GroupActionHub } from "./group-action-hub";

interface Props {
  groupId:         string;
  groupName:       string;
  groupType:       string;
  currency:        string;
  isArchived:      boolean;
  isAdmin:         boolean;
  isPlusUser?:     boolean;
  joinUrl?:        string;
  groupStartDate?: string | null;
  groupEndDate?:   string | null;
}

const btnCls =
  "w-9 h-9 rounded-xl flex items-center justify-center text-white bg-black/30 hover:bg-black/50 backdrop-blur-md shadow-sm shadow-black/20 active:scale-95 transition-all";

export function GroupHeroHub({
  groupId, groupName, groupType, currency,
  isArchived, isAdmin, isPlusUser,
  joinUrl, groupStartDate, groupEndDate,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={btnCls}
        aria-label="Group actions"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      <GroupActionHub
        isOpen={open}
        onClose={() => setOpen(false)}
        groupId={groupId}
        groupName={groupName}
        groupType={groupType}
        currency={currency}
        isArchived={isArchived}
        isAdmin={isAdmin}
        isPlusUser={isPlusUser}
        joinUrl={joinUrl}
        groupStartDate={groupStartDate}
        groupEndDate={groupEndDate}
      />
    </>
  );
}
