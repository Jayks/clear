"use client";

import { useState } from "react";
import { Plus, Trash2, RefreshCw, ChevronDown, ChevronUp, Pencil, Lock, Check, CalendarCheck, Loader2, X } from "lucide-react";
import { getCategory } from "@/lib/categories";
import { formatCurrency, getMemberName } from "@/lib/utils";
import { deleteTemplate, batchLogTemplates } from "@/app/actions/expenses";
import { LogTemplateButton } from "./log-template-button";
import { toast } from "sonner";
import { hapticLight } from "@/lib/haptics";
import { useSheetDismiss } from "@/hooks/use-sheet-dismiss";
import { useRouter } from "next/navigation";
import type { Expense } from "@/lib/db/schema/expenses";
import type { GroupMember } from "@/lib/db/schema/group-members";
import Link from "next/link";
import { UpgradePrompt } from "@/components/shared/upgrade-prompt";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface Template {
  template: Expense;
  splits: { memberId: string }[];
  loggedThisMonth: boolean;
  lastLoggedDate: string | null;
}

interface Props {
  templates: Template[];
  members: GroupMember[];
  groupId: string;
  currency: string;
  isAdmin: boolean;
  canUseTemplates?: boolean;
}

export function TemplateSection({ templates, members, groupId, currency, isAdmin, canUseTemplates = true }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [batchSheetOpen, setBatchSheetOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  // Track IDs logged via batch so cards update optimistically
  const [batchLoggedIds, setBatchLoggedIds] = useState<Set<string>>(new Set());

  const month = MONTHS[new Date().getMonth()];
  const dueTemplates = templates.filter(
    ({ template, loggedThisMonth }) => !loggedThisMonth && !batchLoggedIds.has(template.id)
  );
  const showBatchButton = dueTemplates.length >= 2;

  useSheetDismiss(batchSheetOpen, () => setBatchSheetOpen(false));

  const getMember = (id: string) => members.find((m) => m.id === id);

  async function handleDelete(templateId: string, description: string) {
    const result = await deleteTemplate(templateId);
    if (!result.ok) toast.error(result.error);
    else toast.success(`"${description}" template removed`);
  }

  async function handleBatchLog() {
    setBatchLoading(true);
    const result = await batchLogTemplates(groupId);
    setBatchLoading(false);
    setBatchSheetOpen(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    if (result.count === 0) {
      toast("All templates already logged this month");
      return;
    }

    hapticLight();
    // Optimistically mark all due templates as logged
    setBatchLoggedIds((prev) => {
      const next = new Set(prev);
      dueTemplates.forEach(({ template }) => next.add(template.id));
      return next;
    });
    toast.success(
      `${result.count} ${result.count === 1 ? "expense" : "expenses"} logged for ${result.month}`
    );
    router.refresh();
  }

  return (
    <div className="mb-2" data-tour="templates-section">
      {/* ── Section header ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 mb-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2.5 flex-1 min-w-0 group"
        >
          <div className="w-7 h-7 rounded-lg bg-teal-500/10 dark:bg-teal-500/20 flex items-center justify-center shrink-0">
            <RefreshCw className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex-1 text-left truncate">
            Recurring
          </span>
          {templates.length > 0 && (
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded-full tabular shrink-0">
              {templates.length}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
          )}
        </button>

        {/* Batch log button — only when ≥2 due */}
        {showBatchButton && expanded && (
          <button
            type="button"
            onClick={() => setBatchSheetOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/40 border border-teal-200 dark:border-teal-800/50 px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            Log all ({dueTemplates.length})
          </button>
        )}
      </div>

      {/* ── Template list ─────────────────────────────────────────────── */}
      {expanded && (
        <div className="space-y-2 mb-4">
          {templates.length === 0 ? (
            <div className="glass rounded-xl px-4 py-6 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-500">No recurring expenses yet.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Add one below to auto-log monthly bills.</p>
            </div>
          ) : (
            templates.map(({ template, splits, loggedThisMonth, lastLoggedDate }) => {
              const cat = getCategory(template.category);
              const CatIcon = cat.icon;
              const payer = getMember(template.paidByMemberId);
              const splitCount = splits.length;
              // Merge server-confirmed + optimistic batch state
              const isLogged = loggedThisMonth || batchLoggedIds.has(template.id);

              return (
                <div key={template.id} className="glass rounded-xl px-4 py-3.5">
                  {/* Row 1: icon + info + amount */}
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                      <CatIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                          {template.description}
                        </p>
                        {isLogged && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800/60 leading-none shrink-0">
                            <Check className="w-2.5 h-2.5" />
                            Done
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                        {template.recurrence === "weekly" ? "Weekly" : "Monthly"} · paid by {payer ? getMemberName(payer) : "?"} · {splitCount} {splitCount === 1 ? "person" : "people"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular shrink-0">
                      {formatCurrency(Number(template.amount), currency)}
                    </span>
                  </div>

                  {/* Row 2: actions */}
                  <div className="flex items-center gap-2 mt-2.5 ml-12">
                    <LogTemplateButton
                      templateId={template.id}
                      description={template.description}
                      loggedThisMonth={isLogged}
                      lastLoggedDate={lastLoggedDate}
                    />
                    {isAdmin && (
                      <div className="flex items-center gap-1 ml-auto shrink-0">
                        <Link
                          href={`/groups/${groupId}/expenses/templates/${template.id}/edit`}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                          title="Edit template"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(template.id, template.description)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Remove template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Add template action ───────────────────────────────────────── */}
      {canUseTemplates ? (
        <Link
          href={`/groups/${groupId}/expenses/templates/new`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add recurring expense
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => setUpgradeOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 dark:text-slate-500 transition-colors"
        >
          <Lock className="w-4 h-4" />
          Add recurring expense
          <span className="ml-0.5 inline-flex items-center bg-gradient-to-br from-cyan-500 to-teal-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
            Plus
          </span>
        </button>
      )}
      <UpgradePrompt open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />

      {/* ── Batch log confirmation sheet ─────────────────────────────── */}
      {batchSheetOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setBatchSheetOpen(false)}
          />
          {/* Sheet */}
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-slate-900 rounded-t-2xl shadow-xl pb-safe">
            <div className="px-4 pt-4 pb-6">
              {/* Handle + header */}
              <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto mb-4" />
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                    Log all due for {month}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {dueTemplates.length} recurring {dueTemplates.length === 1 ? "expense" : "expenses"} will be logged for the 1st
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBatchSheetOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Template list preview */}
              <div className="space-y-2 mb-5 max-h-64 overflow-y-auto">
                {dueTemplates.map(({ template }) => {
                  const cat = getCategory(template.category);
                  const CatIcon = cat.icon;
                  const payer = getMember(template.paidByMemberId);
                  return (
                    <div key={template.id} className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cat.gradient} flex items-center justify-center shrink-0`}>
                        <CatIcon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                          {template.description}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                          Paid by {payer ? getMemberName(payer) : "?"} · {month} 1
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular shrink-0">
                        {formatCurrency(Number(template.amount), currency)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Confirm button */}
              <button
                type="button"
                onClick={handleBatchLog}
                disabled={batchLoading}
                className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold text-sm py-3 rounded-xl transition-colors"
              >
                {batchLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Logging…
                  </>
                ) : (
                  <>
                    <CalendarCheck className="w-4 h-4" />
                    Log {dueTemplates.length} {dueTemplates.length === 1 ? "expense" : "expenses"} for {month}
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
