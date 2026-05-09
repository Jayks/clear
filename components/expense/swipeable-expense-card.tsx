"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate, type PanInfo } from "framer-motion";
import { Trash2 } from "lucide-react";
import { deleteExpense } from "@/app/actions/expenses";
import { toast } from "sonner";
import { ExpenseCard } from "./expense-card";
import type { Expense } from "@/lib/db/schema/expenses";
import type { TripMember } from "@/lib/db/schema/trip-members";

const REVEAL_WIDTH = 76;
const SNAP_THRESHOLD = 40;
const FAST_VELOCITY = 300;

interface Props {
  expense: Expense;
  members: TripMember[];
  currentUserId: string;
  isAdmin: boolean;
  onDelete?: (id: string) => void;
  onDeleteFail?: (id: string) => void;
}

export function SwipeableExpenseCard(props: Props) {
  const { expense, onDelete, onDeleteFail } = props;
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const x = useMotionValue(0);
  // Delete zone starts REVEAL_WIDTH px to the right of its resting position (hidden).
  // As the card slides left, the zone slides in proportionally so they never overlap.
  const deleteZoneX = useTransform(x, (v) => REVEAL_WIDTH + v);
  const [isOpen, setIsOpen] = useState(false);
  const isDragging = useRef(false);

  useEffect(() => {
    setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const canDelete = expense.createdByUserId === props.currentUserId || props.isAdmin;

  function snapTo(target: number) {
    animate(x, target, { type: "spring", stiffness: 500, damping: 40 });
    setIsOpen(target < 0);
  }

  function onDragStart() {
    isDragging.current = true;
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    setTimeout(() => { isDragging.current = false; }, 50);
    const velocity = info.velocity.x;
    const offset = x.get();
    if (velocity < -FAST_VELOCITY || offset < -SNAP_THRESHOLD) {
      snapTo(-REVEAL_WIDTH);
    } else {
      snapTo(0);
    }
  }

  function handleSwipeDelete() {
    snapTo(0);
    onDelete?.(expense.id);

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      const result = await deleteExpense(expense.id, expense.tripId);
      if (!result.ok) {
        onDeleteFail?.(expense.id);
        toast.error("Failed to delete expense");
      }
    }, 3500);

    toast("Expense deleted", {
      action: {
        label: "Undo",
        onClick: () => {
          cancelled = true;
          clearTimeout(timer);
          onDeleteFail?.(expense.id);
        },
      },
      duration: 3500,
    });
  }

  // Non-touch or no delete permission: plain card, no swipe wrapper
  if (!isTouchDevice || !canDelete) {
    return <ExpenseCard {...props} />;
  }

  return (
    // overflow-hidden clips the delete zone while it is outside to the right
    <div className="relative rounded-xl overflow-hidden">
      {/* Card slides left on drag */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -REVEAL_WIDTH, right: 0 }}
        dragElastic={{ left: 0.08, right: 0.03 }}
        dragMomentum={false}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        style={{ x, touchAction: "pan-y" }}
        onClick={() => { if (isOpen && !isDragging.current) snapTo(0); }}
      >
        <ExpenseCard {...props} />
      </motion.div>

      {/* Delete zone — starts outside the right edge, slides in as card moves left */}
      <motion.div
        className="absolute top-0 right-0 bottom-0 flex items-center justify-center bg-red-500 rounded-r-xl"
        style={{ width: REVEAL_WIDTH, x: deleteZoneX }}
      >
        <button
          type="button"
          onClick={handleSwipeDelete}
          className="flex flex-col items-center gap-1 text-white w-full h-full justify-center"
          aria-label="Delete expense"
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-[10px] font-medium">Delete</span>
        </button>
      </motion.div>
    </div>
  );
}
