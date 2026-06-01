"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createCircleSchema, type CircleMember } from "@/lib/validations/circle";
import { createCircle } from "@/app/actions/circle";
import { SUPPORTED_CURRENCIES } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import {
  ArrowLeft, ArrowRight, Plus, Trash2, RotateCcw,
  MessageCircle, Copy, Check, ExternalLink,
  Repeat2, Target, Coins, Waves,
} from "lucide-react";

interface Props {
  firstName: string | null;
}

type FormStep = 1 | 2 | 3;

// Explicit form values type — avoids zodResolver generic complexity with superRefine
type FormValues = {
  circleMode: "recurring" | "one_time";
  contributionSubType: "fixed" | "flexi";
  name: string;
  defaultCurrency: string;
  contributionAmount: number | undefined;
  contributionDay: number;
  targetAmount: number | undefined;
  eventDate: string | undefined;
  upiId: string | undefined;
  contributionPrivacy: "public" | "admin_only";
  walletExpensesEnabled: boolean;
};

interface CreatedCircle {
  groupId: string;
  shareToken: string;
  creatorName: string;
}

// ── Invite message generators ─────────────────────────────────────────────────

function buildRecurringMessage(
  name: string,
  amount: number,
  currency: string,
  contributionDay: number,
  creatorName: string,
  upiId: string | undefined,
  joinUrl: string,
): string {
  const upiLine = upiId
    ? `\nPay ₹${amount}: upi://pay?pa=${upiId}&am=${amount}&cu=${currency}&tn=${encodeURIComponent(name)}`
    : "";
  return `Hey! ${creatorName} added you to ${name} on Clear 💰\n₹${amount}/month · Due on the ${ordinal(contributionDay)} of each month${upiLine}\nTrack it on Clear: ${joinUrl}`;
}

function buildOneTimeMessage(
  name: string,
  targetAmount: number | undefined,
  currency: string,
  eventDate: string | undefined,
  contributionAmount: number | undefined,
  creatorName: string,
  upiId: string | undefined,
  joinUrl: string,
): string {
  const icon = targetAmount ? "🎯" : "💸";
  const meta: string[] = [];
  if (targetAmount) meta.push(`Target: ₹${targetAmount}`);
  if (eventDate) {
    const deadline = new Date(eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    meta.push(`Deadline: ${deadline}`);
  }
  const metaLine = meta.length ? `\n${meta.join(" · ")}` : "";
  const shareLine = contributionAmount
    ? `\nYour share: ₹${contributionAmount}`
    : "\nContribute any amount you choose";
  const upiLine = upiId && contributionAmount
    ? `\nPay: upi://pay?pa=${upiId}&am=${contributionAmount}&cu=${currency}&tn=${encodeURIComponent(name)}`
    : "";
  return `Hey! We're chipping in for ${name} ${icon}${metaLine}${shareLine}${upiLine}\nTrack the fund: ${joinUrl}`;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ── Main component ────────────────────────────────────────────────────────────

export function CreateCircleForm({ firstName }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<FormStep>(1);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedCircle | null>(null);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [copied, setCopied] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createCircleSchema) as any,
    defaultValues: {
      defaultCurrency: "INR",
      contributionDay: 1,
      contributionPrivacy: "public",
      walletExpensesEnabled: true,
      contributionSubType: "fixed",
    } as Partial<FormValues>,
  });

  const circleMode = watch("circleMode");
  const contributionSubType = watch("contributionSubType") ?? "fixed";
  const name = watch("name") ?? "";
  const contributionAmount = watch("contributionAmount");
  const contributionDay = watch("contributionDay") ?? 1;
  const targetAmount = watch("targetAmount");
  const eventDate = watch("eventDate") ?? "";
  const upiId = watch("upiId") ?? "";
  const defaultCurrency = watch("defaultCurrency") ?? "INR";

  const isFixed   = circleMode === "one_time" && contributionSubType === "fixed";
  const isFlexi   = circleMode === "one_time" && contributionSubType === "flexi";
  const isOneTime = circleMode === "one_time";

  // ── Mode-aware colour tokens (reactive to circleMode selection) ───────────
  const modeGrad      = isOneTime ? "from-amber-500 to-orange-500"   : "from-indigo-500 to-violet-600";
  const modeGradBtn   = isOneTime
    ? "from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/20"
    : "from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-indigo-500/20";
  const modeIconShadow = isOneTime ? "shadow-amber-500/25"  : "shadow-indigo-500/25";
  const modeBadge      = isOneTime
    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
    : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300";
  const modeLinkText   = isOneTime ? "text-amber-600 dark:text-amber-400" : "text-indigo-600 dark:text-indigo-400";
  const modeHover      = isOneTime ? "hover:text-amber-600 dark:hover:text-amber-400" : "hover:text-indigo-600 dark:hover:text-indigo-400";
  const modeFocus      = isOneTime ? "focus:ring-amber-400" : "focus:ring-indigo-400";
  const modeAccent     = isOneTime ? "accent-amber-500"     : "accent-indigo-500";
  const modeAddBtn     = isOneTime
    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/50"
    : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/50";
  const modeInfoBox    = isOneTime
    ? "bg-amber-50/60 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-800/30"
    : "bg-indigo-50/60 dark:bg-indigo-900/20 border border-indigo-200/50 dark:border-indigo-800/30";
  const modePrivacy    = isOneTime
    ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
    : "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300";

  // ── Step 1: mode selection ──────────────────────────────────────────────────

  function selectMode(mode: "recurring" | "one_time") {
    setValue("circleMode", mode);
    setStep(2);
  }

  function selectSubType(subType: "fixed" | "flexi") {
    setValue("contributionSubType", subType);
    // Clear amount when switching to Flexi so stale value isn't submitted
    if (subType === "flexi") {
      setValue("contributionAmount", undefined);
    }
  }

  // ── Member management ───────────────────────────────────────────────────────

  function addMember() {
    const trimmed = newMemberName.trim();
    if (!trimmed) return;
    setMembers((prev) => [...prev, { name: trimmed, phone: newMemberPhone.trim() || undefined }]);
    setNewMemberName("");
    setNewMemberPhone("");
  }

  function removeMember(index: number) {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Form submit (Step 2 → create group → Step 3) ───────────────────────────

  async function onSubmit(data: FormValues) {
    setSubmitting(true);
    // Strip UI-only contributionSubType; clear amount for Flexi before sending to action
    const { contributionSubType: subType, ...rest } = data;
    const actionData = {
      ...rest,
      contributionAmount: subType === "flexi" ? undefined : rest.contributionAmount,
      members,
    };

    let result: Awaited<ReturnType<typeof createCircle>>;
    try {
      result = await createCircle(actionData);
    } catch (e) {
      setSubmitting(false);
      toast.error("Failed to create Circle. Please try again.");
      console.error("[createCircle]", e);
      return;
    }
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error ?? "Failed to create Circle.");
      return;
    }

    trackEvent("group_created", { group_type: "circle", circle_mode: data.circleMode });
    setCreated({ groupId: result.groupId, shareToken: result.shareToken, creatorName: result.creatorName });
    setStep(3);
  }

  // ── Step 3: invite message ──────────────────────────────────────────────────

  const joinUrl = created
    ? `${process.env.NEXT_PUBLIC_APP_URL}/join/${created.shareToken}`
    : "";

  const inviteMessage = created && circleMode === "recurring"
    ? buildRecurringMessage(
        name,
        Number(contributionAmount),
        defaultCurrency,
        Number(contributionDay),
        created.creatorName,
        upiId || undefined,
        joinUrl,
      )
    : created && circleMode === "one_time"
    ? buildOneTimeMessage(
        name,
        targetAmount ? Number(targetAmount) : undefined,
        defaultCurrency,
        eventDate || undefined,
        contributionAmount ? Number(contributionAmount) : undefined,
        created.creatorName,
        upiId || undefined,
        joinUrl,
      )
    : "";

  function copyMessage() {
    navigator.clipboard.writeText(inviteMessage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(inviteMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  // ── Step 1: mode selection ──────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Choose how your Circle works
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Recurring mode card */}
          <button
            type="button"
            onClick={() => selectMode("recurring")}
            className="group text-left p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700
                       bg-white/60 dark:bg-slate-800/60 hover:border-indigo-400 dark:hover:border-indigo-500
                       hover:bg-indigo-50/60 dark:hover:bg-indigo-900/20 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600
                            flex items-center justify-center mb-3 shadow-md shadow-indigo-500/25
                            group-hover:scale-105 transition-transform">
              <Repeat2 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">
              Recurring
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-snug">
              Fixed contributions every month. Cricket fund, office kitty, RWA, savings circle.
            </p>
          </button>

          {/* One-time mode card */}
          <button
            type="button"
            onClick={() => selectMode("one_time")}
            className="group text-left p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700
                       bg-white/60 dark:bg-slate-800/60 hover:border-amber-400 dark:hover:border-amber-500
                       hover:bg-amber-50/60 dark:hover:bg-amber-900/20 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500
                            flex items-center justify-center mb-3 shadow-md shadow-amber-500/25
                            group-hover:scale-105 transition-transform">
              <Target className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">
              One-time
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-snug">
              Collect toward a target by a deadline. Birthday gift, farewell, trip fund, wedding pool.
            </p>
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3: invite (post-creation) ─────────────────────────────────────────
  if (step === 3 && created) {
    return (
      <div className="space-y-5">
        {/* Success header */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${modeGrad}
                          flex items-center justify-center shadow-md ${modeIconShadow} shrink-0`}>
            <Coins className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className={`text-xs ${modeLinkText} font-medium uppercase tracking-wide`}>
              Circle created
            </p>
            <p className="text-base font-semibold text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>
              {name}
            </p>
          </div>
        </div>

        {/* Invite message preview */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
            Invite message
          </label>
          <div className="relative">
            <pre className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700
                            bg-white/60 dark:bg-slate-800/60 text-sm text-slate-700 dark:text-slate-200
                            whitespace-pre-wrap break-all leading-relaxed font-sans">
              {inviteMessage}
            </pre>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={shareWhatsApp}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
                       bg-[#25D366] hover:bg-[#1DB954] text-white font-medium text-sm
                       shadow-md shadow-green-500/20 transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            Share via WhatsApp ↗
          </button>

          <button
            type="button"
            onClick={copyMessage}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
                       border border-slate-200 dark:border-slate-700
                       text-slate-600 dark:text-slate-300 font-medium text-sm
                       hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy message"}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          <span className="text-xs text-slate-400 dark:text-slate-500">or</span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* Skip to circle */}
        <button
          type="button"
          onClick={() => router.replace(`/groups/${created.groupId}`)}
          className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl
                     bg-gradient-to-br ${modeGradBtn}
                     text-white font-medium text-sm shadow-md transition-all`}
        >
          Go to my Circle
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-xs text-center text-slate-400 dark:text-slate-500">
          You can add members and record contributions from the Circle dashboard
        </p>
      </div>
    );
  }

  // ── Step 2: details form ────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Back to mode selection */}
      <button
        type="button"
        onClick={() => setStep(1)}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400
                   hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {circleMode === "recurring" ? "Recurring" : "One-time"}
      </button>

      {/* Mode badge */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${modeBadge}`}>
          {circleMode === "recurring" ? <Repeat2 className="w-3 h-3" /> : <Target className="w-3 h-3" />}
          {circleMode === "recurring" ? "Recurring · monthly" : "One-time"}
        </span>
      </div>

      {/* Circle name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
          Circle name <span className="text-red-400">*</span>
        </label>
        <input
          {...register("name")}
          placeholder={circleMode === "recurring" ? "e.g. Cricket Club Circle" : "e.g. Priya's 30th 🎂"}
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700
                     bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100
                     focus:outline-none focus:ring-2 ${modeFocus} focus:border-transparent
                     placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
      </div>

      {/* ── Recurring: essential fields ──────────────────────────────────── */}
      {circleMode === "recurring" && (
        <>
          {/* Amount + currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Amount / month <span className="text-red-400">*</span>
              </label>
              <input
                {...register("contributionAmount")}
                type="number"
                inputMode="decimal"
                min="1"
                step="1"
                placeholder="500"
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700
                           bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100
                           focus:outline-none focus:ring-2 ${modeFocus} focus:border-transparent
                           placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              {errors.contributionAmount && (
                <p className="mt-1 text-xs text-red-500">{errors.contributionAmount.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Currency
              </label>
              <select
                {...register("defaultCurrency")}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700
                           bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100
                           focus:outline-none focus:ring-2 ${modeFocus} focus:border-transparent"
              >
                {SUPPORTED_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Due day slider */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
              Due on the{" "}
              <span className={`${modeLinkText} font-semibold`}>
                {ordinal(Number(contributionDay))}
              </span>{" "}
              of each month
            </label>
            <input
              {...register("contributionDay")}
              type="range"
              min="1"
              max="28"
              step="1"
              className={`w-full ${modeAccent}`}
            />
            <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              <span>1st</span>
              <span>28th</span>
            </div>
          </div>

          {/* More options — UPI + wallet */}
          <div>
            <button
              type="button"
              onClick={() => setShowMoreOptions((v) => !v)}
              className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500
                         ${modeHover} transition-colors"
            >
              <span>{showMoreOptions ? "▾" : "▸"}</span>
              {showMoreOptions ? "Fewer options" : "More options"}
            </button>

            {showMoreOptions && (
              <div className="mt-3 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    Your UPI ID{" "}
                    <span className="text-slate-400 dark:text-slate-500 font-normal text-xs">(optional — enables Pay Now button)</span>
                  </label>
                  <input
                    {...register("upiId")}
                    placeholder="you@upi"
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700
                               bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100
                               focus:outline-none focus:ring-2 ${modeFocus} focus:border-transparent
                               placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>

                {/* Wallet expenses toggle */}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Track wallet expenses</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      Disable for savings-only circles that don&apos;t spend from the wallet
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setValue("walletExpensesEnabled", !watch("walletExpensesEnabled"))}
                    className={`relative shrink-0 w-10 h-6 rounded-full transition-colors overflow-hidden ${
                      watch("walletExpensesEnabled") ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-600"
                    }`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      watch("walletExpensesEnabled") ? "translate-x-4" : "translate-x-0"
                    }`} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── One-time: Fixed / Flexi picker + fields ──────────────────────── */}
      {circleMode === "one_time" && (
        <>
          {/* Sub-type picker */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
              How will people contribute?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => selectSubType("fixed")}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  isFixed
                    ? "border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <Target className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <p className="font-semibold leading-none">Fixed</p>
                  <p className="text-xs font-normal opacity-70 mt-0.5">Set amount each</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => selectSubType("flexi")}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  isFlexi
                    ? "border-teal-400 dark:border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <Waves className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <p className="font-semibold leading-none">Flexi</p>
                  <p className="text-xs font-normal opacity-70 mt-0.5">Any amount</p>
                </div>
              </button>
            </div>
            {isFlexi && (
              <p className="mt-2 text-xs text-teal-600 dark:text-teal-400">
                Members contribute whatever amount they choose — great for casual collections.
              </p>
            )}
          </div>

          {/* Fixed: amount per person (required) + currency */}
          {isFixed && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                  Amount per person <span className="text-red-400">*</span>
                </label>
                <input
                  {...register("contributionAmount")}
                  type="number"
                  inputMode="decimal"
                  min="1"
                  step="1"
                  placeholder="500"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700
                             bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100
                             focus:outline-none focus:ring-2 ${modeFocus} focus:border-transparent
                             placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                {errors.contributionAmount && (
                  <p className="mt-1 text-xs text-red-500">{errors.contributionAmount.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                  Currency
                </label>
                <select
                  {...register("defaultCurrency")}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700
                             bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100
                             focus:outline-none focus:ring-2 ${modeFocus} focus:border-transparent"
                >
                  {SUPPORTED_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Fixed: total target (optional) */}
          {isFixed && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Total target{" "}
                <span className="text-slate-400 dark:text-slate-500 font-normal text-xs">(optional)</span>
              </label>
              <input
                {...register("targetAmount")}
                type="number"
                inputMode="decimal"
                min="1"
                step="1"
                placeholder="e.g. 10000"
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700
                           bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100
                           focus:outline-none focus:ring-2 ${modeFocus} focus:border-transparent
                           placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          )}

          {/* Flexi: soft target + currency */}
          {isFlexi && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                  Soft target{" "}
                  <span className="text-slate-400 dark:text-slate-500 font-normal text-xs">(optional)</span>
                </label>
                <input
                  {...register("targetAmount")}
                  type="number"
                  inputMode="decimal"
                  min="1"
                  step="1"
                  placeholder="e.g. 10000"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700
                             bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100
                             focus:outline-none focus:ring-2 ${modeFocus} focus:border-transparent
                             placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                  Currency
                </label>
                <select
                  {...register("defaultCurrency")}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700
                             bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100
                             focus:outline-none focus:ring-2 ${modeFocus} focus:border-transparent"
                >
                  {SUPPORTED_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* More options — deadline, privacy, UPI, wallet */}
          <div>
            <button
              type="button"
              onClick={() => setShowMoreOptions((v) => !v)}
              className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500
                         ${modeHover} transition-colors"
            >
              <span>{showMoreOptions ? "▾" : "▸"}</span>
              {showMoreOptions ? "Fewer options" : "More options"}
            </button>

            {showMoreOptions && (
              <div className="mt-3 space-y-4">
                {/* Deadline */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    Deadline{" "}
                    <span className="text-slate-400 dark:text-slate-500 font-normal text-xs">(optional)</span>
                  </label>
                  <input
                    {...register("eventDate")}
                    type="date"
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700
                               bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100
                               focus:outline-none focus:ring-2 ${modeFocus} focus:border-transparent"
                  />
                </div>

                {/* Privacy */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    Contribution amounts visible to
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["public", "admin_only"] as const).map((opt) => {
                      const active = watch("contributionPrivacy") === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setValue("contributionPrivacy", opt)}
                          className={`px-3 py-2 rounded-xl border text-sm font-medium transition-all text-left ${
                            active
                              ? modePrivacy
                              : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                          }`}
                        >
                          {opt === "public" ? "All members" : "Organiser only"}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                    {watch("contributionPrivacy") === "admin_only"
                      ? "Only you can see who contributed how much — good for colleague groups"
                      : "Everyone can see the full contribution list"}
                  </p>
                </div>

                {/* UPI */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    Your UPI ID{" "}
                    <span className="text-slate-400 dark:text-slate-500 font-normal text-xs">(optional — enables Pay Now button)</span>
                  </label>
                  <input
                    {...register("upiId")}
                    placeholder="you@upi"
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700
                               bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100
                               focus:outline-none focus:ring-2 ${modeFocus} focus:border-transparent
                               placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>

                {/* Wallet expenses toggle */}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Track wallet expenses</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      Disable for pools that just collect and distribute without logging spends
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setValue("walletExpensesEnabled", !watch("walletExpensesEnabled"))}
                    className={`relative shrink-0 w-10 h-6 rounded-full transition-colors overflow-hidden ${
                      watch("walletExpensesEnabled") ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-600"
                    }`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      watch("walletExpensesEnabled") ? "translate-x-4" : "translate-x-0"
                    }`} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Add initial members ──────────────────────────────────────────────── */}
      <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Add members{" "}
            <span className="text-slate-400 dark:text-slate-500 font-normal text-xs">(optional — can be added later)</span>
          </p>
          {members.length > 0 && (
            <span className={`text-xs ${modeLinkText} font-medium`}>
              {members.length} added
            </span>
          )}
        </div>

        {/* Existing members list */}
        {members.length > 0 && (
          <div className="space-y-2">
            {members.map((m, i) => (
              <div key={i} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg ${modeInfoBox}`}>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{m.name}</p>
                  {m.phone && (
                    <p className="text-xs text-slate-400 dark:text-slate-500">{m.phone}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeMember(i)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400
                             hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add member inputs */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMember())}
            placeholder="Name"
            className="flex-1 min-w-0 px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700
                       bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100
                       focus:outline-none focus:ring-2 ${modeFocus} focus:border-transparent
                       placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <input
            type="tel"
            value={newMemberPhone}
            onChange={(e) => setNewMemberPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMember())}
            placeholder="Phone"
            className="w-20 sm:w-32 px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700
                       bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100
                       focus:outline-none focus:ring-2 ${modeFocus} focus:border-transparent
                       placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={addMember}
            disabled={!newMemberName.trim()}
            className={`px-3 py-2 rounded-xl ${modeAddBtn} font-medium text-sm
                       disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Members without Clear accounts will appear as guests — you record their contributions.
        </p>
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="flex-1 py-3 text-center text-sm font-medium rounded-xl border border-slate-200
                     dark:border-slate-700 text-slate-600 dark:text-slate-300
                     hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={submitting}
          className={`flex-1 py-3 bg-gradient-to-br ${modeGradBtn} text-white font-medium rounded-xl
                     shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2`}
        >
          {submitting ? (
            <><RotateCcw className="w-4 h-4 animate-spin" />Creating…</>
          ) : (
            <>Create Circle<ExternalLink className="w-3.5 h-3.5" /></>
          )}
        </button>
      </div>
    </form>
  );
}
