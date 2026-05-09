"use client";

import { useState, useCallback } from "react";
import { Zap, X, Sparkles, Loader2, CalendarDays, Mic, MicOff } from "lucide-react";
import type { TripMember } from "@/lib/db/schema/trip-members";
import type { ParsedExpense } from "@/lib/parser/parse-expense";
import { parseExpenseText } from "@/lib/parser/parse-expense";
import { parseExpenseWithAI } from "@/app/actions/parse-expense";
import { getMemberName, formatCurrency, formatDate } from "@/lib/utils";
import { getCategory } from "@/lib/categories";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

type ParseMode = "ai" | "basic";

interface Props {
  members: TripMember[];
  currency: string;
  tripStartDate?: string | null;
  tripEndDate?: string | null;
  onParsed: (result: ParsedExpense) => void;
}

export function QuickAddBar({ members, currency, tripStartDate, tripEndDate, onParsed }: Props) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedExpense | null>(null);
  const [loading, setLoading] = useState(false);
  const [parseMode, setParseMode] = useState<ParseMode | null>(null);

  const handleFill = useCallback(async (input?: string) => {
    const value = (input ?? text).trim();
    if (!value) return;
    if (input) setText(input);
    setLoading(true);

    const memberContext = members.map((m) => ({ id: m.id, name: getMemberName(m) }));
    const today = new Date().toISOString().split("T")[0];

    const aiResult = await parseExpenseWithAI(value, memberContext, {
      today,
      tripStart: tripStartDate,
      tripEnd: tripEndDate,
    });
    const result = aiResult ?? parseExpenseText(value, members);
    const mode: ParseMode = aiResult ? "ai" : "basic";

    setParsed(result);
    setParseMode(mode);
    onParsed(result);
    setLoading(false);
  }, [text, members, tripStartDate, tripEndDate, onParsed]);

  const { isSupported: micSupported, isListening, interimTranscript, start, stop } =
    useSpeechRecognition({
      onFinal: (transcript) => handleFill(transcript),
    });

  function handleClear() {
    setText("");
    setParsed(null);
    setParseMode(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleFill();
    }
  }

  const displayText = isListening && interimTranscript ? interimTranscript : text;

  const payer = parsed?.paidByMemberId
    ? members.find((m) => m.id === parsed.paidByMemberId)
    : null;
  const cat = parsed ? getCategory(parsed.category) : null;
  const showSplitChip =
    parsed !== null &&
    (parsed.splitCount !== undefined || (parsed.splitMemberIds && parsed.splitMemberIds.length > 0));

  return (
    <div className="mb-6 rounded-2xl border border-cyan-200 dark:border-cyan-900/50 bg-gradient-to-br from-cyan-50/80 to-teal-50/80 dark:from-cyan-950/40 dark:to-teal-950/40 p-4">
      {/* Header row */}
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-3.5 h-3.5 text-cyan-500" />
        <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-400 uppercase tracking-wide">
          Quick add
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500 normal-case font-normal tracking-normal">
          — type or speak an expense
        </span>

        {parseMode === "ai" && (
          <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500 text-white text-[10px] font-semibold">
            <Sparkles className="w-2.5 h-2.5" />
            AI
          </span>
        )}
        {parseMode === "basic" && (
          <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-semibold">
            <Zap className="w-2.5 h-2.5" />
            Basic
          </span>
        )}
      </div>

      {/* Input row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            value={displayText}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || isListening}
            placeholder={isListening ? "Listening…" : "dinner 2400 raj yesterday split 4"}
            className="w-full px-3 py-2 text-sm rounded-xl border border-cyan-200 dark:border-cyan-900/50 bg-white/70 dark:bg-slate-800/70 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-60 pr-10"
          />
          {/* Mic button — inside the input on the right */}
          {micSupported && (
            <button
              type="button"
              onClick={isListening ? stop : start}
              disabled={loading}
              title={isListening ? "Stop recording" : "Speak an expense"}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors disabled:opacity-40 ${
                isListening
                  ? "text-red-500 hover:text-red-600"
                  : "text-slate-400 hover:text-cyan-500"
              }`}
            >
              {isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              {/* Pulsing ring when listening */}
              {isListening && (
                <span className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-30" />
              )}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => handleFill()}
          disabled={loading || isListening}
          className="px-4 py-2 text-sm font-medium bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white rounded-xl transition-all disabled:opacity-60 flex items-center gap-1.5 whitespace-nowrap"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Parsing…
            </>
          ) : (
            "Fill form"
          )}
        </button>
      </div>

      {/* Listening indicator */}
      {isListening && (
        <p className="mt-2 text-xs text-red-500 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
          Recording — speak your expense, then tap the mic to stop
        </p>
      )}

      {/* Chips row */}
      {parsed && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {parsed.description && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium">
              {parsed.description}
            </span>
          )}
          {parsed.amount !== null && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 font-medium">
              {formatCurrency(parsed.amount, currency)}
            </span>
          )}
          {parsed.expenseDate && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {formatDate(parsed.expenseDate)}
            </span>
          )}
          {payer && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-medium">
              {getMemberName(payer)} paid
            </span>
          )}
          {showSplitChip && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium">
              {parsed.splitMemberIds && parsed.splitMemberIds.length > 0
                ? `÷ ${parsed.splitMemberIds
                    .map((id) => {
                      const m = members.find((m) => m.id === id);
                      return m ? getMemberName(m).split(" ")[0] : "?";
                    })
                    .join(", ")}`
                : parsed.splitCount === null
                ? "÷ all"
                : `÷ ${parsed.splitCount}`}
            </span>
          )}
          {cat && parsed.category !== "other" && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 font-medium">
              {cat.label}
            </span>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="ml-auto flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
