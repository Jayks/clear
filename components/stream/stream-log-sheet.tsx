"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet } from "@/components/shared/sheet";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, ChevronLeft, Plus, Search, Loader2, Check, Copy, MessageCircle } from "lucide-react";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { useSheetDismiss } from "@/hooks/use-sheet-dismiss";
import { hapticSuccess } from "@/lib/haptics";
import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { buildStreamConfirmMessage } from "@/lib/stream/share-message";
import {
  logStream,
  deleteStream,
  getRecentStreamCounterpartsAction,
  searchStreamableUsersAction,
  fetchLastStreamContextAction,
} from "@/app/actions/stream";
import type { StreamDirection } from "@/lib/validations/stream";

// ── Types ─────────────────────────────────────────────────────────────────────

type PersonOption = {
  personId: string;
  type: "user" | "guest";
  name: string;
};

type LastContext = {
  amount: number;
  currency: string;
  note: string | null;
  direction: string;
  createdAt: Date | string;
};

type Step = "pick-person" | "add-guest" | "enter-amount" | "share";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-selected person — skips directly to the amount step. */
  preselectedPerson?: PersonOption;
  /** Creator's display name — used in the post-log "share with guest" message. */
  currentUserName?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StreamLogSheet({ isOpen, onClose, preselectedPerson, currentUserName }: Props) {
  const router = useRouter();

  // ── Step state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("pick-person");
  const [selected, setSelected] = useState<PersonOption | null>(preselectedPerson ?? null);

  // ── Pick-person state ───────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // ── Add-guest state ─────────────────────────────────────────────────────────
  const [guestName, setGuestName]   = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  // ── Amount step state ───────────────────────────────────────────────────────
  const [direction, setDirection]   = useState<StreamDirection>("they_owe_me");
  const [amountStr, setAmountStr]   = useState("");
  const [note, setNote]             = useState("");
  const [lastContext, setLastContext] = useState<LastContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);

  // ── Share step state (guest counterparts only) ─────────────────────────────
  const [confirmUrl, setConfirmUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ── Submission ──────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);

  useSheetDismiss(isOpen, onClose);

  const scrollBodyRef = useRef<HTMLDivElement>(null);

  // Reset everything when sheet closes
  useEffect(() => {
    if (!isOpen) {
      clearTimeout(debounceRef.current); // M-6: cancel any in-flight search debounce
      const timer = setTimeout(() => {
        setStep(preselectedPerson ? "enter-amount" : "pick-person");
        setSelected(preselectedPerson ?? null);
        setQuery("");
        setPeople([]);
        setGuestName("");
        setGuestEmail("");
        setDirection("they_owe_me");
        setAmountStr("");
        setNote("");
        setLastContext(null);
        setConfirmUrl(null);
        setCopied(false);
      }, 300); // wait for exit animation
      return () => clearTimeout(timer);
    }
  }, [isOpen, preselectedPerson]);

  // When the sheet opens with a preselected person, jump directly to the amount
  // step and fetch the last-context hint. The reset effect (above) handles
  // restoring this when the sheet next closes.
  useEffect(() => {
    if (isOpen && preselectedPerson) {
      setStep("enter-amount");
      setSelected(preselectedPerson);
      if (preselectedPerson.personId) {
        setContextLoading(true);
        fetchLastStreamContextAction(preselectedPerson.personId)
          .then(setLastContext)
          .catch(() => {})
          .finally(() => setContextLoading(false));
      }
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  // ^ depend only on isOpen — preselectedPerson is stable for the lifetime of an
  //   open session (set before isOpen becomes true, cleared after it becomes false).

  // Load recents when sheet opens on pick-person step
  useEffect(() => {
    if (isOpen && step === "pick-person" && people.length === 0) {
      setSearching(true);
      getRecentStreamCounterpartsAction()
        .then(setPeople)
        .catch(() => {}) // silent — offline or error just leaves the list empty
        .finally(() => setSearching(false));
    }
  }, [isOpen, step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  function handleQueryChange(value: string) {
    setQuery(value);
    clearTimeout(debounceRef.current);
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      searchStreamableUsersAction(value)
        .then(setPeople)
        .catch(() => {}) // silent — offline or error just leaves results empty
        .finally(() => setSearching(false));
    }, 300);
  }

  // Select a person from the list → jump to amount step
  async function handleSelectPerson(person: PersonOption) {
    setSelected(person);
    setStep("enter-amount");
    setContextLoading(true);
    fetchLastStreamContextAction(person.personId)
      .then(setLastContext)
      .catch(() => {}) // non-critical — context hint is best-effort
      .finally(() => setContextLoading(false));
  }

  // Confirm guest creation → jump to amount step
  function handleAddGuest() {
    if (!guestName.trim()) return;
    const pseudo: PersonOption = {
      personId: "",          // no ID yet — created server-side on submit
      type: "guest",
      name: guestName.trim(),
    };
    setSelected(pseudo);
    setStep("enter-amount");
    setLastContext(null);
  }

  // Submit the stream log
  async function handleSubmit() {
    const amount = parseFloat(amountStr);
    if (!selected || !amount || amount <= 0) return;

    setSubmitting(true);
    try {
      const result = await logStream({
        // Resolve which counterpart field to use
        counterpartId:      selected.type === "user" && selected.personId ? selected.personId : undefined,
        counterpartGuestId: selected.type === "guest" && selected.personId ? selected.personId : undefined,
        // Inline guest creation if no personId yet
        guestName:  selected.type === "guest" && !selected.personId ? selected.name : undefined,
        guestEmail: selected.type === "guest" && !selected.personId && guestEmail ? guestEmail : undefined,
        amount,
        currency: DEFAULT_CURRENCY,
        direction,
        note: note.trim() || undefined,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      hapticSuccess();

      const amountLabel = formatCurrency(amount, DEFAULT_CURRENCY);
      const dirLabel    = direction === "they_owe_me"
        ? `${selected.name} owes you ${amountLabel}`
        : `You owe ${selected.name} ${amountLabel}`;

      // Guest counterparts with a confirm link get a "share now" step instead of
      // an immediate close — "log first, share second". Clear-user counterparts
      // keep closing right away (they already got a push notification).
      const isGuestWithLink = selected.type === "guest" && !!result.confirmUrl;

      // Toast with 4-second undo
      const streamId = result.streamId;
      toast.success(dirLabel, {
        duration: 4000,
        action: {
          label: "Undo",
          onClick: async () => {
            const undoResult = await deleteStream(streamId);
            if (undoResult.ok) {
              toast.success("Entry removed");
              onClose(); // also closes the share step, if it was showing
              router.refresh();
            } else {
              toast.error("Couldn't undo — entry may already be confirmed");
            }
          },
        },
      });

      router.refresh();

      if (isGuestWithLink) {
        setConfirmUrl(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}${result.confirmUrl}`);
        setStep("share");
      } else {
        onClose();
      }
    } catch (err) {
      console.error("logStream error:", err);
      toast.error("Couldn't save entry — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Share step actions (guest counterparts only) ───────────────────────────

  function handleShareWhatsApp() {
    if (!confirmUrl || !selected) return;
    const msg = buildStreamConfirmMessage({
      creatorFirstName: currentUserName?.split(" ")[0] ?? "Someone",
      amount:           parseFloat(amountStr),
      currency:         DEFAULT_CURRENCY,
      note:             note.trim() || null,
      direction,
      confirmUrl,
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  }

  function handleCopyLink() {
    if (!confirmUrl) return;
    navigator.clipboard.writeText(confirmUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const canSubmit = !!selected && parseFloat(amountStr) > 0 && !submitting;

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      scrollRef={scrollBodyRef}
      panelClassName="flex flex-col max-h-[90vh]"
      ariaLabel="New entry"
    >
            {/* Header */}
            <SheetHeader step={step} selectedName={selected?.name} onBack={() => {
              if (step === "enter-amount") { setStep("pick-person"); setSelected(null); }
              if (step === "add-guest")    { setStep("pick-person"); }
            }} onClose={onClose} />

            {/* Scrollable body */}
            <div ref={scrollBodyRef} className="overflow-y-auto flex-1 px-4 pb-8">
              <AnimatePresence mode="wait" initial={false}>
                {step === "pick-person" && (
                  <motion.div key="pick-person" {...slideAnim}>
                    <PickPersonStep
                      query={query}
                      people={people}
                      searching={searching}
                      onQueryChange={handleQueryChange}
                      onSelect={handleSelectPerson}
                      onAddGuest={() => setStep("add-guest")}
                    />
                  </motion.div>
                )}

                {step === "add-guest" && (
                  <motion.div key="add-guest" {...slideAnim}>
                    <AddGuestStep
                      name={guestName}
                      email={guestEmail}
                      onNameChange={setGuestName}
                      onEmailChange={setGuestEmail}
                      onSubmit={handleAddGuest}
                    />
                  </motion.div>
                )}

                {step === "enter-amount" && selected && (
                  <motion.div key="enter-amount" {...slideAnim}>
                    <EnterAmountStep
                      personName={selected.name}
                      direction={direction}
                      amountStr={amountStr}
                      note={note}
                      lastContext={lastContext}
                      contextLoading={contextLoading}
                      onDirectionChange={setDirection}
                      onAmountChange={setAmountStr}
                      onNoteChange={setNote}
                      onContextApply={(ctx) => {
                        setNote(ctx.note ?? "");
                        setDirection(ctx.direction as StreamDirection);
                      }}
                      submitting={submitting}
                      canSubmit={canSubmit}
                      onSubmit={handleSubmit}
                    />
                  </motion.div>
                )}

                {step === "share" && selected && (
                  <motion.div key="share" {...slideAnim}>
                    <ShareStep
                      guestName={selected.name}
                      onWhatsAppShare={handleShareWhatsApp}
                      onCopyLink={handleCopyLink}
                      copied={copied}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
    </Sheet>
  );
}

// ── Step animation ────────────────────────────────────────────────────────────

const slideAnim = {
  initial:    { opacity: 0, x: 16 },
  animate:    { opacity: 1, x: 0 },
  exit:       { opacity: 0, x: -16 },
  transition: { duration: 0.15 },
};

// ── Sheet header ──────────────────────────────────────────────────────────────

function SheetHeader({
  step,
  selectedName,
  onBack,
  onClose,
}: {
  step: Step;
  selectedName?: string;
  onBack: () => void;
  onClose: () => void;
}) {
  const showBack = step !== "pick-person" && step !== "share";
  const title =
    step === "pick-person"  ? "New entry" :
    step === "add-guest"    ? "Add a person" :
    step === "share"        ? "Logged ✓" :
    selectedName            ? `Entry with ${selectedName}` : "New entry";

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
      {showBack ? (
        <button
          onClick={onBack}
          aria-label="Back"
          className="w-8 h-8 rounded-lg flex items-center justify-center
                     text-slate-400 hover:text-slate-600 dark:hover:text-slate-200
                     hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      ) : (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500
                        flex items-center justify-center shrink-0">
          <ArrowLeftRightIcon className="w-4 h-4 text-white" />
        </div>
      )}
      <span
        className="flex-1 text-base font-semibold text-slate-800 dark:text-slate-100 truncate"
        style={{ fontFamily: "var(--font-fraunces)" }}
      >
        {title}
      </span>
      <button
        onClick={onClose}
        aria-label="Close"
        className="w-8 h-8 rounded-lg flex items-center justify-center
                   text-slate-400 hover:text-slate-600 dark:hover:text-slate-200
                   hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Inline SVG to avoid re-import of ArrowLeftRight (already imported at top)
function ArrowLeftRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4m4 4H4" />
    </svg>
  );
}

// ── Pick person step ──────────────────────────────────────────────────────────

function PickPersonStep({
  query,
  people,
  searching,
  onQueryChange,
  onSelect,
  onAddGuest,
}: {
  query: string;
  people: PersonOption[];
  searching: boolean;
  onQueryChange: (q: string) => void;
  onSelect: (p: PersonOption) => void;
  onAddGuest: () => void;
}) {
  return (
    <div className="pt-3 space-y-4">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          autoFocus
          type="text"
          placeholder="Search contacts or guests…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700
                     bg-white/60 dark:bg-slate-800/60 text-sm text-slate-800 dark:text-slate-100
                     placeholder:text-slate-400 focus:outline-none focus:ring-2
                     focus:ring-blue-400/50 dark:focus:ring-blue-600/50 transition"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
        )}
      </div>

      {/* People list */}
      {people.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
            {query ? "Results" : "Recents"}
          </p>
          {people.map((person) => (
            <button
              key={person.personId || person.name}
              onClick={() => onSelect(person)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                         hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-left"
            >
              <MemberAvatar name={person.name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                  {person.name}
                </p>
                {person.type === "guest" && (
                  <p className="text-[11px] text-slate-400">Guest</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {!searching && people.length === 0 && query.length > 0 && (
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
          No one found. Add them as a new guest below.
        </p>
      )}

      {/* Add new guest */}
      <button
        onClick={onAddGuest}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                   border border-dashed border-slate-300 dark:border-slate-700
                   hover:border-blue-400 dark:hover:border-blue-600
                   hover:bg-blue-50/50 dark:hover:bg-blue-950/30
                   transition-colors text-left group"
      >
        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800
                        flex items-center justify-center shrink-0
                        group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
          <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500" />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">
          Add someone new (name + optional email)
        </p>
      </button>
    </div>
  );
}

// ── Add guest step ────────────────────────────────────────────────────────────

function AddGuestStep({
  name,
  email,
  onNameChange,
  onEmailChange,
  onSubmit,
}: {
  name: string;
  email: string;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="pt-3 space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
          Name <span className="text-red-400">*</span>
        </label>
        <input
          autoFocus
          type="text"
          placeholder="e.g. Rahul, Mom, Ankit"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700
                     bg-white/60 dark:bg-slate-800/60 text-sm text-slate-800 dark:text-slate-100
                     placeholder:text-slate-400 focus:outline-none focus:ring-2
                     focus:ring-blue-400/50 transition"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
          Email <span className="text-slate-400 font-normal">(optional — for your reference)</span>
        </label>
        <input
          type="email"
          inputMode="email"
          placeholder="they@example.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700
                     bg-white/60 dark:bg-slate-800/60 text-sm text-slate-800 dark:text-slate-100
                     placeholder:text-slate-400 focus:outline-none focus:ring-2
                     focus:ring-blue-400/50 transition"
        />
      </div>
      <button
        onClick={onSubmit}
        disabled={!name.trim()}
        className="w-full py-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500
                   hover:from-blue-600 hover:to-indigo-600
                   text-white font-semibold text-sm transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed
                   shadow-md shadow-blue-500/20"
      >
        Next →
      </button>
    </div>
  );
}

// ── Share step (guest counterparts only) ──────────────────────────────────────
// Modeled on AddMembersSheet's `mode === "share"` block — the closest existing
// in-house precedent for "just created something, offer to share it now".
// No separate "Skip" button: the sheet's existing ✕ / Escape / backdrop dismiss
// already covers it, same as AddMembersSheet's share step.

function ShareStep({
  guestName,
  onWhatsAppShare,
  onCopyLink,
  copied,
}: {
  guestName: string;
  onWhatsAppShare: () => void;
  onCopyLink: () => void;
  copied: boolean;
}) {
  const firstName = guestName.split(" ")[0];

  return (
    <div className="pt-3 flex flex-col items-center text-center px-2">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500
                      flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
        <Check className="w-8 h-8 text-white" />
      </div>
      <h3
        className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1"
        style={{ fontFamily: "var(--font-fraunces)" }}
      >
        Logged ✓
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-xs">
        Let {firstName} know — they can confirm it in one tap.
      </p>
      <div className="w-full space-y-2.5">
        <button
          type="button"
          onClick={onWhatsAppShare}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                     bg-[#25D366] hover:bg-[#1ebe5d] text-white text-sm font-medium
                     shadow-md transition-all active:scale-[0.98]"
        >
          <MessageCircle className="w-4 h-4" />
          Share on WhatsApp
        </button>
        <button
          type="button"
          onClick={onCopyLink}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all active:scale-[0.98]",
            copied
              ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
              : "border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800",
          )}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "Link copied!" : "Copy link"}
        </button>
      </div>
    </div>
  );
}

// ── Enter amount step ─────────────────────────────────────────────────────────

function EnterAmountStep({
  personName,
  direction,
  amountStr,
  note,
  lastContext,
  contextLoading,
  onDirectionChange,
  onAmountChange,
  onNoteChange,
  onContextApply,
  submitting,
  canSubmit,
  onSubmit,
}: {
  personName: string;
  direction: StreamDirection;
  amountStr: string;
  note: string;
  lastContext: LastContext | null;
  contextLoading: boolean;
  onDirectionChange: (d: StreamDirection) => void;
  onAmountChange: (v: string) => void;
  onNoteChange: (v: string) => void;
  onContextApply: (ctx: LastContext) => void;
  submitting: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
}) {
  const amountRef = useRef<HTMLInputElement>(null);

  // Auto-focus the amount input when this step mounts
  useEffect(() => {
    const t = setTimeout(() => amountRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  // Only allow digits + one decimal point
  function handleAmountChange(value: string) {
    const cleaned = value.replace(/[^0-9.]/g, "").replace(/^(\d*\.?\d*).*$/, "$1");
    onAmountChange(cleaned);
  }

  const lastDate = lastContext?.createdAt
    ? new Date(lastContext.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
    : null;

  const firstName = personName.split(" ")[0];

  return (
    <div className="pt-4 space-y-5">
      {/* Who paid? — clearer than abstract "direction" */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 px-0.5">
          Who paid?
        </label>
        <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {([
            { value: "they_owe_me" as StreamDirection, label: "Me" },
            { value: "i_owe_them"  as StreamDirection, label: firstName },
          ]).map((opt) => {
            const active = direction === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onDirectionChange(opt.value)}
                className={cn(
                  "flex-1 py-2.5 text-sm font-semibold transition-all",
                  active
                    ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center leading-tight">
          {direction === "they_owe_me"
            ? `You paid — ${firstName} owes you`
            : `${firstName} paid — you owe them`}
        </p>
      </div>

      {/* Amount input */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <span
            className="text-3xl text-slate-400 dark:text-slate-500 font-light"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            ₹
          </span>
          <input
            ref={amountRef}
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={amountStr}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="text-5xl font-bold text-slate-800 dark:text-slate-100 bg-transparent
                       border-none outline-none text-center w-40 tabular-nums
                       placeholder:text-slate-300 dark:placeholder:text-slate-700"
            style={{ fontFamily: "var(--font-fraunces)" }}
          />
        </div>
        {/* Subtle underline cue */}
        <div className="w-32 h-0.5 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>

      {/* Note input */}
      <input
        type="text"
        placeholder="What's it for? (optional)"
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        maxLength={200}
        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700
                   bg-white/60 dark:bg-slate-800/60 text-sm text-slate-800 dark:text-slate-100
                   placeholder:text-slate-400 focus:outline-none focus:ring-2
                   focus:ring-blue-400/50 transition"
      />

      {/* Smart context hint */}
      {contextLoading && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
          <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin shrink-0" />
          <span className="text-xs text-slate-400">Loading last context…</span>
        </div>
      )}
      {!contextLoading && lastContext && (
        <button
          onClick={() => onContextApply(lastContext)}
          className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl
                     bg-slate-50 dark:bg-slate-800/40 hover:bg-blue-50/60
                     dark:hover:bg-blue-950/30 transition-colors text-left"
        >
          <span className="text-base shrink-0 mt-0.5">💡</span>
          <div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Last time:{" "}
              <span className="font-bold">
                {formatCurrency(lastContext.amount, lastContext.currency)}
                {lastContext.note ? ` for ${lastContext.note}` : ""}
              </span>
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              {lastDate} · {lastContext.direction === "they_owe_me" ? "they owed you" : "you owed them"}
              {" · Tap to reuse"}
            </p>
          </div>
        </button>
      )}

      {/* Submit */}
      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        className="w-full py-3.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500
                   hover:from-blue-600 hover:to-indigo-600
                   text-white font-semibold text-sm transition-all
                   disabled:opacity-40 disabled:cursor-not-allowed
                   shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
      >
        {submitting ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Logging…</>
        ) : (
          "Log entry →"
        )}
      </button>
    </div>
  );
}
