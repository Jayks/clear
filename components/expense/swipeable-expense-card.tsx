"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, animate, AnimatePresence, type PanInfo } from "framer-motion";
import { Trash2, Copy, Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteExpense, duplicateExpense } from "@/app/actions/expenses";
import { toast } from "sonner";
import { hapticDelete } from "@/lib/haptics";
import { ExpenseCard } from "./expense-card";
import { ExpenseDetailSheet } from "./expense-detail-sheet";
import type { Expense } from "@/lib/db/schema/expenses";
import type { GroupMember } from "@/lib/db/schema/group-members";
import type { ExpenseInteractionCount } from "@/lib/db/queries/interactions";

const SNAP_THRESHOLD = 40;
const FAST_VELOCITY = 300;

interface Props {
  expense: Expense;
  members: GroupMember[];
  currentUserId: string;
  currentMemberId?: string;
  isAdmin: boolean;
  onDelete?: (id: string) => void;
  onDeleteFail?: (id: string) => void;
  interactionCount?: ExpenseInteractionCount;
  compact?: boolean;
}

export function SwipeableExpenseCard(props: Props) {
  const { expense, onDelete, onDeleteFail, interactionCount, currentMemberId } = props;
  const router = useRouter();
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const x = useMotionValue(0);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const isDragging = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  // Cancel any pending 5s delete timer if the card unmounts mid-countdown
  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    };
  }, []);

  // Dismiss when the user taps/clicks anywhere outside this card while actions are open.
  // pointerdown (not click) fires before any tap delay — feels instant.
  useEffect(() => {
    if (!actionsOpen) return;
    const handleOutside = (e: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setActionsOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [actionsOpen]);

  const canEdit = expense.createdByUserId === props.currentUserId || props.isAdmin;

  function onDragStart() {
    isDragging.current = true;
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    setTimeout(() => { isDragging.current = false; }, 50);
    const velocity = info.velocity.x;
    const offset = x.get();

    // When overlay is open, right swipe dismisses it
    if (actionsOpen) {
      if (velocity > FAST_VELOCITY || offset > SNAP_THRESHOLD) {
        setActionsOpen(false);
      }
      animate(x, 0, { type: "spring", stiffness: 500, damping: 40 });
      return;
    }

    // Left swipe opens the overlay
    if (velocity < -FAST_VELOCITY || offset < -SNAP_THRESHOLD) {
      animate(x, 0, { type: "spring", stiffness: 500, damping: 40 });
      setActionsOpen(true);
    } else {
      animate(x, 0, { type: "spring", stiffness: 500, damping: 40 });
    }
  }

  async function handleDuplicate() {
    setActionsOpen(false);
    const result = await duplicateExpense(expense.id);
    if (!result.ok) toast.error(result.error);
    else toast.success("Expense duplicated — dated today.");
  }

  function handleDelete() {
    setActionsOpen(false);
    hapticDelete();
    // Optimistically remove from UI immediately
    onDelete?.(expense.id);

    // Schedule the actual server delete after 5 s
    deleteTimerRef.current = setTimeout(async () => {
      const result = await deleteExpense(expense.id, expense.groupId);
      if (!result.ok) {
        toast.error("Failed to delete expense");
        onDeleteFail?.(expense.id);
      }
    }, 5000);

    toast("Expense deleted", {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          if (deleteTimerRef.current) {
            clearTimeout(deleteTimerRef.current);
            deleteTimerRef.current = null;
          }
          onDeleteFail?.(expense.id);
          router.refresh();
        },
      },
    });
  }

  // Non-touch (desktop): plain card with hover-reveal actions
  if (!isTouchDevice || !canEdit) {
    return (
      <>
        <div onClick={() => setShowDetail(true)} className="cursor-pointer group">
          <ExpenseCard {...props} hoverRevealActions={canEdit} />
        </div>
        <ExpenseDetailSheet
          expense={expense}
          members={props.members}
          currentUserId={props.currentUserId}
          currentMemberId={currentMemberId ?? ""}
          isAdmin={props.isAdmin}
          isOpen={showDetail}
          onClose={() => setShowDetail(false)}
          interactionCount={interactionCount}
        />
      </>
    );
  }

  // Touch (mobile): swipe-to-reveal overlay with all 3 actions
  return (
    <div ref={cardRef} className="relative rounded-xl overflow-hidden">
      <motion.div
        drag="x"
        dragConstraints={{ left: -60, right: actionsOpen ? 60 : 0 }}
        dragElastic={{ left: 0.1, right: 0.05 }}
        dragMomentum={false}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        style={{ x, touchAction: "pan-y" }}
        onClick={() => {
          if (isDragging.current) return;
          if (actionsOpen) { setActionsOpen(false); return; }
          setShowDetail(true);
        }}
      >
        <ExpenseCard {...props} hideActions />
      </motion.div>

      {/* Glass overlay with action buttons */}
      <AnimatePresence>
        {actionsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 rounded-xl backdrop-blur-md bg-white/75 dark:bg-slate-900/80 flex items-center justify-center gap-6"
            onClick={() => setActionsOpen(false)}
          >
            {/* Edit */}
            <Link
              href={`/groups/${expense.groupId}/expenses/${expense.id}/edit`}
              onClick={(e) => e.stopPropagation()}
              className="w-14 h-14 rounded-2xl bg-white/90 dark:bg-slate-800/90 shadow-sm text-slate-600 dark:text-slate-300 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
            >
              <Pencil className="w-5 h-5" />
              <span className="text-[10px] font-medium">Edit</span>
            </Link>

            {/* Duplicate */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleDuplicate(); }}
              className="w-14 h-14 rounded-2xl bg-white/90 dark:bg-slate-800/90 shadow-sm text-slate-600 dark:text-slate-300 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
            >
              <Copy className="w-5 h-5" />
              <span className="text-[10px] font-medium">Copy</span>
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}
              className="w-14 h-14 rounded-2xl bg-red-500/90 shadow-sm text-white flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
            >
              <Trash2 className="w-5 h-5" />
              <span className="text-[10px] font-medium">Delete</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <ExpenseDetailSheet
        expense={expense}
        members={props.members}
        currentUserId={props.currentUserId}
        currentMemberId={currentMemberId ?? ""}
        isAdmin={props.isAdmin}
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        interactionCount={interactionCount}
      />
    </div>
  );
}
