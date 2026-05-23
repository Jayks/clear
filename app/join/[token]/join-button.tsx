"use client";

import { joinGroup, claimGuestMember } from "@/app/actions/members";
import { trackEvent } from "@/lib/analytics";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { User, Check, ArrowRight, Sparkles } from "lucide-react";

interface UnclaimedGuest {
  id: string;
  guestName: string | null;
}

interface Props {
  token: string;
  groupType: string;
  groupLabel: string;
  isLoggedIn: boolean;
  unclaimedGuests: UnclaimedGuest[];
  userDisplayName: string | null;
}

export function JoinButton({ token, groupType, groupLabel, isLoggedIn, unclaimedGuests, userDisplayName }: Props) {
  const [loading, setLoading] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<UnclaimedGuest | null>(null);
  const router = useRouter();

  async function handleJoin() {
    if (!isLoggedIn) {
      router.push(`/login?returnTo=/join/${token}`);
      return;
    }

    setLoading(true);

    if (selectedGuest) {
      const result = await claimGuestMember(token, selectedGuest.id);
      setLoading(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      trackEvent("guest_claimed");
      toast.success("Your expenses are now linked to your account!");
      router.push(`/groups/${result.groupId}`);
    } else {
      const result = await joinGroup(token);
      setLoading(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      trackEvent("group_joined", { group_type: groupType });
      toast.success(`You've joined the ${groupLabel.toLowerCase()}!`);
      router.push(`/groups/${result.groupId}`);
    }
  }

  const showClaimSection = isLoggedIn && unclaimedGuests.length > 0;

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {showClaimSection && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="rounded-xl border border-cyan-100 dark:border-cyan-900/40 bg-cyan-50/60 dark:bg-cyan-950/20 p-3.5 space-y-2.5"
          >
            <div>
              <p className="text-xs font-semibold text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Already in this group?
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select your name to link your existing expenses to your account.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {unclaimedGuests.map((guest, i) => {
                const isSelected = selectedGuest?.id === guest.id;
                return (
                  <motion.button
                    key={guest.id}
                    type="button"
                    initial={{ opacity: 0, scale: 0.88 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.07, type: "spring", stiffness: 300, damping: 20 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedGuest(isSelected ? null : guest)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                      isSelected
                        ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md shadow-cyan-500/25 border border-transparent"
                        : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-cyan-300 dark:hover:border-cyan-700 hover:text-cyan-700 dark:hover:text-cyan-400"
                    }`}
                  >
                    <motion.span animate={{ rotate: isSelected ? 0 : 0 }} className="shrink-0">
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <User className="w-3.5 h-3.5 opacity-50" />
                      )}
                    </motion.span>
                    {guest.guestName}
                  </motion.button>
                );
              })}
            </div>

            <AnimatePresence>
              {selectedGuest && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5 overflow-hidden"
                >
                  <Check className="w-3.5 h-3.5 text-teal-500 mt-0.5 shrink-0" />
                  <span>
                    {userDisplayName ? (
                      <>
                        Your name will update from{" "}
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          &ldquo;{selectedGuest.guestName}&rdquo;
                        </span>{" "}
                        to{" "}
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          &ldquo;{userDisplayName}&rdquo;
                        </span>
                      </>
                    ) : (
                      <>
                        Your account will be linked to{" "}
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          &ldquo;{selectedGuest.guestName}&rdquo;
                        </span>
                      </>
                    )}
                  </span>
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={handleJoin}
        disabled={loading}
        whileTap={{ scale: 0.98 }}
        className="w-full py-2.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-medium rounded-xl shadow-md shadow-cyan-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }}
              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
            />
            Joining…
          </>
        ) : !isLoggedIn ? (
          "Sign in to join"
        ) : selectedGuest ? (
          <>
            Join as {userDisplayName ?? selectedGuest.guestName}
            <ArrowRight className="w-4 h-4" />
          </>
        ) : (
          `Join this ${groupLabel.toLowerCase()}`
        )}
      </motion.button>

      {showClaimSection && !selectedGuest && (
        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          Not listed above?{" "}
          <span className="text-slate-500 dark:text-slate-400">
            You&apos;ll join as a new member.
          </span>
        </p>
      )}
    </div>
  );
}
